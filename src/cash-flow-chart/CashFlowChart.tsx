'use client';

/**
 * CashFlowChart (design.punji.app/components/cash-flow-chart): money in as a bar above the zero line, money out as a bar
 * below it, and the net as a line with a marker on each period. Amounts are exact `Money` (bigint minor units) in one
 * currency; the net is `in - out` in bigint and is printed from the bigint.
 *
 * Never colour alone: in and out sit on opposite sides of the zero line (out is hatched), the net line has a marker
 * and, in the tooltip, the live region and the data table, a signed amount with the word Surplus or Deficit and a triangle.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape, live region, spoken summary, hidden table).
 */
import type { ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import type { Money } from '../money/money.ts';
import { abs, BandPlot, big, directionOf, EmptyFigure, MoneyLegend, num, sharedCurrency, useMoneyText } from '../money-chart/shared.tsx';

export interface CashFlowPeriod {
  /** Stable key for the period. */
  key: string;
  /** Under the bars ("Kartik", "Q2"). */
  label: string;
  /** Money in: a positive amount. */
  inflow: Money;
  /** Money out: a positive amount (its size; the chart draws it below the line). */
  outflow: Money;
}

export interface CashFlowChartLabels {
  empty?: ReactNode;
  /** Table head for the period column. Default "Period". */
  period?: string;
  moneyIn?: string;
  moneyOut?: string;
  net?: string;
  /** The word for a positive net. Default "Surplus". */
  surplus?: string;
  /** The word for a negative net. Default "Deficit". */
  deficit?: string;
  /** The word for a zero net. Default "Break-even". */
  breakEven?: string;
  hint?: string;
  summary?: (info: { count: number; moneyIn: string; moneyOut: string; net: string; word: string }) => string;
}

export interface CashFlowChartProps {
  /** Oldest first, left to right. */
  periods: readonly CashFlowPeriod[];
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
  labels?: CashFlowChartLabels;
  /** Becomes data-testid on the figure; each item gets `${testId}-${key}`. */
  testId?: string;
}

export interface CashFlowRow {
  period: CashFlowPeriod;
  moneyIn: bigint;
  moneyOut: bigint;
  net: bigint;
}

/** Each period's in, out and net, exact. Out is taken as a size (the sign is dropped). */
export function cashFlowRows(periods: readonly CashFlowPeriod[]): CashFlowRow[] {
  return periods.map((period) => {
    const moneyIn = abs(big(period.inflow));
    const moneyOut = abs(big(period.outflow));
    return { period, moneyIn, moneyOut, net: moneyIn - moneyOut };
  });
}

/**
 * @stability beta
 */
export function CashFlowChart(props: CashFlowChartProps) {
  if (props.periods.length === 0) return <EmptyFigure label={props.label} testId={props.testId}>{props.labels?.empty ?? 'No data'}</EmptyFigure>;
  return <CashFlow {...props} />;
}

function CashFlow({ periods, label, locale, height = 260, legend = true, interactive = true, labels, testId }: CashFlowChartProps) {
  const currency = sharedCurrency(periods.flatMap((p) => [p.inflow, p.outflow]));
  const text = useMoneyText(currency, locale);
  const rows = cashFlowRows(periods);
  const n = rows.length;
  const L = { in: labels?.moneyIn ?? 'Money in', out: labels?.moneyOut ?? 'Money out', net: labels?.net ?? 'Net' };
  const words = { up: labels?.surplus ?? 'Surplus', down: labels?.deficit ?? 'Deficit', even: labels?.breakEven ?? 'Break-even' };
  const hi = Math.max(...rows.map((r) => num(r.moneyIn > r.net ? r.moneyIn : r.net)));
  const lo = Math.min(...rows.map((r) => num(-r.moneyOut < r.net ? -r.moneyOut : r.net)));
  const totalIn = rows.reduce((a, r) => a + r.moneyIn, 0n);
  const totalOut = rows.reduce((a, r) => a + r.moneyOut, 0n);
  const total = totalIn - totalOut;
  const summary = (labels?.summary ?? ((i) => `Cash flow over ${i.count} periods. ${L.in} ${i.moneyIn}, ${L.out} ${i.moneyOut}, ${L.net} ${i.net}, a ${i.word.toLowerCase()}.`))({
    count: n,
    moneyIn: text.spoken(totalIn),
    moneyOut: text.spoken(totalOut),
    net: text.spoken(abs(total)),
    word: directionOf(total, words).word,
  });
  const netText = (r: CashFlowRow) => `${directionOf(r.net, words).glyph} ${text.signed(r.net)} ${directionOf(r.net, words).word}`;
  return (
    <ChartA11yShell
      className="kit-ct pu-mc"
      label={label}
      roleDescription="cash flow chart"
      count={n}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between periods, Home and End to jump to the first and last.'}
      summary={summary}
      speak={(i) => {
        const r = rows[i]!;
        return `${r.period.label}: ${L.in} ${text.spoken(r.moneyIn)}, ${L.out} ${text.spoken(r.moneyOut)}, ${L.net} ${text.spoken(abs(r.net))}, ${directionOf(r.net, words).word}`;
      }}
      footer={legend ? <MoneyLegend items={[{ key: 'i', label: L.in, swatch: 'gain', glyph: '▲' }, { key: 'o', label: L.out, swatch: 'loss', glyph: '▼' }, { key: 'n', label: L.net, swatch: 'net' }]} /> : undefined}
      table={
        <ChartDataTable
          caption={label}
          head={[labels?.period ?? 'Period', L.in, L.out, L.net, `${L.net} (${words.up}/${words.down})`]}
          rows={rows.map((r) => ({ key: r.period.key, head: r.period.label, cells: [text.plain(r.moneyIn), text.plain(r.moneyOut), text.signed(r.net), directionOf(r.net, words).word] }))}
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
          testId={testId}
          renderTip={(i) => {
            const r = rows[i]!;
            return (
              <>
                <b>{r.period.label}</b>
                <dl>
                  <div><dt>{L.in}</dt><dd>{text.plain(r.moneyIn)}</dd></div>
                  <div><dt>{L.out}</dt><dd>{text.plain(r.moneyOut)}</dd></div>
                  <div><dt>{L.net}</dt><dd>{netText(r)}</dd></div>
                </dl>
              </>
            );
          }}
          renderPlot={({ cx, bw, y, zero, uid }) => {
            const w = Math.min(56, Math.max(3, bw * 0.5));
            const path = rows.map((r, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${y(num(r.net)).toFixed(1)}`).join(' ');
            return (
              <>
                <defs>
                  <pattern id={`${uid}h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" className="pu-mc-hatch" /></pattern>
                </defs>
                {rows.map((r, i) => {
                  const up = Math.max(r.moneyIn > 0n ? 2 : 0, zero - y(num(r.moneyIn)));
                  const dn = Math.max(r.moneyOut > 0n ? 2 : 0, y(-num(r.moneyOut)) - zero);
                  return (
                    <g key={r.period.key} data-testid={testId ? `${testId}-${r.period.key}` : undefined}>
                      {up > 0 && <rect className="pu-mc-bar increase" x={cx(i) - w / 2} y={zero - up} width={w} height={up} rx={2} />}
                      {dn > 0 && (
                        <>
                          <rect className="pu-mc-bar decrease" x={cx(i) - w / 2} y={zero} width={w} height={dn} rx={2} />
                          <rect className="pu-mc-bar-hatch" x={cx(i) - w / 2} y={zero} width={w} height={dn} rx={2} fill={`url(#${uid}h)`} />
                        </>
                      )}
                    </g>
                  );
                })}
                {n > 1 && <path className="pu-mc-net" d={path} />}
                {rows.map((r, i) => (
                  <circle key={r.period.key} className="pu-mc-dot" cx={cx(i)} cy={y(num(r.net))} r={3.5} />
                ))}
              </>
            );
          }}
        />
      )}
    </ChartA11yShell>
  );
}
