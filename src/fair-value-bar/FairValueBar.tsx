/**
 * FairValueBar (design.punji.app/components/fair-value-bar): the current price against a fair (intrinsic) value on a
 * bar that is centred on the fair value, with an undervalued zone to the left and an overvalued zone to the right.
 * The gap is `(price - fair value) / fair value`, worked in bigint from decimal strings or `Money` and printed with a sign
 * and a word ("−23.4% below fair value"), so a price is never rounded through a float. The zones, the legend and the
 * verdict word all say the same thing: colour is never the only cue. The fair value comes from the app (a DCF, an
 * analyst consensus, a model of your own); this component only draws the comparison.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape through price, fair value and gap,
 * live region, spoken summary, hidden table).
 */
import type { CSSProperties, ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { alignScale, currencyOf, decimalText, gapAtLeast, gapAtMost, gapTenths, milliPercent, percentText, scaledOf, type PriceInput } from '../internal/decimal.ts';

export type { PriceInput } from '../internal/decimal.ts';

export type FairValueVerdict = 'undervalued' | 'fair' | 'overvalued';

export interface FairValueBarThresholds {
  /** The price counts as undervalued when it is at least this many percent below the fair value. Default 20. */
  undervalued?: number;
  /** The price counts as overvalued when it is at least this many percent above the fair value. Default 20. */
  overvalued?: number;
}

export interface FairValueBarLabels {
  price?: string;
  fairValue?: string;
  difference?: string;
  verdict?: string;
  undervalued?: string;
  fair?: string;
  overvalued?: string;
  /** "below fair value". */
  below?: string;
  /** "above fair value". */
  above?: string;
  /** "at fair value". */
  at?: string;
  unavailable?: ReactNode;
  hint?: string;
  summary?: (info: { price: string; fairValue: string; gap: string; relation: string; verdict: string }) => string;
}

export interface FairValueBarProps {
  /** The current price: a decimal string ("77.00") or `Money`. */
  price: PriceInput;
  /** The fair or intrinsic value, from the app. Must be above zero. */
  fairValue: PriceInput;
  /** Names the chart. */
  label: string;
  /** ISO 4217 code for decimal strings. Default "NPR"; ignored for the part given as `Money`. */
  currency?: string;
  /** BCP 47 tag for number grouping. Default "en-IN". */
  locale?: string;
  /** Where the zones start, in percent of the fair value. Default 20 and 20. */
  thresholds?: FairValueBarThresholds;
  /** Pass false when a parent gives the same figures another way: removes the tab stop and the live region. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: FairValueBarLabels;
  /** Layout only (margin, grid placement). */
  className?: string;
  /** Becomes data-testid on the figure; the marker is `${testId}-marker`. */
  testId?: string;
}

export interface FairValueReading {
  /** Tenths of a percent: (price - fair) / fair, rounded half away from zero. */
  gapTenths: bigint;
  verdict: FairValueVerdict;
}

/**
 * The gap and the verdict, exact. `price` and `fairValue` share one currency; strings use `currency` (default "NPR").
 * Returns null when either does not parse or the fair value is not above zero.
 */
export function fairValueReading(price: PriceInput, fairValue: PriceInput, thresholds: FairValueBarThresholds = {}, currency = 'NPR'): FairValueReading | null {
  currencyOf([price, fairValue], currency);
  const p = scaledOf(price);
  const f = scaledOf(fairValue);
  if (!p || !f || f.n <= 0n) return null;
  const { units } = alignScale([p, f]);
  const [a, b] = [units[0]!, units[1]!];
  const gap = gapTenths(a, b)!;
  const under = milliPercent(thresholds.undervalued ?? 20);
  const over = milliPercent(thresholds.overvalued ?? 20);
  return { gapTenths: gap, verdict: gapAtMost(a, b, -under) ? 'undervalued' : gapAtLeast(a, b, over) ? 'overvalued' : 'fair' };
}

const zone = (from: number, to: number): CSSProperties => ({ left: `${from}%`, width: `${Math.max(0, to - from)}%` });

/** The half-width of the bar in percent: round, wide enough for the zones and the gap. */
function halfSpan(gapPct: number, under: number, over: number): number {
  const need = Math.max(Math.abs(gapPct) * 1.1, Math.max(under, over) * 2.5, 50);
  return Math.min(100, Math.ceil(need / 10) * 10);
}

/**
 * @stability beta
 */
export function FairValueBar({ price, fairValue, label, currency = 'NPR', locale, thresholds, interactive = true, labels, className, testId }: FairValueBarProps) {
  const code = currencyOf([price, fairValue], currency);
  const reading = fairValueReading(price, fairValue, thresholds, code);
  const cls = `kit-ct pu-fvb${className ? ` ${className}` : ''}`;
  if (!reading) {
    return (
      <figure className={cls} aria-label={label} data-testid={testId}>
        <p className="kit-ct-empty">{labels?.unavailable ?? 'Fair value is not available'}</p>
      </figure>
    );
  }
  return <Bar {...{ price, fairValue, label, locale, thresholds, interactive, labels, className: cls, testId }} code={code} reading={reading} />;
}

interface BarProps extends Omit<FairValueBarProps, 'currency' | 'className'> {
  code: string;
  reading: FairValueReading;
  className: string;
}

function Bar({ price, fairValue, label, code, locale, thresholds, interactive, labels, className, testId, reading }: BarProps) {
  const text = decimalText(code, locale);
  const { units, scale } = alignScale([scaledOf(price)!, scaledOf(fairValue)!]);
  const priceText = text.plain(units[0]!, scale);
  const fairText = text.plain(units[1]!, scale);
  const under = thresholds?.undervalued ?? 20;
  const over = thresholds?.overvalued ?? 20;
  const L = {
    price: labels?.price ?? 'Current price',
    fair: labels?.fairValue ?? 'Fair value',
    diff: labels?.difference ?? 'Difference',
    verdict: labels?.verdict ?? 'Verdict',
    words: { undervalued: labels?.undervalued ?? 'Undervalued', fair: labels?.fair ?? 'About fair value', overvalued: labels?.overvalued ?? 'Overvalued' },
  };
  const tenths = reading.gapTenths;
  const gapPct = Number(tenths) / 10;
  const gap = percentText(tenths);
  const relation = tenths < 0n ? (labels?.below ?? 'below fair value') : tenths > 0n ? (labels?.above ?? 'above fair value') : (labels?.at ?? 'at fair value');
  const verdict = L.words[reading.verdict];
  const span = halfSpan(gapPct, under, over);
  const at = (g: number) => Math.min(100, Math.max(0, ((g + span) / (2 * span)) * 100));
  const markerAt = at(gapPct);
  const underEdge = at(-under);
  const overEdge = at(over);
  const summary = (labels?.summary ?? ((i) => `${L.price} ${i.price} is ${i.gap} ${i.relation} (fair value ${i.fairValue}): ${i.verdict}.`))({ price: priceText, fairValue: fairText, gap: tenths === 0n ? '0%' : percentText(tenths < 0n ? -tenths : tenths, { sign: false }), relation, verdict });
  const rows = [
    { key: 'price', head: L.price, value: priceText },
    { key: 'fair', head: L.fair, value: fairText },
    { key: 'gap', head: L.diff, value: `${gap} ${relation}` },
    { key: 'verdict', head: L.verdict, value: verdict },
  ];
  const flagSide = markerAt < 22 ? 'start' : markerAt > 78 ? 'end' : 'mid';
  return (
    <ChartA11yShell
      className={className}
      label={label}
      roleDescription="fair value bar"
      count={3}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between the price, the fair value and the difference.'}
      summary={summary}
      dataAttrs={{ 'data-verdict': reading.verdict }}
      speak={(i) => (i === 0 ? `${L.price} ${priceText}` : i === 1 ? `${L.fair} ${fairText}` : `${L.diff} ${gap} ${relation}: ${verdict}`)}
      table={<ChartDataTable caption={label} head={['Measure', 'Value']} rows={rows.map((r) => ({ key: r.key, head: r.head, cells: [r.value] }))} />}
      footer={
        <ul className="kit-ct-legend pu-fvb-legend" aria-hidden="true">
          <li><i className="pu-fvb-sw under" />{L.words.undervalued}: {percentText(BigInt(Math.round(under * 10)), { sign: false })} or more below</li>
          <li><i className="pu-fvb-sw fair" />{L.words.fair}</li>
          <li><i className="pu-fvb-sw over" />{L.words.overvalued}: {percentText(BigInt(Math.round(over * 10)), { sign: false })} or more above</li>
        </ul>
      }
    >
      {(ctx) => (
        <>
          <dl className="pu-fvb-read">
            <div className={ctx.index === 0 ? 'is-active' : undefined}><dt>{L.price}</dt><dd>{priceText}</dd></div>
            <div className={ctx.index === 1 ? 'is-active' : undefined}><dt>{L.fair}</dt><dd>{fairText}</dd></div>
          </dl>
          <p className={`pu-fvb-gap ${reading.verdict}${ctx.index === 2 ? ' is-active' : ''}`}>
            <b className="pu-fvb-pct">{gap}</b> <span>{relation}</span>
            <span className="pu-fvb-verdict">{reading.verdict === 'undervalued' ? '▼ ' : reading.verdict === 'overvalued' ? '▲ ' : '● '}{verdict}</span>
          </p>
          {/* The track is the one focus stop; the drawing is decorative because the figures are printed above and in the table. */}
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
          <div className="kit-ct-plot pu-fvb-plot" {...ctx.plotProps()}>
            <div className="pu-fvb-track" aria-hidden="true">
              <i className="pu-fvb-zone under" style={zone(0, underEdge)} />
              <i className="pu-fvb-zone fair" style={zone(underEdge, overEdge)} />
              <i className="pu-fvb-zone over" style={zone(overEdge, 100)} />
              <i className="pu-fvb-fair" style={{ left: `${at(0)}%` }} />
              <span className={`pu-fvb-marker ${flagSide}`} style={{ left: `${markerAt}%` }} data-testid={testId ? `${testId}-marker` : undefined}>
                <em>{L.price}</em>
              </span>
            </div>
            <div className="pu-fvb-scale" aria-hidden="true">
              <span>{percentText(BigInt(-span * 10))}</span>
              <span>{L.fair}</span>
              <span>{percentText(BigInt(span * 10))}</span>
            </div>
          </div>
        </>
      )}
    </ChartA11yShell>
  );
}
