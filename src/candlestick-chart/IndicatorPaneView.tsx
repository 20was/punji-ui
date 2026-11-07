/**
 * IndicatorPaneView: the drawing of one indicator pane (a title with the latest value, ticks and levels, lines,
 * histogram bars and a shaded band), shared by every indicator that lives in its own pane. Each indicator descriptor
 * (`rsiIndicator`, `macdIndicator`, ...) carries it as `view`, so a CandlestickChart with no pane indicator does not
 * ship it. Write your own indicator with `view: IndicatorPaneView`.
 */
import { exactText, niceTicks, spreadLabels } from '../chart-math/chartMath.ts';
import { isNum } from '../internal/chartFrame.tsx';
import type { IndicatorResult, IndicatorViewProps } from './indicatorTypes.ts';

/**
 * @stability beta
 */
export function IndicatorPaneView({ id, label, result, tones, top, height, items, cx, body, x0, x1, axisX, active }: IndicatorViewProps) {
  const decimals = result.decimals ?? 2;
  const at = (l: IndicatorResult['lines'][number], k: number) => {
    const v = l.values[items[k]!.to];
    return isNum(v) ? v : null;
  };
  let lo = result.domain?.[0] ?? Infinity;
  let hi = result.domain?.[1] ?? -Infinity;
  if (!result.domain) {
    for (const l of result.lines) {
      for (let k = 0; k < items.length; k += 1) {
        const v = at(l, k);
        if (v !== null) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    }
    for (const lv of result.levels ?? []) {
      lo = Math.min(lo, lv.value);
      hi = Math.max(hi, lv.value);
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
  }
  const nice = result.domain ? { ticks: [lo, hi], lo, hi } : niceTicks(lo, hi, 3);
  const t = top + 14;
  const h = height - 14;
  const y = (v: number) => t + h - ((v - nice.lo) / (nice.hi - nice.lo || 1)) * h;
  const text = (v: number) => exactText(v, decimals, 0);
  const labelled = [...nice.ticks, ...(result.levels ?? []).map((l) => l.value)].filter((v, i, a) => a.indexOf(v) === i).toSorted((a, b) => a - b);
  const shown = spreadLabels(labelled.map(y), 11, t + 5, t + h - 5);
  const primary = result.lines.find((l) => l.style !== 'histogram') ?? result.lines[0];
  const lastK = items.length - 1;
  const readAt = active ?? lastK;
  const headValue = primary ? at(primary, readAt) : null;
  const zero = nice.lo < 0 && nice.hi > 0 ? y(0) : null;
  const bandUp = result.lines.find((l) => l.key === result.band?.upper);
  const bandDn = result.lines.find((l) => l.key === result.band?.lower);
  const bandKs = bandUp && bandDn ? items.map((_, k) => k).filter((k) => at(bandUp, k) !== null && at(bandDn, k) !== null) : [];
  return (
    <g className="pu-ct-pane" data-indicator={id}>
      <rect className="pu-ct-pane-bg" x={x0} y={t} width={Math.max(0, x1 - x0)} height={h} />
      {labelled.map((v, i) => (
        <g key={v}>
          <line className="kit-ct-grid" x1={x0} x2={x1} y1={y(v)} y2={y(v)} />
          <text className="kit-ct-axis" x={axisX} y={shown[i]!} dominantBaseline="middle">{text(v)}</text>
        </g>
      ))}
      {zero !== null && <line className="kit-ct-grid base" x1={x0} x2={x1} y1={zero} y2={zero} />}
      {bandKs.length > 1 && bandUp && bandDn && (
        <path className="pu-ct-band" d={`${bandKs.map((k, j) => `${j === 0 ? 'M' : 'L'}${cx(k).toFixed(1)},${y(at(bandUp, k)!).toFixed(1)}`).join(' ')} ${bandKs.toReversed().map((k) => `L${cx(k).toFixed(1)},${y(at(bandDn, k)!).toFixed(1)}`).join(' ')} Z`} />
      )}
      {result.lines.map((l, j) => {
        if (l.style === 'histogram') {
          const z = y(Math.max(nice.lo, Math.min(nice.hi, 0)));
          return (
            <g key={l.key} className="pu-ct-hist">
              {items.map((_, k) => {
                const v = at(l, k);
                if (v === null) return null;
                const yv = y(v);
                return <rect key={k} className={v >= 0 ? 'pos' : 'neg'} x={cx(k) - body / 2} width={Math.max(1, body)} y={Math.min(yv, z)} height={Math.max(1, Math.abs(yv - z))} />;
              })}
            </g>
          );
        }
        const d = items.map((_, k) => at(l, k)).map((v, k, a) => (v === null ? '' : `${k === 0 || a[k - 1] === null ? 'M' : 'L'}${cx(k).toFixed(1)},${y(v).toFixed(1)}`)).join(' ');
        return <path key={l.key} className="kit-ct-ma" stroke={tones[j]} strokeDasharray={l.dash} d={d} />;
      })}
      <text className="pu-ct-pane-title" x={x0 + 4} y={top + 8} dominantBaseline="middle">{`${label}${headValue === null ? '' : `  ${text(headValue)}`}`}</text>
    </g>
  );
}

