/**
 * Analytic ratios for display: returns, yields, growth and weights. Results
 * are floating-point numbers in percent units (5 means 5%, matching
 * formatPercent), or null when the ratio is undefined. They are never ledger
 * values; keep money exact with minor units and the position functions.
 */
type Amount = number | bigint;

const finite = (value: Amount): number | null => {
  const number = typeof value === 'bigint' ? Number(value) : value;
  return Number.isFinite(number) ? number : null;
};

export interface Change<T extends Amount> { absolute: T; percent: number | null }

/**
 * `(current − previous) / previous` in percent. Null when the base is zero,
 * negative or not finite: a percentage against such a base misleads, so show
 * the absolute change instead.
 */
export function percentageChange(current: Amount, previous: Amount): number | null {
  const base = finite(previous);
  if (base === null || base <= 0 || finite(current) === null) return null;
  const difference = typeof current === 'bigint' && typeof previous === 'bigint' ? Number(current - previous) : Number(current) - Number(previous);
  return (difference / base) * 100;
}

/** Absolute and percentage change together. Bigint inputs keep the absolute change exact. */
export function priceChange(current: bigint, previous: bigint): Change<bigint>;
export function priceChange(current: number, previous: number): Change<number>;
export function priceChange(current: Amount, previous: Amount): Change<Amount> {
  const absolute = typeof current === 'bigint' && typeof previous === 'bigint' ? current - previous : Number(current) - Number(previous);
  return { absolute, percent: percentageChange(current, previous) };
}

/** `gain / cost` in percent; null when cost is not positive. */
export function returnOnCost(gain: Amount, cost: Amount): number | null {
  const base = finite(cost), top = finite(gain);
  if (base === null || top === null || base <= 0) return null;
  return (top / base) * 100;
}

/**
 * Compound annual growth rate in percent. Null unless start > 0, end ≥ 0 and
 * years > 0. An end value of zero is a −100% CAGR.
 */
export function cagr(start: Amount, end: Amount, years: number): number | null {
  const from = finite(start), to = finite(end);
  if (from === null || to === null || !Number.isFinite(years) || from <= 0 || to < 0 || years <= 0) return null;
  return ((to / from) ** (1 / years) - 1) * 100;
}

/** Trailing or forward annual dividend per share over price, in percent. Null unless price > 0 and dividend ≥ 0. */
export function dividendYield(annualDividendPerShare: Amount, price: Amount): number | null {
  const dividend = finite(annualDividendPerShare), base = finite(price);
  if (dividend === null || base === null || base <= 0 || dividend < 0) return null;
  return (dividend / base) * 100;
}

export interface Weighted { value: number; weight: number }

/** Σ(value × weight) / Σweight. Throws on negative or non-finite weights; null when total weight is zero. */
export function weightedAverage(entries: readonly Weighted[]): number | null {
  let total = 0, sum = 0;
  for (const { value, weight } of entries) {
    if (!Number.isFinite(weight) || weight < 0) throw new RangeError('Weights must be finite and non-negative');
    if (!Number.isFinite(value)) throw new RangeError('Values must be finite');
    total += weight;
    sum += value * weight;
  }
  return total === 0 ? null : sum / total;
}

export interface AllocationInput<K> { id: K; value: Amount }
export interface AllocationSlice<K> {
  id: K;
  value: Amount;
  /** Unrounded share in percent, or null when the total is zero. */
  percent: number | null;
  /** Share rounded to `decimals` by largest remainder, so display shares add up to exactly 100. */
  displayPercent: number | null;
}

/**
 * Share of each holding in the total. Display percentages use the largest
 * remainder method, so a pie legend never reads 99.99% or 100.01%. Ties go to
 * the earlier item. Values must be non-negative: net-short books need their
 * own exposure view.
 */
export function allocation<K>(items: readonly AllocationInput<K>[], options: { decimals?: number } = {}): AllocationSlice<K>[] {
  const decimals = options.decimals ?? 2;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) throw new RangeError('decimals must be 0–6');
  const exact = items.length > 0 && items.every(item => typeof item.value === 'bigint');
  for (const { value } of items) {
    if (typeof value === 'bigint' ? value < 0n : !Number.isFinite(value) || value < 0) throw new RangeError('Allocation values must be finite and non-negative');
  }
  const units = 100 * 10 ** decimals;
  // Each path yields floor shares in 1/10^decimals percent units and a comparator over remainders.
  let floors: number[], percents: number[], larger: (a: number, b: number) => number;
  if (exact) {
    const values = items.map(item => item.value as bigint);
    const total = values.reduce((sum, value) => sum + value, 0n);
    if (total === 0n) return items.map(item => ({ ...item, percent: null, displayPercent: null }));
    const scaled = values.map(value => value * BigInt(units));
    // Remainders share the denominator, so comparing them as bigints is exact.
    const remainders = scaled.map(value => value % total);
    floors = scaled.map(value => Number(value / total));
    percents = values.map(value => Number(value * 10n ** 12n / total) / 10 ** 10);
    larger = (a, b) => {
      const x = remainders[a] ?? 0n, y = remainders[b] ?? 0n;
      return x === y ? 0 : x > y ? -1 : 1;
    };
  } else {
    const values = items.map(item => Number(item.value));
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total === 0) return items.map(item => ({ ...item, percent: null, displayPercent: null }));
    const raw = values.map(value => (value / total) * units);
    floors = raw.map(Math.floor);
    percents = values.map(value => (value / total) * 100);
    larger = (a, b) => (raw[b]! - floors[b]!) - (raw[a]! - floors[a]!);
  }
  let leftover = units - floors.reduce((sum, value) => sum + value, 0);
  const ranked = items.map((_, index) => index).toSorted((a, b) => larger(a, b) || a - b);
  for (const index of ranked) {
    if (leftover <= 0) break;
    floors[index]! += 1;
    leftover -= 1;
  }
  return items.map((item, index) => ({ ...item, percent: percents[index]!, displayPercent: floors[index]! / 10 ** decimals }));
}
