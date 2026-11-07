/**
 * The trading engine of CandlestickChart: everything beyond the plain chart that needs to know how the chart is laid
 * out. It computes the scale, the compared lines, the indicators and their panes, places the layers (events, levels),
 * and hands the chart back its words (readout rows, live region, summary, hint), table columns and tables, notes and
 * drawing. Not imported by the chart: each opt-in module (`rsiIndicator`, `priceScales`, `heikinAshiTransform`,
 * `eventsLayer`, ...) carries it as `engine`, so a chart that uses none of them does not ship it.
 */
import { Fragment } from 'react';

import { exactText } from '../chart-math/chartMath.ts';
import { isNum } from '../internal/chartFrame.tsx';
import type { LayerModel, TradingArgs, TradingEngine, TradingModel, TradingPlaced } from './extensionTypes.ts';
import type { IndicatorInput, IndicatorResult } from './indicatorTypes.ts';
import { SERIES_TONES } from './seriesTones.ts';

const PANE_H = 76;
const PANE_GAP = 14;

/** The value of each line of an indicator at one session. */
function lineAt(result: IndicatorResult, i: number): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const l of result.lines) {
    const v = l.values[i];
    out[l.key] = isNum(v) ? v : null;
  }
  return out;
}

const decimals = (r: IndicatorResult) => r.decimals ?? 2;

const pathOf = (vals: readonly (number | null)[], cx: (k: number) => number, y: (v: number) => number) => vals.map((v, k) => (v === null ? '' : `${k === 0 || vals[k - 1] === null ? 'M' : 'L'}${cx(k).toFixed(1)},${y(v).toFixed(1)}`)).join(' ');

