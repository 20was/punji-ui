'use client';

/**
 * PayoffChart (design.punji.app/components/payoff-chart): the profit or loss of an options strategy at expiry, for any
 * mix of long and short calls, puts and stock. The line is exact (the payoff is piecewise linear, so the points are the
 * range's ends, an even spread and every strike); the breakevens are exact ratios; the maximum profit and loss are
 * printed, and "Unlimited" is a word, not a symbol. A marker shows the current price. A caller can add a second line, the
 * payoff today or at any earlier date, from values they priced themselves: no pricing model ships here.
 *
 * Never colour alone: profit sits above the zero line with a "Profit" label and "+" signs, loss below it, hatched, with a
 * "Loss" label and "−" signs; the today line is dashed with square markers; the current price is a dashed vertical rule
 * with its name; breakevens are diamonds with their price.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape through the prices, live region, spoken
 * summary, hidden table of price, profit or loss at expiry and the optional today value).
 *
 * @stability beta
 */
import { useId, useMemo, type PointerEvent, type ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { niceTicks } from '../chart-math/chartMath.ts';
import { payoffAt, payoffSamples, strategyBreakevens, strategyExtremes, type Breakeven, type PayoffExtreme, type PayoffLeg, type PayoffLegKind, type PayoffSide } from '../chart-math/payoff.ts';
import { ChartTooltip, clamp, isNum, useMeasuredWidth } from '../internal/chartFrame.tsx';
import { currencyExponent, isMoney, type Money } from '../money/money.ts';
import { EmptyFigure, num, sharedCurrency, useMoneyText } from '../money-chart/shared.tsx';

/** One leg of the strategy, with `Money` prices in a single currency. */
export interface PayoffChartLeg {
  /** 'call', 'put' or 'stock'. */
  kind: PayoffLegKind;
  /** 'long' (bought) or 'short' (sold). */
  side: PayoffSide;
  /** Contracts (or shares for stock): a positive whole number. */
  quantity: number;
  /** Units of the underlying per contract. Default 1. */
  multiplier?: number;
  /** The strike. Required for a call or a put; not used for stock. */
  strike?: Money;
  /** Premium paid (long) or received (short) per unit; for stock, the entry price. */
  premium: Money;
}

/** A profit or loss you priced yourself for one underlying price (for example from your own model, as of today). */
export interface PayoffTodayPoint {
  /** The price of the underlying. */
  spot: Money;
  /** Profit or loss at that price, premium included; negative for a loss. */
  value: Money;
}

export interface PayoffChartLabels {
  empty?: ReactNode;
  /** Words for a leg: "Long", "Short", "call", "put", "stock". */
  long?: string;
  short?: string;
  call?: string;
  put?: string;
  stock?: string;
  /** Printed with a leg's strike and premium. */
  strike?: string;
  premium?: string;
  entry?: string;
  /** "Profit", "Loss" and "Breakeven". */
  profit?: string;
  loss?: string;
  breakeven?: string;
  /** Names of the facts under the chart. */
  maxProfit?: string;
  maxLoss?: string;
  breakevens?: string;
  currentPrice?: string;
  /** What "no breakeven", "no loss" and "no profit" print. */
  none?: string;
  /** Printed for an unbounded profit or loss. Default "Unlimited". */
  unlimited?: string;
  /** Table heads. */
  price?: string;
  atExpiry?: string;
  today?: string;
  result?: string;
  legsHeading?: string;
  hint?: string;
}

export interface PayoffChartProps {
  /** The strategy. At least one leg, all prices in one currency. */
  legs: readonly PayoffChartLeg[];
  /** Names the chart and its table. */
  label: string;
  /** The current price of the underlying: draws a marker and prints the payoff there. */
  spot?: Money;
  /** The payoff before expiry, from your own pricing: spots with their profit or loss. Drawn as a dashed line and listed in the table. */
  today?: readonly PayoffTodayPoint[];
  /** Name of the `today` line. Default "Today". */
  todayLabel?: string;
  /** The prices to draw, lowest to highest. Default: a margin around the strikes and the current price. */
  range?: { from: Money; to: Money };
  /** BCP 47 tag for the number format. Default "en-IN". */
  locale?: string;
  /** The plot's height in CSS px, clamped to 160..520. Default 280. */
  height?: number;
  /** Print the legend. Default true. */
  legend?: boolean;
  /** Print the legs and the facts (maximum profit and loss, breakevens) under the chart. Default true. */
  facts?: boolean;
  /** Pass false when a parent hides the chart and gives the same figures as a table. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: PayoffChartLabels;
  /** Becomes data-testid on the figure. */
  testId?: string;
}

const TOP = 14;
const AXIS_H = 22;

/** What the chart worked out, exact: used by the component and by anything that wants the same figures. */
export interface PayoffModel {
  currency: string;
  legs: PayoffLeg[];
  /** The prices the line passes through and the cursor visits, ascending (minor units). */
  spots: bigint[];
  /** Profit or loss at expiry at each of `spots`. */
  values: bigint[];
  breakevens: Breakeven[];
  maxProfit: PayoffExtreme;
  maxLoss: PayoffExtreme;
  from: bigint;
  to: bigint;
}

const minorOf = (m: Money): bigint => m.minor;

function toLegs(legs: readonly PayoffChartLeg[]): PayoffLeg[] {
  return legs.map((leg) => ({
    kind: leg.kind,
    side: leg.side,
    quantity: leg.quantity,
    multiplier: leg.multiplier,
    strike: leg.strike === undefined ? undefined : minorOf(leg.strike),
    premium: minorOf(leg.premium),
  }));
}

/** Widens a range outward to round tick values (the chart-math nice steps), so an automatic axis never prints a raw computed end. Never below zero. */
function niceRange(r: { from: bigint; to: bigint }): { from: bigint; to: bigint } {
  const { lo, hi } = niceTicks(Number(r.from), Number(r.to), 5);
  const from = BigInt(Math.max(0, Math.floor(lo)));
  const to = BigInt(Math.ceil(hi));
  return { from: from < r.from ? from : r.from, to: to > r.to ? to : r.to };
}

/** The default price range: the strikes, stock entries, breakevens, current price and today's prices with a margin (60% of their spread, at least 4% of the highest), never below zero. */
function defaultRange(legs: readonly PayoffLeg[], extras: readonly bigint[]): { from: bigint; to: bigint } {
  const refs = [...legs.filter((l) => l.kind !== 'stock').map((l) => l.strike!), ...legs.filter((l) => l.kind === 'stock').map((l) => l.premium), ...extras];
  if (refs.length === 0) return { from: 0n, to: 100n };
  const lo = refs.reduce((a, b) => (b < a ? b : a));
  const hi = refs.reduce((a, b) => (b > a ? b : a));
  const spread = ((hi - lo) * 3n) / 5n;
  const scale = hi / 25n;
  const widest = spread > scale ? spread : scale;
  const pad = widest > 0n ? widest : 100n;
  return { from: lo > pad ? lo - pad : 0n, to: hi + pad };
}

/**
 * The exact model behind the chart: sample prices (even spread, every strike in range, the current price, each
 * breakeven and each `today` price), the payoff at each, the breakevens and the extremes. Throws a TypeError for
 * mixed currencies and a RangeError for a bad leg or range.
 */
export function payoffModel(input: { legs: readonly PayoffChartLeg[]; spot?: Money; today?: readonly PayoffTodayPoint[]; range?: { from: Money; to: Money } }): PayoffModel {
  const { spot, today = [], range } = input;
  const moneys: Money[] = [...input.legs.flatMap((l) => [l.premium, ...(l.strike ? [l.strike] : [])]), ...(spot ? [spot] : []), ...today.flatMap((t) => [t.spot, t.value]), ...(range ? [range.from, range.to] : [])];
  const currency = sharedCurrency(moneys);
  const legs = toLegs(input.legs);
  const todaySpots = today.map((t) => minorOf(t.spot));
  const breakevens = strategyBreakevens(legs);
  const { from, to } = range ? { from: minorOf(range.from), to: minorOf(range.to) } : niceRange(defaultRange(legs, [...(spot ? [minorOf(spot)] : []), ...todaySpots, ...breakevens.map((b) => b.minor)]));
  const set = new Set<bigint>(payoffSamples(legs, from, to, 40));
  for (const extra of [...(spot ? [minorOf(spot)] : []), ...breakevens.map((b) => b.minor), ...todaySpots]) if (extra >= from && extra <= to) set.add(extra);
  const spots = [...set].toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const { maxProfit, maxLoss } = strategyExtremes(legs);
  return { currency, legs, spots, values: spots.map((s) => payoffAt(legs, s)), breakevens, maxProfit, maxLoss, from, to };
}

type Outcome = 'profit' | 'loss' | 'even';
const outcomeOf = (v: bigint): Outcome => (v > 0n ? 'profit' : v < 0n ? 'loss' : 'even');
const GLYPH: Record<Outcome, string> = { profit: '▲', loss: '▼', even: '●' };

/**
 * @stability beta
 */
export function PayoffChart(props: PayoffChartProps) {
  if (props.legs.length === 0) return <EmptyFigure label={props.label} testId={props.testId}>{props.labels?.empty ?? 'Add a leg to see the payoff'}</EmptyFigure>;
  for (const leg of props.legs) if (!isMoney(leg.premium)) throw new TypeError('PayoffChart: a leg premium must be Money');
  return <Payoff {...props} />;
}

function Payoff({ legs: legInput, label, spot, today = [], todayLabel, range, locale = 'en-IN', height = 280, legend = true, facts = true, interactive = true, labels, testId }: PayoffChartProps) {
  const model = useMemo(() => payoffModel({ legs: legInput, spot, today, range }), [legInput, spot, today, range]);
  const { spots, values, breakevens, maxProfit, maxLoss, currency } = model;
  const text = useMoneyText(currency, locale);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { ref, width } = useMeasuredWidth(640);
  const compactNumber = useMemo(() => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }), [locale]);
  const plainNumber = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: currencyExponent(currency) }), [locale, currency]);
  const plotH = clamp(isNum(height) ? height : 280, 160, 520);
  const svgH = TOP + plotH + AXIS_H;

  const W = {
    long: labels?.long ?? 'Long',
    short: labels?.short ?? 'Short',
    call: labels?.call ?? 'call',
    put: labels?.put ?? 'put',
    stock: labels?.stock ?? 'stock',
    strike: labels?.strike ?? 'strike',
    premium: labels?.premium ?? 'premium',
    entry: labels?.entry ?? 'entry',
    profit: labels?.profit ?? 'Profit',
    loss: labels?.loss ?? 'Loss',
    breakeven: labels?.breakeven ?? 'Breakeven',
    maxProfit: labels?.maxProfit ?? 'Maximum profit',
    maxLoss: labels?.maxLoss ?? 'Maximum loss',
    breakevens: labels?.breakevens ?? 'Breakevens',
    currentPrice: labels?.currentPrice ?? 'Current price',
    none: labels?.none ?? 'None',
    unlimited: labels?.unlimited ?? 'Unlimited',
    price: labels?.price ?? 'Price',
    atExpiry: labels?.atExpiry ?? 'At expiry',
    today: todayLabel ?? labels?.today ?? 'Today',
    result: labels?.result ?? 'Result',
    legsHeading: labels?.legsHeading ?? 'Legs',
  };
  const word: Record<Outcome, string> = { profit: W.profit, loss: W.loss, even: W.breakeven };

  // Today's values by price, for the table and the tooltip.
  const todayBy = useMemo(() => new Map(today.map((t) => [t.spot.minor, t.value.minor])), [today]);
  const todayLine = useMemo(() => today.toSorted((a, b) => (a.spot.minor < b.spot.minor ? -1 : a.spot.minor > b.spot.minor ? 1 : 0)), [today]);

  const signed = (v: bigint) => text.signed(v);
  const extremeText = (e: PayoffExtreme, kind: 'profit' | 'loss') => (e.unlimited ? W.unlimited : kind === 'profit' ? (e.value > 0n ? signed(e.value) : W.none) : e.value < 0n ? signed(e.value) : W.none);
  const extremeSpoken = (e: PayoffExtreme, kind: 'profit' | 'loss') => (e.unlimited ? W.unlimited.toLowerCase() : kind === 'profit' ? (e.value > 0n ? text.spoken(e.value) : W.none.toLowerCase()) : e.value < 0n ? text.spoken(-e.value) : W.none.toLowerCase());
  const beText = breakevens.length === 0 ? W.none : breakevens.map((b) => `${text.plain(b.minor)}${b.exact ? '' : '*'}`).join(', ');
  const beSpoken = breakevens.length === 0 ? W.none.toLowerCase() : breakevens.map((b) => text.spoken(b.minor)).join(', ');

  const spotMinor = spot?.minor;
  const spotValue = spotMinor === undefined ? null : payoffAt(model.legs, spotMinor);
  const legText = (leg: PayoffChartLeg, speak = false) => {
    const money = speak ? (m: Money) => text.spoken(m.minor) : (m: Money) => text.plain(m.minor);
    const side = leg.side === 'long' ? W.long : W.short;
    const unit = `${leg.quantity}${leg.multiplier && leg.multiplier !== 1 ? ` × ${leg.multiplier}` : ''}`;
    return leg.kind === 'stock'
      ? `${side} ${unit} ${W.stock}, ${W.entry} ${money(leg.premium)}`
      : `${side} ${unit} ${W[leg.kind]}, ${W.strike} ${leg.strike ? money(leg.strike) : '?'}, ${W.premium} ${money(leg.premium)}`;
  };

  const summary = `${label}: profit or loss at expiry for ${legInput.length} ${legInput.length === 1 ? 'leg' : 'legs'}. ${W.maxProfit} ${extremeSpoken(maxProfit, 'profit')}. ${W.maxLoss} ${extremeSpoken(maxLoss, 'loss')}. ${W.breakevens} ${beSpoken}.${spotValue === null ? '' : ` At the ${W.currentPrice.toLowerCase()} ${text.spoken(spotMinor!)}: ${word[outcomeOf(spotValue)].toLowerCase()}${spotValue === 0n ? '' : ` ${text.spoken(spotValue < 0n ? -spotValue : spotValue)}`}.`}`;

  const speakAt = (i: number) => {
    const v = values[i]!;
    const o = outcomeOf(v);
    const t = todayBy.get(spots[i]!);
    return `${W.price} ${text.spoken(spots[i]!)}: ${word[o].toLowerCase()}${v === 0n ? '' : ` ${text.spoken(v < 0n ? -v : v)}`}${t === undefined ? '' : `, ${W.today.toLowerCase()} ${t < 0n ? `${W.loss.toLowerCase()} ${text.spoken(-t)}` : t === 0n ? W.breakeven.toLowerCase() : `${W.profit.toLowerCase()} ${text.spoken(t)}`}`}`;
  };

  // Geometry: numbers are for pixels only; every printed figure comes from the bigint.
  const allY = [...values.map(num), ...today.map((t) => num(t.value.minor)), 0];
  const yLo = Math.min(...allY);
  const yHi = Math.max(...allY);
  const yPad = (yHi - yLo || 1) * 0.1;
  const yTicks = niceTicks(Math.min(yLo - (yLo < 0 ? yPad : 0), 0), Math.max(yHi + (yHi > 0 ? yPad : 0), 0) || 1, Math.max(3, Math.round(plotH / 56)));
  // Axis labels are bare numbers (K, L, Cr for en-IN) with the currency named once; every exact figure is in the facts, tooltip and table.
  const exp = currencyExponent(currency);
  const major = (minor: number) => minor / 10 ** exp;
  const yTexts = yTicks.ticks.map((t) => (t === 0 ? '0' : `${t > 0 ? '+' : '−'}${compactNumber.format(Math.abs(major(t)))}`));
  const axisW = Math.min(80, Math.max(...yTexts.map((t) => t.length)) * 7 + 14);
  const x0 = 6;
  const x1 = Math.max(x0 + 60, width - axisW);
  const fromN = num(model.from);
  const toN = num(model.to);
  const xOf = (s: number) => x0 + ((s - fromN) / (toN - fromN || 1)) * (x1 - x0);
  const yOf = (v: number) => TOP + plotH - ((v - yTicks.lo) / (yTicks.hi - yTicks.lo || 1)) * plotH;
  const zeroY = yOf(0);
  const niceX = niceTicks(fromN, toN, Math.max(2, Math.min(6, Math.floor((x1 - x0) / 96)))).ticks.filter((t) => t >= fromN && t <= toN);
  const xTicks = niceX.length >= 2 ? niceX : [fromN, toN];
  const line = spots.map((s, i) => `${i === 0 ? 'M' : 'L'}${xOf(num(s)).toFixed(1)},${yOf(num(values[i]!)).toFixed(1)}`).join(' ');
  const area = `${line} L${xOf(num(spots[spots.length - 1]!)).toFixed(1)},${zeroY.toFixed(1)} L${xOf(num(spots[0]!)).toFixed(1)},${zeroY.toFixed(1)} Z`;
  const todayPath = todayLine.map((t, i) => `${i === 0 ? 'M' : 'L'}${xOf(num(t.spot.minor)).toFixed(1)},${yOf(num(t.value.minor)).toFixed(1)}`).join(' ');
  const hasProfit = values.some((v) => v > 0n);
  const hasLoss = values.some((v) => v < 0n);
  const spotInRange = spotMinor !== undefined && spotMinor >= model.from && spotMinor <= model.to;

  const indexAt = (e: PointerEvent<HTMLDivElement>): number => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    let dist = Infinity;
    spots.forEach((s, i) => {
      const d = Math.abs(xOf(num(s)) - px);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  };

  const resultText = (v: bigint) => `${GLYPH[outcomeOf(v)]} ${word[outcomeOf(v)]}${v === 0n ? '' : ` ${signed(v)}`}`;

  return (
    <ChartA11yShell
      className="kit-ct pu-pay"
      label={label}
      roleDescription="payoff chart"
      count={spots.length}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between prices, Home and End to jump to the lowest and highest price.'}
      summary={summary}
      speak={speakAt}
      footer={
        <>
          {legend && (
            <ul className="kit-ct-legend pu-pay-legend" aria-hidden="true">
              <li><i className="pu-pay-sw line" />{W.atExpiry}</li>
              {today.length > 0 && <li><i className="pu-pay-sw today" />{W.today}</li>}
              <li><i className="pu-pay-sw profit" />{'▲'} {W.profit}</li>
              <li><i className="pu-pay-sw loss" />{'▼'} {W.loss}</li>
              <li><i className="pu-pay-sw be" />{W.breakeven}</li>
            </ul>
          )}
          {facts && (
            <div className="pu-pay-facts">
              <dl className="pu-pay-grid">
                <div><dt>{W.maxProfit}</dt><dd className="pu-pay-gain" data-testid={testId ? `${testId}-max-profit` : undefined}>{maxProfit.unlimited || maxProfit.value > 0n ? <span aria-hidden="true">{'▲ '}</span> : null}{extremeText(maxProfit, 'profit')}</dd></div>
                <div><dt>{W.maxLoss}</dt><dd className="pu-pay-loss-text" data-testid={testId ? `${testId}-max-loss` : undefined}>{maxLoss.unlimited || maxLoss.value < 0n ? <span aria-hidden="true">{'▼ '}</span> : null}{extremeText(maxLoss, 'loss')}</dd></div>
                <div><dt>{W.breakevens}</dt><dd data-testid={testId ? `${testId}-breakevens` : undefined}>{beText}</dd></div>
                {spotValue !== null && <div><dt>{W.currentPrice} {text.plain(spotMinor!)}</dt><dd>{resultText(spotValue)}</dd></div>}
              </dl>
              {breakevens.some((b) => !b.exact) && <p className="pu-pay-note">* {'Rounded to the nearest minor unit; the exact breakeven is between two whole prices.'}</p>}
              <p className="pu-pay-legs-title" id={`${uid}-legs`}>{W.legsHeading}</p>
              <ul className="pu-pay-legs" aria-labelledby={`${uid}-legs`}>
                {legInput.map((leg, i) => (
                  <li key={i}>{legText(leg)}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      }
      table={
        <ChartDataTable
          caption={label}
          head={[W.price, W.atExpiry, W.result, ...(today.length > 0 ? [W.today] : [])]}
          rows={spots.map((s, i) => {
            const t = todayBy.get(s);
            const v = values[i]!;
            return {
              key: s.toString(),
              head: text.plain(s),
              cells: [signed(v), word[outcomeOf(v)], ...(today.length > 0 ? [t === undefined ? '' : signed(t)] : [])],
            };
          })}
        />
      }
    >
      {({ index, pointerTo, plotProps }) => {
        const idx = index;
        return (
          <div ref={ref} className="kit-ct-area" style={{ height: svgH }}>
            {/* The plot is the one focus stop: arrow keys move through the prices, the pointer reads one. */}
            {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
            <div className="kit-ct-plot" {...plotProps((e) => pointerTo(indexAt(e)))}>
              <svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`} aria-hidden="true" focusable="false">
                <defs>
                  <clipPath id={`${uid}p`}><rect x={x0} y={TOP} width={Math.max(0, x1 - x0)} height={Math.max(0, zeroY - TOP)} /></clipPath>
                  <clipPath id={`${uid}l`}><rect x={x0} y={zeroY} width={Math.max(0, x1 - x0)} height={Math.max(0, TOP + plotH - zeroY)} /></clipPath>
                  <pattern id={`${uid}h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" className="pu-pay-hatch" /></pattern>
                </defs>
                <text className="kit-ct-axis pu-pay-unit" x={x1 + 8} y={svgH - 6}>{currency}</text>
                {yTicks.ticks.map((t, k) => (
                  <g key={t}>
                    <line className={`kit-ct-grid${t === 0 ? ' base' : ''}`} x1={x0} x2={x1} y1={yOf(t)} y2={yOf(t)} />
                    <text className="kit-ct-axis" x={x1 + 8} y={yOf(t)} dominantBaseline="middle">{yTexts[k]}</text>
                  </g>
                ))}
                <g clipPath={`url(#${uid}p)`}><path className="pu-pay-area profit" d={area} /></g>
                <g clipPath={`url(#${uid}l)`}>
                  <path className="pu-pay-area loss" d={area} />
                  <path d={area} fill={`url(#${uid}h)`} />
                </g>
                {hasProfit && <text className="pu-pay-zone profit" x={x0 + 6} y={TOP + 12}>{'▲ '}{W.profit}</text>}
                {hasLoss && <text className="pu-pay-zone loss" x={x0 + 6} y={TOP + plotH - 6}>{'▼ '}{W.loss}</text>}
                {xTicks.map((t) => (
                  <text key={t} className="kit-ct-axis" x={clamp(xOf(t), x0 + 24, x1 - 24)} y={svgH - 6} textAnchor="middle">{plainNumber.format(major(t))}</text>
                ))}
                {spotInRange && (
                  <g className="pu-pay-spot">
                    <line x1={xOf(num(spotMinor!))} x2={xOf(num(spotMinor!))} y1={TOP} y2={TOP + plotH} />
                    <text x={clamp(xOf(num(spotMinor!)) + 4, x0 + 4, x1 - 60)} y={TOP + 12}>{W.currentPrice}</text>
                  </g>
                )}
                {today.length > 0 && (
                  <g className="pu-pay-today">
                    <path d={todayPath} />
                    {todayLine.map((t) => (
                      <rect key={t.spot.minor.toString()} x={xOf(num(t.spot.minor)) - 2.5} y={yOf(num(t.value.minor)) - 2.5} width={5} height={5} />
                    ))}
                  </g>
                )}
                <path className="pu-pay-line" d={line} />
                {breakevens.map((b, k) => {
                  if (b.minor < model.from || b.minor > model.to) return null;
                  const bx = xOf(num(b.minor));
                  const prev = k > 0 ? xOf(num(breakevens[k - 1]!.minor)) : -Infinity;
                  // Labels closer than their own width alternate above and below the zero line.
                  const below = bx - prev < 96 && k % 2 === 1;
                  return (
                    <g key={b.minor.toString()} className="pu-pay-be">
                      <path d={`M${bx},${zeroY - 5} L${bx + 5},${zeroY} L${bx},${zeroY + 5} L${bx - 5},${zeroY} Z`} />
                      <text x={clamp(bx, x0 + 40, x1 - 40)} y={below ? zeroY + 20 : zeroY - 9} textAnchor="middle">{plainNumber.format(major(Number(b.minor)))}</text>
                    </g>
                  );
                })}
                {idx !== null && (
                  <g className="pu-pay-cursor">
                    <line x1={xOf(num(spots[idx]!))} x2={xOf(num(spots[idx]!))} y1={TOP} y2={TOP + plotH} />
                    <circle cx={xOf(num(spots[idx]!))} cy={yOf(num(values[idx]!))} r={4.5} />
                  </g>
                )}
              </svg>
              {idx !== null && (
                <ChartTooltip x={xOf(num(spots[idx]!))} width={width} testId={testId ? `${testId}-tip` : undefined}>
                  <b>{text.plain(spots[idx]!)}</b>
                  <dl>
                    <div><dt>{W.atExpiry}</dt><dd className={`pu-pay-res ${outcomeOf(values[idx]!)}`}>{resultText(values[idx]!)}</dd></div>
                    {todayBy.has(spots[idx]!) && <div><dt>{W.today}</dt><dd>{signed(todayBy.get(spots[idx]!)!)}</dd></div>}
                  </dl>
                </ChartTooltip>
              )}
            </div>
          </div>
        );
      }}
    </ChartA11yShell>
  );
}
