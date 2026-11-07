'use client';

/**
 * BalanceHistoryChart (design.punji.app/components/balance-history-chart): debt against equity over periods, with cash as
 * an optional line, and the debt-to-equity ratio as a labelled line along the top. Amounts are exact `Money` (bigint
 * minor units) in one currency; the ratio is `debt / equity` taken as a bigint ratio and rounded once, to two places,
 * when printed. Plot positions are the only numbers.
 *
 * Never colour alone: equity is a solid bar and debt a hatched one, side by side; cash is a line with square markers;
 * every ratio is printed ("0.62"), and equity at or below zero says "n/a, equity is negative" instead of a ratio.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape through the periods, live region, spoken
 * summary, hidden table).
 */
import type { ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { clamp, isNum } from '../internal/chartFrame.tsx';
import { ratioNumber, ratioText } from '../internal/exactMath.ts';
import type { Money } from '../money/money.ts';
import { abs, BandPlot, big, EmptyFigure, num, sharedCurrency, useMoneyText } from '../money-chart/shared.tsx';

export interface BalancePeriod {
  /** Stable key for the period. */
  key: string;
  /** Under the bars ("FY24"). */
  label: string;
  /** Total debt: a positive amount. */
  debt: Money;
  /** Shareholders' equity. May be negative. */
  equity: Money;
  /** Cash and equivalents. Give it for every period or none. */
  cash?: Money;
}

export interface BalanceHistoryChartLabels {
  empty?: ReactNode;
  period?: string;
  debt?: string;
  equity?: string;
  cash?: string;
  /** The ratio's name. Default "Debt to equity". */
  ratio?: string;
  /** Said and printed instead of a ratio when equity is zero or negative. */
  notMeaningful?: string;
  hint?: string;
  summary?: (info: { count: number; ratio: string; first: string; last: string; word: string; latest: string }) => string;
}

export interface BalanceHistoryChartProps {
  /** Oldest first, left to right. */
  periods: readonly BalancePeriod[];
  /** Names the chart and its data table. */
  label: string;
  /** BCP 47 tag for the money format. Default "en-IN". */
  locale?: string;
  /** The plot's height in CSS px, clamped to 120..520. Default 280. */
  height?: number;
  /** Print the legend. Default true. */
  legend?: boolean;
  /** Pass false when a parent hides the chart and gives the same figures as a table. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: BalanceHistoryChartLabels;
  /** Becomes data-testid on the figure; each period gets `${testId}-${key}`. */
  testId?: string;
}

export interface BalanceRow {
  period: BalancePeriod;
  debt: bigint;
  equity: bigint;
  cash: bigint | null;
  /** Debt over equity to two places ("0.62"); null when equity is zero or negative. */
  ratio: string | null;
}

/** Each period's debt, equity, cash and debt-to-equity ratio, exact. Debt is taken as a size. */
export function balanceRows(periods: readonly BalancePeriod[]): BalanceRow[] {
  return periods.map((period) => {
    const debt = abs(big(period.debt));
    const equity = big(period.equity);
    return { period, debt, equity, cash: period.cash ? big(period.cash) : null, ratio: equity > 0n ? ratioText(debt, equity, 2) : null };
  });
}

/**
 * @stability beta
 */
export function BalanceHistoryChart(props: BalanceHistoryChartProps) {
  if (props.periods.length === 0) return <EmptyFigure label={props.label} testId={props.testId}>{props.labels?.empty ?? 'No data'}</EmptyFigure>;
  return <BalanceHistory {...props} />;
}

const TOP = 12;
const STRIP = 40;

/** The ratio line's height inside the top strip: the lowest ratio near the strip's floor, the highest near its ceiling. */
const ratioY = (v: number, lo: number, hi: number) => TOP + STRIP - 12 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (STRIP - 22);

function BalanceHistory({ periods, label, locale, height = 280, legend = true, interactive = true, labels, testId }: BalanceHistoryChartProps) {
  const currency = sharedCurrency(periods.flatMap((p) => [p.debt, p.equity, ...(p.cash ? [p.cash] : [])]));
  const text = useMoneyText(currency, locale);
  const rows = balanceRows(periods);
  const n = rows.length;
  const hasCash = rows.some((r) => r.cash !== null);
  const L = { debt: labels?.debt ?? 'Debt', equity: labels?.equity ?? 'Equity', cash: labels?.cash ?? 'Cash', ratio: labels?.ratio ?? 'Debt to equity' };
  const nm = labels?.notMeaningful ?? 'n/a, equity is not positive';
  const plotH = clamp(isNum(height) ? height : 280, 120, 520);
  const top = Math.max(0, ...rows.flatMap((r) => [r.debt, r.equity, r.cash ?? 0n]).map(num));
  const lo = Math.min(0, ...rows.flatMap((r) => [r.equity, r.cash ?? 0n]).map(num));
  // Room above the tallest bar for the ratio line.
  const hi = top / Math.max(0.4, 1 - (STRIP + 8) / plotH);
  const ratios = rows.map((r) => (r.ratio === null ? null : ratioNumber(r.debt, r.equity)));
  const known = ratios.filter((v): v is number => v !== null);
  const rLo = Math.min(...known);
  const rHi = Math.max(...known);
  const defined = rows.filter((r) => r.ratio !== null);
  const first = defined[0];
  const last = defined.at(-1);
  const trend = first && last ? (Number(last.ratio) > Number(first.ratio) ? 'Rising' : Number(last.ratio) < Number(first.ratio) ? 'Falling' : 'Steady') : '';
  const latest = rows[n - 1]!;
  const latestLine = `Latest ${latest.period.label}: ${L.debt.toLowerCase()} ${text.spoken(latest.debt)}, ${L.equity.toLowerCase()} ${latest.equity < 0n ? 'minus ' : ''}${text.spoken(abs(latest.equity))}${latest.cash === null ? '' : `, ${L.cash.toLowerCase()} ${text.spoken(latest.cash)}`}`;
  const summary = (labels?.summary ?? ((i) => `${L.debt} against ${L.equity.toLowerCase()} over ${i.count} periods.${i.first ? ` ${i.ratio} went from ${i.first} to ${i.last}: ${i.word.toLowerCase()}.` : ` ${i.ratio} is ${nm}.`} ${i.latest}.`))({
    count: n,
    ratio: L.ratio,
    first: first?.ratio ?? '',
    last: last?.ratio ?? '',
    word: trend,
    latest: latestLine,
  });
  return (
    <ChartA11yShell
      className="kit-ct pu-bh"
      label={label}
      roleDescription="balance history chart"
      count={n}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between periods, Home and End to jump to the first and last.'}
      summary={summary}
      speak={(i) => {
        const r = rows[i]!;
        return `${r.period.label}: ${L.debt} ${text.spoken(r.debt)}, ${L.equity} ${r.equity < 0n ? 'minus ' : ''}${text.spoken(abs(r.equity))}${r.cash === null ? '' : `, ${L.cash} ${text.spoken(r.cash)}`}, ${L.ratio} ${r.ratio ?? nm}`;
      }}
      footer={
        legend ? (
          <ul className="kit-ct-legend pu-st-legend" aria-hidden="true">
            <li><i className="pu-st-sw equity" />{L.equity}</li>
            <li><i className="pu-st-sw debt" />{L.debt}</li>
            {hasCash && <li><i className="pu-st-sw cash" />{L.cash}</li>}
            <li><i className="pu-st-sw ratio" />{L.ratio}</li>
          </ul>
        ) : undefined
      }
      table={
        <ChartDataTable
          caption={label}
          head={[labels?.period ?? 'Period', L.debt, L.equity, ...(hasCash ? [L.cash] : []), L.ratio]}
          rows={rows.map((r) => ({
            key: r.period.key,
            head: r.period.label,
            cells: [text.plain(r.debt), text.signed(r.equity).replace(/^\+/, ''), ...(hasCash ? [r.cash === null ? '' : text.plain(r.cash)] : []), r.ratio ?? nm],
          }))}
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
          labelAt={(i) => rows[i]!.period.label}
          labelPx={56}
          testId={testId}
          renderTip={(i) => {
            const r = rows[i]!;
            return (
              <>
                <b>{r.period.label}</b>
                <dl>
                  <div><dt>{L.debt}</dt><dd>{text.plain(r.debt)}</dd></div>
                  <div><dt>{L.equity}</dt><dd>{text.signed(r.equity).replace(/^\+/, '')}</dd></div>
                  {r.cash !== null && <div><dt>{L.cash}</dt><dd>{text.plain(r.cash)}</dd></div>}
                  <div><dt>{L.ratio}</dt><dd>{r.ratio ?? 'n/a'}</dd></div>
                </dl>
              </>
            );
          }}
          renderPlot={({ cx, bw, y, zero, uid }) => {
            const w = Math.min(28, Math.max(3, bw * 0.34));
            const every = Math.max(1, Math.ceil(34 / bw));
            const segs: string[] = [];
            let open = false;
            ratios.forEach((v, i) => {
              if (v === null) {
                open = false;
                return;
              }
              segs.push(`${open ? 'L' : 'M'}${cx(i).toFixed(1)},${ratioY(v, rLo, rHi).toFixed(1)}`);
              open = true;
            });
            const cashPts = rows.map((r, i) => (r.cash === null ? null : `${cx(i).toFixed(1)},${y(num(r.cash)).toFixed(1)}`));
            return (
              <>
                <defs>
                  <pattern id={`${uid}h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" className="pu-mc-hatch" /></pattern>
                </defs>
                {rows.map((r, i) => {
                  const eh = Math.max(r.equity === 0n ? 0 : 2, Math.abs(zero - y(num(r.equity))));
                  const dh = Math.max(r.debt === 0n ? 0 : 2, zero - y(num(r.debt)));
                  return (
                    <g key={r.period.key} data-testid={testId ? `${testId}-${r.period.key}` : undefined}>
                      {eh > 0 && <rect className="pu-bh-equity" x={cx(i) - w - 1} y={r.equity >= 0n ? zero - eh : zero} width={w} height={eh} rx={2} />}
                      {dh > 0 && (
                        <>
                          <rect className="pu-bh-debt" x={cx(i) + 1} y={zero - dh} width={w} height={dh} rx={2} />
                          <rect className="pu-mc-bar-hatch" x={cx(i) + 1} y={zero - dh} width={w} height={dh} rx={2} fill={`url(#${uid}h)`} />
                        </>
                      )}
                    </g>
                  );
                })}
                {hasCash && cashPts.filter(Boolean).length > 1 && <path className="pu-bh-cash" d={`M${cashPts.filter(Boolean).join(' L')}`} />}
                {hasCash && rows.map((r, i) => (r.cash === null ? null : <rect key={r.period.key} className="pu-bh-cash-dot" x={cx(i) - 3.5} y={y(num(r.cash)) - 3.5} width={7} height={7} />))}
                {segs.length > 0 && <path className="pu-bh-ratio" d={segs.join(' ')} />}
                {ratios.map((v, i) =>
                  v === null ? null : (
                    <g key={rows[i]!.period.key}>
                      <circle className="pu-mc-dot" cx={cx(i)} cy={ratioY(v, rLo, rHi)} r={3} />
                      {(n - 1 - i) % every === 0 && (
                        <text className="pu-bh-label" x={cx(i)} y={ratioY(v, rLo, rHi) - 7} textAnchor="middle">{rows[i]!.ratio}</text>
                      )}
                    </g>
                  ),
                )}
              </>
            );
          }}
        />
      )}
    </ChartA11yShell>
  );
}
