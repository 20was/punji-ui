/**
 * Corporate actions in exact arithmetic: bonus and right entitlements, the price adjusted after a book close, the
 * weighted average cost (WACC) of a holding through buys, bonus, right and sales, and a book-close/AGM timeline.
 * Money is bigint minor units (paisa); units are bigint; percentages are decimal strings ('12.5' is 12.5%), never
 * floats. Every step that can leave a fraction takes an explicit RoundingMode.
 */
import { divideRounded, type RoundingMode } from '../calculations/rounding.ts';
import { daysBetween, isoDayNumber } from './issues.ts';

/** A bonus or right entitlement: a percent string ('30' is 30%, so 10 units held earn 3) or a ratio of units offered per units held ({ offered: 1n, held: 2n } is one for every two). */
export type Entitlement = string | { offered: bigint; held: bigint };

/** An exact fraction. */
export interface Fraction { numerator: bigint; denominator: bigint }

/** The entitlement as an exact fraction of the units held. Throws on a malformed percent or a ratio with held <= 0. */
export function entitlementFraction(entitlement: Entitlement): Fraction {
  if (typeof entitlement === 'string') {
    if (entitlement.length > 30 || !/^\d+(?:\.\d{1,12})?$/.test(entitlement)) throw new RangeError(`Expected a percent such as "12.5": ${entitlement}`);
    const [whole, fraction = ''] = entitlement.split('.');
    const scale = 10n ** BigInt(fraction.length);
    return { numerator: BigInt(whole!) * scale + BigInt(fraction || '0'), denominator: scale * 100n };
  }
  if (entitlement.held <= 0n || entitlement.offered < 0n) throw new RangeError('A ratio needs held > 0 and offered >= 0');
  return { numerator: entitlement.offered, denominator: entitlement.held };
}

/** Units earned on `quantity` held. Default rounding is 'floor': fractional units are not issued. */
export function entitledUnits(quantity: bigint, entitlement: Entitlement, rounding: RoundingMode = 'floor'): bigint {
  if (quantity < 0n) throw new RangeError('Quantity must not be negative');
  const { numerator, denominator } = entitlementFraction(entitlement);
  return divideRounded(quantity * numerator, denominator, rounding);
}

export interface AdjustedPriceInput {
  /** The closing price on the last day before the book close, in minor units. */
  price: bigint;
  /** Bonus entitlement ('10' is 10%). */
  bonus?: Entitlement;
  /** Right entitlement ('50' is 50%, or { offered: 1n, held: 2n }). */
  right?: Entitlement;
  /** Price paid per right unit, in minor units. Default `10000n` (Rs 100, par). */
  rightPrice?: bigint;
  /** Cash dividend per unit to deduct, in minor units. Default `0n`: the bonus-and-right formula only. Pass it only if your rule deducts cash. */
  cashDividend?: bigint;
  /** How the result is rounded to a minor unit. Default 'half-even'. */
  rounding?: RoundingMode;
}

/**
 * The price adjusted after a book close: `(price - cash + right% × rightPrice) / (1 + bonus% + right%)`, exact
 * until the one final rounding. With only a bonus it is `price / (1 + bonus%)`; with only a right it is
 * `(price + right% × rightPrice) / (1 + right%)`.
 */
export function adjustedPrice(input: AdjustedPriceInput): bigint {
  const { price, rightPrice = 10_000n, cashDividend = 0n, rounding = 'half-even' } = input;
  if (price < 0n || rightPrice < 0n || cashDividend < 0n) throw new RangeError('Prices and dividend must not be negative');
  const b = input.bonus === undefined ? { numerator: 0n, denominator: 1n } : entitlementFraction(input.bonus);
  const r = input.right === undefined ? { numerator: 0n, denominator: 1n } : entitlementFraction(input.right);
  const scale = b.denominator * r.denominator;
  const numerator = (price - cashDividend) * scale + r.numerator * b.denominator * rightPrice;
  const denominator = scale + b.numerator * r.denominator + r.numerator * b.denominator;
  return divideRounded(numerator, denominator, rounding);
}

/** Average cost of one unit, or null with no units. */
export function wacc(cost: bigint, quantity: bigint, rounding: RoundingMode = 'half-even'): bigint | null {
  return quantity > 0n ? divideRounded(cost, quantity, rounding) : null;
}

/** One event in a holding's history. Amounts are minor units. */
export type CostAction =
  | { kind: 'buy'; id?: string; date?: string; quantity: bigint; /** Total paid, fees included. */ amount: bigint }
  | { kind: 'sell'; id?: string; date?: string; quantity: bigint }
  | { kind: 'bonus'; id?: string; date?: string; entitlement: Entitlement; /** Cost given to each bonus unit. Default `0n`; some tax computations use par (`10000n`). */ unitCost?: bigint }
  | { kind: 'right'; id?: string; date?: string; entitlement: Entitlement; /** Price paid per right unit. */ price: bigint; /** Units actually subscribed. Default: the full entitlement. */ subscribed?: bigint };

