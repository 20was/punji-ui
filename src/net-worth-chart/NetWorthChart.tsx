'use client';

/**
 * NetWorthChart (design.punji.app/components/net-worth-chart): assets stacked above the zero line, liabilities stacked
 * below it (hatched), and the net worth as a line. Amounts are exact `Money` (bigint minor units) in one currency; the net
 * is `assets - liabilities` in bigint and is printed from the bigint. Assets and liabilities use the series tokens (not the
 * gain and loss colours: owing money is not a "loss"); they differ by side of the line, by hatching and by name.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape, live region, spoken summary, hidden table).
 */
import type { ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import type { Money } from '../money/money.ts';
import { abs, BandPlot, big, directionOf, EmptyFigure, MoneyLegend, num, sharedCurrency, useMoneyText } from '../money-chart/shared.tsx';

export interface NetWorthPoint {
  /** Stable key for the point. */
  key: string;
  /** On the axis and in the table ("Jan 2026", "2082"). */
  label: string;
  /** Everything owned: a positive amount. */
  assets: Money;
  /** Everything owed: a positive amount (drawn below the line). */
  liabilities: Money;
}

export interface NetWorthChartLabels {
  empty?: ReactNode;
  /** Table head for the date column. Default "Date". */
  date?: string;
  assets?: string;
  liabilities?: string;
  netWorth?: string;
  /** Words for the sign of net worth: positive, negative, zero. */
  positive?: string;
  negative?: string;
  zero?: string;
  hint?: string;
  summary?: (info: { count: number; from: string; to: string; change: string; word: string; first: string; last: string }) => string;
}

export interface NetWorthChartProps {
  /** Oldest first, left to right. */
  points: readonly NetWorthPoint[];
  /** Names the chart and its data table. */
  label: string;
  /** BCP 47 tag for the money format. Default "en-IN". */
  locale?: string;
  /** The plot's height in CSS px, clamped to 120..520. Default 260. */
  height?: number;
  /** Print the legend. Default true. */
  legend?: boolean;
  /** Pass false when a parent hides the chart and gives the same figures as a table. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: NetWorthChartLabels;
  /** Becomes data-testid on the figure; each item gets `${testId}-${key}`. */
  testId?: string;
}

export interface NetWorthRow {
  point: NetWorthPoint;
  assets: bigint;
  liabilities: bigint;
  net: bigint;
}

/** Each point's assets, liabilities and net worth, exact. Liabilities are taken as a size. */
export function netWorthRows(points: readonly NetWorthPoint[]): NetWorthRow[] {
  return points.map((point) => {
    const assets = abs(big(point.assets));
    const liabilities = abs(big(point.liabilities));
    return { point, assets, liabilities, net: assets - liabilities };
  });
}

/**
 * @stability beta
 */
export function NetWorthChart(props: NetWorthChartProps) {
  if (props.points.length === 0) return <EmptyFigure label={props.label} testId={props.testId}>{props.labels?.empty ?? 'No data'}</EmptyFigure>;
  return <NetWorth {...props} />;
}

function NetWorth({ points, label, locale, height = 260, legend = true, interactive = true, labels, testId }: NetWorthChartProps) {
  const currency = sharedCurrency(points.flatMap((p) => [p.assets, p.liabilities]));
  const text = useMoneyText(currency, locale);
  const rows = netWorthRows(points);
  const n = rows.length;
  const L = { assets: labels?.assets ?? 'Assets', liabilities: labels?.liabilities ?? 'Liabilities', net: labels?.netWorth ?? 'Net worth' };
  const words = { up: labels?.positive ?? 'Positive', down: labels?.negative ?? 'Negative', even: labels?.zero ?? 'Zero' };
  const hi = Math.max(...rows.map((r) => num(r.assets > r.net ? r.assets : r.net)));
  const lo = Math.min(...rows.map((r) => num(-r.liabilities < r.net ? -r.liabilities : r.net)));
  const first = rows[0]!;
  const last = rows[n - 1]!;
  const change = last.net - first.net;
  const summary = (labels?.summary ?? ((i) => `${L.net} over ${i.count} points, from ${i.first} to ${i.last}. ${i.word} change ${i.change}.`))({
    count: n,
    from: first.point.label,
    to: last.point.label,
    first: text.spoken(first.net),
    last: text.spoken(last.net),
    change: text.spoken(abs(change)),
    word: change > 0n ? 'Rising' : change < 0n ? 'Falling' : 'Flat',
  });
  const netText = (r: NetWorthRow) => `${directionOf(r.net, words).glyph} ${text.signed(r.net)}`;
  return (
    <ChartA11yShell
      className="kit-ct pu-mc"
      label={label}
      roleDescription="net worth chart"
      count={n}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between dates, Home and End to jump to the first and last.'}
      summary={summary}
      speak={(i) => {
        const r = rows[i]!;
        return `${r.point.label}: ${L.assets} ${text.spoken(r.assets)}, ${L.liabilities} ${text.spoken(r.liabilities)}, ${L.net} ${r.net < 0n ? 'minus ' : ''}${text.spoken(abs(r.net))}`;
      }}
      footer={legend ? <MoneyLegend items={[{ key: 'a', label: L.assets, swatch: 'assets' }, { key: 'l', label: L.liabilities, swatch: 'liabilities' }, { key: 'n', label: L.net, swatch: 'net' }]} /> : undefined}
      table={
        <ChartDataTable
          caption={label}
          head={[labels?.date ?? 'Date', L.assets, L.liabilities, L.net]}
          rows={rows.map((r) => ({ key: r.point.key, head: r.point.label, cells: [text.plain(r.assets), text.plain(r.liabilities), text.signed(r.net)] }))}
        />
      }
    >
      {(ctx) => (
        <BandPlot
          ctx={ctx}
          n={n}
          height={height}
          extent={{ lo, hi }}
          tickText={(v) => (v === 0 ? '0' : text.compact(BigInt(Math.round(v))))}
          labelAt={(i) => rows[i]!.point.label}
          testId={testId}
          renderTip={(i) => {
            const r = rows[i]!;
            return (
              <>
                <b>{r.point.label}</b>
                <dl>
                  <div><dt>{L.assets}</dt><dd>{text.plain(r.assets)}</dd></div>
                  <div><dt>{L.liabilities}</dt><dd>{text.plain(r.liabilities)}</dd></div>
                  <div><dt>{L.net}</dt><dd>{netText(r)}</dd></div>
                </dl>
              </>
            );
          }}
          renderPlot={({ cx, y, zero, uid }) => {
            const pts = (f: (r: NetWorthRow) => number) => rows.map((r, i) => `${cx(i).toFixed(1)},${y(f(r)).toFixed(1)}`);
            const area = (f: (r: NetWorthRow) => number) => (n === 1 ? '' : `M${cx(0).toFixed(1)},${zero.toFixed(1)} L${pts(f).join(' L')} L${cx(n - 1).toFixed(1)},${zero.toFixed(1)} Z`);
            const band = (f: (r: NetWorthRow) => number, cls: string, hatch: boolean) =>
              n === 1 ? (
                <g>
                  <rect className={cls} x={cx(0) - 12} y={Math.min(zero, y(f(rows[0]!)))} width={24} height={Math.max(2, Math.abs(zero - y(f(rows[0]!))))} />
                  {hatch && <rect className="pu-mc-bar-hatch" x={cx(0) - 12} y={Math.min(zero, y(f(rows[0]!)))} width={24} height={Math.max(2, Math.abs(zero - y(f(rows[0]!))))} fill={`url(#${uid}h)`} />}
                </g>
              ) : (
                <g>
                  <path className={cls} d={area(f)} />
                  {hatch && <path className="pu-mc-bar-hatch" d={area(f)} fill={`url(#${uid}h)`} />}
                </g>
              );
            return (
              <>
                <defs>
                  <pattern id={`${uid}h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" className="pu-mc-hatch" /></pattern>
                </defs>
                {band((r) => num(r.assets), 'pu-mc-area assets', false)}
                {band((r) => -num(r.liabilities), 'pu-mc-area liabilities', true)}
                {n > 1 && <path className="pu-mc-net" d={`M${pts((r) => num(r.net)).join(' L')}`} />}
                {rows.map((r, i) => (
                  <circle key={r.point.key} className="pu-mc-dot" cx={cx(i)} cy={y(num(r.net))} r={n > 24 ? 0 : 3.5} data-testid={testId ? `${testId}-${r.point.key}` : undefined} />
                ))}
              </>
            );
          }}
        />
      )}
    </ChartA11yShell>
  );
}