function model(a: TradingArgs): TradingModel {
  const { valid, items, drawn, labels, formatPrice, none, scales, transform: tf, compare, indicators, scaleProp, label } = a;
  const base = valid[0]!.c.close;
  const resolved = scales ? scales.resolve({ scale: scaleProp, base, allPositive: valid.every((x) => x.c.low > 0), compared: compare.length > 0, labels }) : { scale: 'linear' as const, notes: [] as readonly string[] };
  const scale = resolved.scale;
  const T = scales ? scales.transform(scale, base) : (v: number) => v;
  const scaled = scale === 'percent' || scale === 'indexed';
  const st = (v: number) => (scales ? scales.text(scale, v) : '');
  const scaleName = scales ? scales.name(scale, labels) : 'linear';
  const sessions = valid.map((x) => ({ date: x.c.date, close: x.c.close }));
  const compared = scales && scaled && compare.length > 0 ? scales.compare(compare, sessions, items.map((it) => it.to), scale) : [];
  const fmt = tf ? tf.format(valid.map((x) => x.c)) : formatPrice;

  // Indicators over every valid session (never the grouped ones, never Heikin Ashi).
  const inputs: IndicatorInput[] = valid.map((x) => ({ date: x.c.date, open: x.c.open, high: x.c.high, low: x.c.low, close: x.c.close, volume: isNum(x.c.volume) ? x.c.volume : null }));
  let toneAt = a.toneOffset;
  const nextTone = () => SERIES_TONES[toneAt++ % SERIES_TONES.length]!;
  const compareTones = compared.map(() => nextTone());
  const placed = indicators.map((ind) => {
    const result = ind.compute(inputs);
    return { ind, result, tones: result.lines.map(() => nextTone()) };
  });
  const overlays = placed.filter((p) => p.ind.placement === 'price');
  const panes = placed.filter((p) => p.ind.placement === 'pane');
  const overlayAt = overlays.map((o) => o.result.lines.map((l) => items.map((it) => {
    const v = l.values[it.to];
    return isNum(v) ? T(v) : null;
  })));

  const points: number[] = [];
  for (const ls of overlayAt) for (const vs of ls) for (const v of vs) if (v !== null && Number.isFinite(v)) points.push(v);
  for (const c of compared) for (const v of c.values) if (v !== null && Number.isFinite(v)) points.push(v);

  const indicatorWords = (k: number): string[] => {
    const out: string[] = [];
    for (const p of placed) {
      const at = lineAt(p.result, items[k]!.to);
      const vals = p.result.lines.filter((l) => at[l.key] !== null && at[l.key] !== undefined).map((l) => `${l.label} ${exactText(at[l.key]!, decimals(p.result), decimals(p.result))}`);
      if (vals.length === 0) continue;
      const w = p.ind.describe?.(at, inputs[items[k]!.to]!) ?? '';
      out.push(`${p.ind.label}: ${vals.join(', ')}${w ? `, ${w}` : ''}`);
    }
    return out;
  };

  // Table columns beyond the six every table has.
  const columns: { head: string; get: (v: number) => string }[] = [];
  if (tf) {
    for (const [k, name] of [['open', 'Open'], ['high', 'High'], ['low', 'Low'], ['close', 'Close']] as const) columns.push({ head: `${tf.label} ${(labels?.[k] ?? name).toLowerCase()}`, get: (v) => fmt(drawn[v]![k]) });
  }
  if (scaled) columns.push({ head: `${labels?.close ?? 'Close'}: ${scaleName}`, get: (v) => st(T(valid[v]!.c.close)) });
  for (const s of compared) columns.push({ head: `${s.label}: ${scaleName}`, get: (v) => { const x = s.all[v]; return x === null || x === undefined ? none : st(x); } });
  for (const p of placed) {
    for (const l of p.result.lines) {
      const d = decimals(p.result);
      columns.push({ head: p.result.lines.length === 1 ? p.ind.label : `${p.ind.label}: ${l.label}`, get: (v) => { const x = l.values[v]; return isNum(x) ? exactText(x, d, d) : none; } });
    }
  }

  return {
    scale,
    T,
    fmt,
    priceText: (close) => (scaled ? st(T(close)) : fmt(close)),
    scaleName,
    points,
    ticks: (lo, hi, count) => (scales ? scales.ticks(scale, lo, hi, count, formatPrice) : null),
    legend: (ma, mainLabel) => [
      ...(compared.length > 0 ? [{ label: mainLabel, tone: 'var(--pu-color-text)', dash: '' }] : []),
      ...ma,
      ...compared.map((c, k) => ({ label: c.label, tone: compareTones[k]!, dash: c.dash })),
      ...overlays.map((o) => ({ label: o.ind.label, tone: o.tones[0] ?? SERIES_TONES[0]!, dash: '' })),
    ],
    columns,
    place: (b): TradingPlaced => {
      const { cx, top, plotH, x0, x1, body } = b;
      // Panes stacked under the price and volume, then each layer's own room, then the date axis.
      let cursorY = b.volBottom;
      const paneAt = panes.map((p) => {
        const t = cursorY + PANE_GAP;
        cursorY = t + PANE_H;
        return { ...p, top: t };
      });
      const paneBottom = cursorY;
      const yOfPrice = (p: number) => {
        const t = T(p);
        return Number.isFinite(t) && t >= b.loT && t <= b.hiT ? b.yOf(t) : null;
      };
      let layerTop = paneBottom;
      const models: LayerModel[] = b.layers.map((layer) => {
        const m = layer.build({ label, sessions, items, formatPrice, formatDate: b.formatDate, none, labels, yOf: yOfPrice, x0, x1, priceTop: top, priceBottom: top + plotH, cx, top: layerTop });
        layerTop += m.height ?? 0;
        return m;
      });

      const bands = overlays.map((o, n) => {
        if (!o.result.band) return null;
        const u = o.result.lines.findIndex((l) => l.key === o.result.band!.upper);
        const d = o.result.lines.findIndex((l) => l.key === o.result.band!.lower);
        if (u < 0 || d < 0) return null;
        const up = overlayAt[n]![u]!;
        const dn = overlayAt[n]![d]!;
        const ks = up.map((_, k) => k).filter((k) => up[k] !== null && dn[k] !== null);
        if (ks.length < 2) return null;
        const path = `${ks.map((k, j) => `${j === 0 ? 'M' : 'L'}${cx(k).toFixed(1)},${b.yOf(up[k]!).toFixed(1)}`).join(' ')} ${ks.toReversed().map((k) => `L${cx(k).toFixed(1)},${b.yOf(dn[k]!).toFixed(1)}`).join(' ')} Z`;
        return <path key={`band-${o.ind.id}`} className="pu-ct-band" d={path} />;
      });

      return {
        paneBottom,
        bottom: layerTop,
        below: <>{bands}</>,
        lines: (
          <>
            {compared.map((c, k) => <path key={c.label} className="kit-ct-ma" stroke={compareTones[k]} strokeDasharray={c.dash || undefined} d={pathOf(c.values, cx, b.yOf)} />)}
            {overlays.map((o, n) => o.result.lines.map((l, j) => <path key={`${o.ind.id}-${l.key}`} className="kit-ct-ma" stroke={o.tones[j]} strokeDasharray={l.dash} d={pathOf(overlayAt[n]![j]!, cx, b.yOf)} />))}
          </>
        ),
        over: (active) => (
          <>
            {models.map((m, i) => <Fragment key={i}>{m.view?.(active)}</Fragment>)}
            {paneAt.map((p) => {
              const View = p.ind.view;
              return View ? <View key={p.ind.id} id={p.ind.id} label={p.ind.label} result={p.result} tones={p.tones} top={p.top} height={PANE_H} items={items} cx={cx} body={body} x0={x0} x1={x1} axisX={x1 + 8} active={active} /> : null;
            })}
          </>
        ),
        speak: (k) => {
          const parts: string[] = [];
          if (tf) parts.push(`${labels?.actualClose ?? 'Actual close'} ${formatPrice(items[k]!.realClose)}`);
          if (scaled) parts.push(`${scaleName} ${st(T(items[k]!.realClose))}`);
          for (const s of compared) {
            const v = s.values[k];
            parts.push(`${s.label} ${v === null || v === undefined ? none : st(v)}`);
          }
          parts.push(...indicatorWords(k));
          for (const m of models) parts.push(...(m.speak?.(k) ?? []));
          return parts;
        },
        rows: (k) => {
          const rows: (readonly [string, string])[] = [];
          if (tf) rows.push([labels?.actualClose ?? 'Actual close', formatPrice(items[k]!.realClose)]);
          if (scaled) rows.push([scale === 'percent' ? '%' : '100', st(T(items[k]!.realClose))]);
          for (const s of compared) {
            const v = s.values[k];
            rows.push([s.label, v === null || v === undefined ? none : st(v)]);
          }
          for (const p of placed) {
            const at = lineAt(p.result, items[k]!.to);
            for (const l of p.result.lines) if (at[l.key] !== null && at[l.key] !== undefined) rows.push([p.result.lines.length === 1 ? p.ind.label : `${p.ind.label}: ${l.label}`, exactText(at[l.key]!, decimals(p.result), decimals(p.result))]);
          }
          for (const m of models) rows.push(...(m.rows?.(k) ?? []));
          return rows;
        },
        summary: [
          ...placed.map((p) => {
            const at = lineAt(p.result, valid.length - 1);
            const vals = p.result.lines.filter((l) => at[l.key] !== null && at[l.key] !== undefined).map((l) => `${l.label} ${exactText(at[l.key]!, decimals(p.result), decimals(p.result))}`);
            const w = vals.length ? (p.ind.describe?.(at, inputs[valid.length - 1]!) ?? '') : '';
            return `${p.ind.label}${p.ind.placement === 'pane' ? ' pane' : ''}: ${vals.length ? `latest ${vals.join(', ')}${w ? `, ${w}` : ''}` : 'no values yet'}.`;
          }),
          compared.length > 0 ? `Compared with ${compared.map((s) => s.label).join(', ')}.` : '',
          ...models.map((m) => m.summary ?? ''),
        ].filter(Boolean),
        hint: models.map((m) => m.hint ?? '').filter(Boolean),
        onKey: (e, index, count, moveTo) => {
          const jump = [...new Set(models.flatMap((m) => m.jump ?? []))].toSorted((p, q) => p - q);
          if (!e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') || jump.length === 0) return false;
          const at = index ?? (e.key === 'ArrowRight' ? -1 : count);
          const next = e.key === 'ArrowRight' ? jump.find((i) => i > at) : jump.findLast((i) => i < at);
          e.preventDefault();
          if (next !== undefined) moveTo(next);
          return true;
        },
        notes: (
          <>
            {resolved.notes.map((n) => <p key={n} className="kit-ct-note" role="note">{n}</p>)}
            {models.map((m, i) => <Fragment key={i}>{m.notes}</Fragment>)}
          </>
        ),
        table: <>{models.map((m, i) => <Fragment key={i}>{m.table}</Fragment>)}</>,
      };
    },
  };
}

/**
 * The engine itself, carried by every opt-in module.
 * @stability beta
 */
export const candlestickTrading: TradingEngine = { model };