export interface CostStep {
  action: CostAction;
  /** Units this step added (negative for a sale). */
  units: bigint;
  /** Cost this step added (negative for a sale: the average cost of the units sold). */
  cost: bigint;
  /** Units held after the step. */
  quantity: bigint;
  /** Total cost after the step. */
  totalCost: bigint;
  /** Average cost per unit after the step, null with no units. */
  wacc: bigint | null;
}

export interface CostOptions {
  /** Rounding of entitled bonus and right units. Default 'floor'. */
  unitRounding?: RoundingMode;
  /** Rounding of WACC and of the cost removed by a sale. Default 'half-even'. */
  priceRounding?: RoundingMode;
}

export interface CostPosition { quantity: bigint; cost: bigint }

/**
 * Walks a holding through buys, sales, bonus and right issues in the order given (average-cost method). A bonus adds
 * units at `unitCost` (default zero), so WACC falls; a right adds the units subscribed at their price. A sale removes
 * the average cost of the units sold. Throws on a sale larger than the holding or negative amounts.
 */
export function costBasisSteps(start: CostPosition, actions: readonly CostAction[], options: CostOptions = {}): CostStep[] {
  const { unitRounding = 'floor', priceRounding = 'half-even' } = options;
  if (start.quantity < 0n || start.cost < 0n) throw new RangeError('Starting quantity and cost must not be negative');
  let quantity = start.quantity, totalCost = start.cost;
  return actions.map((action) => {
    let units: bigint, cost: bigint;
    switch (action.kind) {
      case 'buy':
        if (action.quantity <= 0n || action.amount < 0n) throw new RangeError('A buy needs quantity > 0 and amount >= 0');
        units = action.quantity; cost = action.amount; break;
      case 'sell':
        if (action.quantity <= 0n || action.quantity > quantity) throw new RangeError('A sale must be more than zero and no more than the units held');
        units = -action.quantity;
        cost = action.quantity === quantity ? -totalCost : -divideRounded(totalCost * action.quantity, quantity, priceRounding);
        break;
      case 'bonus': {
        const unitCost = action.unitCost ?? 0n;
        if (unitCost < 0n) throw new RangeError('Bonus unit cost must not be negative');
        units = entitledUnits(quantity, action.entitlement, unitRounding); cost = units * unitCost; break;
      }
      case 'right':
        if (action.price < 0n || (action.subscribed !== undefined && action.subscribed < 0n)) throw new RangeError('Right price and units must not be negative');
        units = action.subscribed ?? entitledUnits(quantity, action.entitlement, unitRounding); cost = units * action.price; break;
    }
    quantity += units; totalCost += cost;
    return { action, units, cost, quantity, totalCost, wacc: wacc(totalCost, quantity, priceRounding) };
  });
}

/** The position after every action: quantity, total cost and WACC. */
export function costBasisAfter(start: CostPosition, actions: readonly CostAction[], options: CostOptions = {}): { quantity: bigint; cost: bigint; wacc: bigint | null } {
  const steps = costBasisSteps(start, actions, options);
  const last = steps[steps.length - 1];
  const quantity = last ? last.quantity : start.quantity, cost = last ? last.totalCost : start.cost;
  return { quantity, cost, wacc: wacc(cost, quantity, options.priceRounding ?? 'half-even') };
}

export type CorporateEventKind = 'announcement' | 'agm' | 'book-close' | 'right-open' | 'right-close' | 'listing' | 'distribution' | 'other';

export const CORPORATE_EVENT_LABELS: Readonly<Record<CorporateEventKind, string>> = Object.freeze({
  announcement: 'Announced', agm: 'AGM', 'book-close': 'Book close', 'right-open': 'Right issue opens', 'right-close': 'Right issue closes',
  listing: 'Listed', distribution: 'Credited', other: 'Event',
});

export interface CorporateEvent {
  /** Stable unique id (the row key). */
  id: string;
  kind: CorporateEventKind;
  /** Gregorian `YYYY-MM-DD`. */
  date: string;
  /** Replaces the kind's default label ("Book close for 10% bonus"). */
  label?: string;
  /** A line under the label. Plain text. */
  detail?: string;
}

export type CorporateEventPhase = 'past' | 'today' | 'upcoming';

export interface TimelineEvent extends CorporateEvent {
  phase: CorporateEventPhase;
  /** Whole days from `today` to the event (negative in the past). */
  days: number;
  /** True on the first event that is today or later: the one to look at next. */
  next: boolean;
}

/** Events in date order (equal dates keep input order), each with its phase on `today` and the next one marked. Throws on a malformed date or duplicate id. */
export function corporateTimeline(events: readonly CorporateEvent[], today: string): TimelineEvent[] {
  const ids = new Set<string>();
  for (const e of events) {
    if (ids.has(e.id)) throw new RangeError(`Duplicate event id: ${e.id}`);
    ids.add(e.id);
  }
  isoDayNumber(today);
  const sorted = events.map((event, index) => ({ event, index, day: isoDayNumber(event.date) })).toSorted((a, b) => a.day - b.day || a.index - b.index);
  let marked = false;
  return sorted.map(({ event }) => {
    const days = daysBetween(today, event.date);
    const next = !marked && days >= 0;
    if (next) marked = true;
    return { ...event, days, phase: days < 0 ? 'past' : days === 0 ? 'today' : 'upcoming', next };
  });
}
