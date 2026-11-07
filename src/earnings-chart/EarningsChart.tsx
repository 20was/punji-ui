'use client';

/**
 * EarningsChart (design.punji.app/components/earnings-chart): per period, the analysts' estimate against the reported
 * actual (earnings per share, or revenue), with the beat or miss and the surprise in percent. An upcoming period shows
 * its estimate alone.
 *
 * Exact: amounts are decimal strings ("12.34", "-0.05") or `Money` (bigint minor units), held as scaled bigints. The
 * surprise is `actual - estimate`, and the surprise percent is that over the size of the estimate, a bigint ratio
 * rounded once, to one place, when printed. Plot positions are the only numbers.
 *
 * Never colour alone: the estimate is a hollow marker and the actual a filled one; a beat is a triangle up, a miss a
 * triangle down (hatched in the bar variant), and each is printed with its word and sign ("Beat +0.04, +3.3%").
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape through the periods, live region, spoken
 * summary, hidden table).
 */
import { useMemo, type ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { decimalText, parseDecimal, percentText, rescale } from '../internal/exactMath.ts';
import { currencyExponent, isMoney, type Money } from '../money/money.ts';
import { BandPlot, EmptyFigure, num, sharedCurrency, useMoneyText } from '../money-chart/shared.tsx';

/** A decimal string ("12.34") or an exact `Money`. Use one kind across the chart. */
export type EarningsAmount = string | Money;

export interface EarningsPeriod {
  /** Stable key for the period. */
  key: string;
  /** Under the markers ("Q2 FY26"). */
  label: string;
  /** The consensus estimate. */
  estimate?: EarningsAmount;
  /** The reported figure. Leave it out for an upcoming period. */
  actual?: EarningsAmount;
}

export interface EarningsChartLabels {
  empty?: ReactNode;
  period?: string;
  estimate?: string;
  actual?: string;
  surprise?: string;
  surprisePercent?: string;
  result?: string;
  beat?: string;
  miss?: string;
  inLine?: string;
  upcoming?: string;
  /** An actual with no estimate to compare. */
  reported?: string;
  hint?: string;
  summary?: (info: { measure: string; count: number; beats: number; misses: number; inLine: number; latest: string; next: string }) => string;
}

export interface EarningsChartProps {
  /** Oldest first, left to right. */
  periods: readonly EarningsPeriod[];
  /** Names the chart and its data table. */
  label: string;
  /** What is measured. Default "EPS". */
  measure?: string;
  /** `dots` (default): a hollow estimate and a filled actual joined by their gap. `bars`: a bar to the actual with the estimate as a tick. */
  variant?: 'dots' | 'bars';
  /** For decimal strings: the ISO currency to print ("NPR 12.34"). Ignored for `Money`, which carries its own. */
  currency?: string;
  /** BCP 47 tag for the number format. Default "en-IN". */
  locale?: string;
  /** The plot's height in CSS px, clamped to 120..520. Default 260. */
  height?: number;
  /** Print the legend. Default true. */
  legend?: boolean;
  /** Pass false when a parent hides the chart and gives the same figures as a table. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: EarningsChartLabels;
  /** Becomes data-testid on the figure; each period gets `${testId}-${key}`. */
  testId?: string;
}

const MINUS = '−';

export type EarningsOutcome = 'beat' | 'miss' | 'inline' | 'upcoming' | 'reported' | 'none';

export interface EarningsRow {
  period: EarningsPeriod;
  /** The estimate and the actual at the chart's common scale, or null. */
  estimate: bigint | null;
  actual: bigint | null;
  /** actual - estimate, or null when either is missing. */
  surprise: bigint | null;
  /** The surprise as a percent of the size of the estimate, one place ("3.3", "-12.5"); null when there is no estimate or it is zero. */
  surprisePercent: string | null;
  outcome: EarningsOutcome;
}

export interface EarningsRows {
  rows: EarningsRow[];
  /** Decimal places the units carry. */
  scale: number;
  /** The currency, for `Money` (or the `currency` prop for decimal strings). */
  currency: string | null;
  kind: 'money' | 'decimal';
}

function parseAmount(v: EarningsAmount | undefined) {
  if (v === undefined) return null;
  if (isMoney(v)) return { units: v.minor, scale: currencyExponent(v.currency) };
  const d = parseDecimal(v);
  if (!d) throw new RangeError(`EarningsChart: "${v}" is not a decimal string`);
  return d;
}

const signedPct = (p: string) => (p.startsWith('-') ? `${MINUS}${p.slice(1)}%` : `+${p}%`);
const tone = (r: EarningsRow) => (r.outcome === 'beat' ? 'gain' : r.outcome === 'miss' ? 'loss' : 'flat');
const isUpcoming = (r: EarningsRow) => r.outcome === 'upcoming';

/** Every period's estimate, actual, surprise and result, exact. Throws a TypeError for mixed kinds or currencies and a RangeError for a malformed decimal. */
export function earningsRows(periods: readonly EarningsPeriod[], currency?: string): EarningsRows {
  const given = periods.flatMap((p) => [p.estimate, p.actual]).filter((v): v is EarningsAmount => v !== undefined);
  const moneys = given.filter(isMoney);
  if (moneys.length > 0 && moneys.length !== given.length) throw new TypeError('EarningsChart: use Money or decimal strings, not both');
  const kind = moneys.length > 0 ? 'money' : 'decimal';
  const code = kind === 'money' ? sharedCurrency(moneys) : (currency?.toUpperCase() ?? null);
  const parsed = periods.map((p) => ({ e: parseAmount(p.estimate), a: parseAmount(p.actual) }));
  const scale = Math.max(kind === 'money' ? 0 : 2, ...parsed.flatMap((p) => [p.e?.scale ?? 0, p.a?.scale ?? 0]));
  const rows = periods.map((period, i): EarningsRow => {
    const { e, a } = parsed[i]!;
    const estimate = e ? rescale(e, scale) : null;
    const actual = a ? rescale(a, scale) : null;
    const surprise = estimate !== null && actual !== null ? actual - estimate : null;
    const outcome: EarningsOutcome = surprise === null ? (actual !== null ? 'reported' : estimate !== null ? 'upcoming' : 'none') : surprise > 0n ? 'beat' : surprise < 0n ? 'miss' : 'inline';
    const size = estimate === null ? 0n : estimate < 0n ? -estimate : estimate;
    return { period, estimate, actual, surprise, surprisePercent: surprise !== null && size > 0n ? percentText(surprise, size) : null, outcome };
  });
  return { rows, scale, currency: code, kind };
}

/**
 * @stability beta
 */
export function EarningsChart(props: EarningsChartProps) {
  if (props.periods.length === 0) return <EmptyFigure label={props.label} testId={props.testId}>{props.labels?.empty ?? 'No data'}</EmptyFigure>;
  return <Earnings {...props} />;
}

const GLYPH: Record<EarningsOutcome, string> = { beat: '▲', miss: '▼', inline: '●', upcoming: '○', reported: '●', none: '' };
function Earnings({ periods, label, measure = 'EPS', variant = 'dots', currency, locale = 'en-IN', height = 260, legend = true, interactive = true, labels, testId }: EarningsChartProps) {
  const data = useMemo(() => earningsRows(periods, currency), [periods, currency]);
  const { rows, scale } = data;
  const moneyText = useMoneyText(data.kind === 'money' ? (data.currency ?? 'NPR') : 'NPR', locale);
  const digits = Math.max(2, scale);
  const decimalFormat = useMemo(() => {
    const base = { minimumFractionDigits: digits, maximumFractionDigits: digits };
    return {
      plain: new Intl.NumberFormat(locale, data.currency ? { ...base, style: 'currency' as const, currency: data.currency, currencyDisplay: 'code' as const } : base),
      axis: new Intl.NumberFormat(locale, { ...base, minimumFractionDigits: 0 }),
    };
  }, [locale, digits, data.currency]);
  // Money prints through the money module; decimal strings through Intl, which formats a decimal string exactly.
  const fmt = {
    plain: (u: bigint): string => (data.kind === 'money' ? moneyText.plain(u) : decimalFormat.plain.format(decimalText(u, scale, digits) as `${number}`)),
    signed: (u: bigint): string => (u > 0n ? `+${fmt.plain(u)}` : u < 0n ? `${MINUS}${fmt.plain(-u)}` : fmt.plain(0n)),
    spoken: (u: bigint): string => (data.kind === 'money' ? moneyText.spoken(u) : fmt.plain(u)),
    axis: (u: bigint): string => (data.kind === 'money' ? moneyText.compact(u) : decimalFormat.axis.format(decimalText(u, scale, 0) as `${number}`)),
  };
  const W: Record<EarningsOutcome, string> = {
    beat: labels?.beat ?? 'Beat',
    miss: labels?.miss ?? 'Miss',
    inline: labels?.inLine ?? 'In line',
    upcoming: labels?.upcoming ?? 'Upcoming',
    reported: labels?.reported ?? 'Reported',
    none: '',
  };
  const L = { estimate: labels?.estimate ?? 'Estimate', actual: labels?.actual ?? 'Actual' };
  const n = rows.length;
  const reported = rows.filter((r) => r.surprise !== null);
  const beats = reported.filter((r) => r.outcome === 'beat').length;
  const misses = reported.filter((r) => r.outcome === 'miss').length;
  const inLine = reported.length - beats - misses;
  const latest = rows.toReversed().find((r) => r.actual !== null);
  const next = rows.find((r) => r.outcome === 'upcoming');
  const result = (r: EarningsRow) => (r.surprise === null ? W[r.outcome] : `${W[r.outcome]}${r.surprise === 0n ? '' : ` ${fmt.signed(r.surprise)}`}${r.surprisePercent === null ? '' : `, ${signedPct(r.surprisePercent)}`}`);
  const spokenResult = (r: EarningsRow) => (r.surprise === null ? W[r.outcome] : `${W[r.outcome]}${r.surprise === 0n ? '' : ` by ${fmt.spoken(r.surprise < 0n ? -r.surprise : r.surprise)}`}${r.surprisePercent === null ? '' : `, ${r.surprisePercent.replace('-', '')} percent`}`);
  const summary = (labels?.summary ?? ((i) => `${i.measure}, estimate against actual, over ${i.count} periods. Beat ${i.beats}, missed ${i.misses}, in line ${i.inLine}.${i.latest ? ` ${i.latest}.` : ''}${i.next ? ` ${i.next}.` : ''}`))({
    measure,
    count: n,
    beats,
    misses,
    inLine,
    latest: latest ? `Latest ${latest.period.label}: actual ${fmt.spoken(latest.actual!)}${latest.estimate === null ? '' : `, estimate ${fmt.spoken(latest.estimate)}, ${spokenResult(latest).toLowerCase()}`}` : '',
    next: next ? `Next ${next.period.label}: estimate ${fmt.spoken(next.estimate!)}` : '',
  });
  const values = rows.flatMap((r) => [r.estimate, r.actual]).filter((v): v is bigint => v !== null);
  const hi = Math.max(0, ...values.map(num)) * 1.08;
  const lo = Math.min(0, ...values.map(num)) * 1.08;
  const line = (r: EarningsRow) => `${GLYPH[r.outcome]} ${result(r)}`.trim();
  return (
    <ChartA11yShell
      className="kit-ct pu-ec"
      label={label}
      roleDescription="earnings chart"
      count={n}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between periods, Home and End to jump to the first and last.'}
      summary={summary}
      speak={(i) => {
        const r = rows[i]!;
        if (r.outcome === 'upcoming') return `${r.period.label}: ${W.upcoming}, ${L.estimate.toLowerCase()} ${fmt.spoken(r.estimate!)}, not yet reported`;
        return `${r.period.label}: ${L.actual.toLowerCase()} ${r.actual === null ? 'not available' : fmt.spoken(r.actual)}${r.estimate === null ? '' : `, ${L.estimate.toLowerCase()} ${fmt.spoken(r.estimate)}`}, ${spokenResult(r)}`;
      }}
      footer={
        legend ? (
          <ul className="kit-ct-legend pu-st-legend" aria-hidden="true">
            <li><i className="pu-st-sw actual" />{L.actual}</li>
            <li><i className="pu-st-sw est" />{L.estimate}</li>
            <li><i className="pu-st-sw gain" />{'▲'} {W.beat}</li>
            <li><i className="pu-st-sw loss" />{'▼'} {W.miss}</li>
          </ul>
        ) : undefined
      }
      table={
        <ChartDataTable
          caption={label}
          head={[labels?.period ?? 'Period', L.estimate, L.actual, labels?.surprise ?? 'Surprise', labels?.surprisePercent ?? 'Surprise %', labels?.result ?? 'Result']}
          rows={rows.map((r) => ({
            key: r.period.key,
            head: r.period.label,
            cells: [r.estimate === null ? '' : fmt.plain(r.estimate), r.actual === null ? '' : fmt.plain(r.actual), r.surprise === null ? '' : fmt.signed(r.surprise), r.surprisePercent === null ? '' : signedPct(r.surprisePercent), W[r.outcome]],
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
          tickText={(v) => (v === 0 ? '0' : fmt.axis(BigInt(Math.round(v))))}
          labelAt={(i) => rows[i]!.period.label}
          labelPx={56}
          testId={testId}
          renderTip={(i) => {
            const r = rows[i]!;
            return (
              <>
                <b>{r.period.label}</b>
                <dl>
                  <div><dt>{L.estimate}</dt><dd>{r.estimate === null ? '—' : fmt.plain(r.estimate)}</dd></div>
                  <div><dt>{L.actual}</dt><dd>{r.actual === null ? '—' : fmt.plain(r.actual)}</dd></div>
                  <div><dt>{labels?.result ?? 'Result'}</dt><dd className={`pu-ec-result ${tone(r)}`}>{line(r)}</dd></div>
                </dl>
              </>
            );
          }}
          renderPlot={({ cx, bw, y, zero, uid }) => {
            const w = Math.min(44, Math.max(6, bw * 0.45));
            return (
              <>
                <defs>
                  <pattern id={`${uid}h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" className="pu-mc-hatch" /></pattern>
                </defs>
                {rows.map((r, i) => {
                  const x = cx(i);
                  const ye = r.estimate === null ? null : y(num(r.estimate));
                  const ya = r.actual === null ? null : y(num(r.actual));
                  const top = Math.min(ye ?? Infinity, ya ?? Infinity);
                  return (
                    <g key={r.period.key} className={`pu-ec-p ${r.outcome}`} data-testid={testId ? `${testId}-${r.period.key}` : undefined}>
                      {isUpcoming(r) && <rect className="pu-ec-next" x={x - bw / 2 + 2} y={y(hi)} width={Math.max(0, bw - 4)} height={Math.max(0, y(lo) - y(hi))} rx={4} />}
                      {variant === 'dots' && ye !== null && ya !== null && <line className={`pu-ec-gap ${tone(r)}`} x1={x} x2={x} y1={ye} y2={ya} />}
                      {variant === 'bars' && ya !== null && (
                        <>
                          <rect className={`pu-ec-bar ${tone(r)}`} x={x - w / 2} y={Math.min(zero, ya)} width={w} height={Math.max(2, Math.abs(zero - ya))} rx={2} />
                          {r.outcome === 'miss' && <rect className="pu-mc-bar-hatch" x={x - w / 2} y={Math.min(zero, ya)} width={w} height={Math.max(2, Math.abs(zero - ya))} rx={2} fill={`url(#${uid}h)`} />}
                        </>
                      )}
                      {variant === 'bars' && isUpcoming(r) && ye !== null && <rect className="pu-ec-bar-next" x={x - w / 2} y={Math.min(zero, ye)} width={w} height={Math.max(2, Math.abs(zero - ye))} rx={2} />}
                      {ye !== null && (variant === 'dots' ? <circle className={`pu-ec-est${isUpcoming(r) ? ' next' : ''}`} cx={x} cy={ye} r={5} /> : <line className="pu-ec-tick" x1={x - w / 2 - 4} x2={x + w / 2 + 4} y1={ye} y2={ye} />)}
                      {ya !== null && variant === 'dots' && <circle className={`pu-ec-act ${tone(r)}`} cx={x} cy={ya} r={5} />}
                      {r.outcome !== 'upcoming' && r.surprise !== null && (
                        <text className={`pu-ec-note ${tone(r)}`} x={x} y={Math.max(11, top - 9)} textAnchor="middle">
                          {GLYPH[r.outcome]}
                          {bw >= 52 && r.surprisePercent !== null ? ` ${signedPct(r.surprisePercent)}` : ''}
                        </text>
                      )}
                    </g>
                  );
                })}
              </>
            );
          }}
        />
      )}
    </ChartA11yShell>
  );
}
