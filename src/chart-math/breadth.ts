/**
 * Breadth lines as pure helpers: the advance-decline line (a running total of advances minus declines) and the share
 * of constituents trading above their N-day simple moving average. Counts are whole numbers; prices are decimal
 * strings compared as scaled bigint (a close is above its average when `close * N > sum of the last N closes`, so no
 * division and no rounding decides it), and the share is printed as a decimal string rounded half up.
 *
 * Definitions: the advance-decline line is the cumulative sum of (advances - declines) per day, unchanged issues
 * adding nothing (the textbook definition; no primary source was fetched for it, and the research note marks breadth
 * lines as unverified [U]). The percent above a moving average is the share of constituents whose close is above their own simple
 * moving average of the same length, counted only over constituents that have that many closes by the date.
 */

/** One day's counts. `unchanged` is not needed to draw the line. Same fields as `Breadth` of `MarketBreadth`. */
export interface BreadthDay {
  /** "YYYY-MM-DD". Oldest first. */
  date: string;
  /** Stocks that rose, or the word for it. */
  advances: number;
  /** Stocks that fell, or the word for it. */
  declines: number;
  /** Stocks that did not change, or the word for "no change". */
  unchanged?: number;
}

export interface AdvanceDeclinePoint {
  /** The date ("YYYY-MM-DD"), or the head of the date column. */
  date: string;
  /** Stocks that rose, or the word for it. */
  advances: number;
  /** Stocks that fell, or the word for it. */
  declines: number;
  /** advances - declines for the day. */
  net: number;
  /** The running total up to and including this day. */
  line: number;
}

const whole = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/**
 * The advance-decline line: each day's net (advances minus declines) added to a running total that starts at `start`
 * (default 0). A count that is missing, negative or not a number counts as zero, as `MarketBreadth` does.
 *
 * @stability beta
 */
export function advanceDeclineLine(days: readonly BreadthDay[], options: { start?: number } = {}): AdvanceDeclinePoint[] {
  let line = options.start ?? 0;
  return days.map((d) => {
    const advances = whole(d.advances);
    const declines = whole(d.declines);
    const net = advances - declines;
    line += net;
    return { date: d.date, advances, declines, net, line };
  });
}

/** One constituent's closes, oldest first. */
export interface BreadthConstituent {
  /** Stable id of the constituent. */
  id: string;
  /** Its closes by date, oldest first. */
  closes: readonly { date: string; close: string }[];
}

export interface PercentAboveMAPoint {
  /** The date ("YYYY-MM-DD"), or the head of the date column. */
  date: string;
  /** Constituents whose close is above their own moving average on this date. */
  above: number;
  /** Constituents with a full moving average and a close on this date. */
  eligible: number;
  /** above / eligible as a percentage with `decimals` decimals ("62.5"), or null when none is eligible yet. */
  percent: string | null;
}

const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

/**
 * The share of constituents above their `period`-day simple moving average, for every date any of them has a close.
 * A constituent counts from its `period`-th close on; a close that is not a non-negative decimal string throws a RangeError.
 * The share is `above * 100 / eligible` rounded half up to `decimals` (default 1).
 *
 * @stability beta
 */
export function percentAboveMA(constituents: readonly BreadthConstituent[], options: { period: number; decimals?: number }): PercentAboveMAPoint[] {
  const { period } = options;
  const decimals = options.decimals ?? 1;
  if (!Number.isInteger(period) || period < 1) throw new RangeError('period must be a whole number of at least 1');
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) throw new RangeError('decimals must be a whole number from 0 to 6');
  const dates = new Set<string>();
  const tally = new Map<string, { above: number; eligible: number }>();
  const n = BigInt(period);
  for (const c of constituents) {
    const sorted = c.closes.toSorted((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const scale = Math.max(0, ...sorted.map((p) => DECIMAL.exec(p.close)?.[2]?.length ?? 0));
    const values = sorted.map((p) => {
      const m = DECIMAL.exec(p.close);
      if (!m) throw new RangeError(`${c.id}, ${p.date}: close must be a non-negative decimal string, got ${p.close}`);
      return BigInt(`${m[1]}${(m[2] ?? '').padEnd(scale, '0')}`);
    });
    let sum = 0n;
    sorted.forEach((p, i) => {
      dates.add(p.date);
      sum += values[i]!;
      if (i >= period) sum -= values[i - period]!;
      const t = tally.get(p.date) ?? { above: 0, eligible: 0 };
      if (i >= period - 1) {
        t.eligible += 1;
        if (values[i]! * n > sum) t.above += 1;
      }
      tally.set(p.date, t);
    });
  }
  const unit = 10n ** BigInt(decimals);
  return [...dates].toSorted().map((date) => {
    const { above, eligible } = tally.get(date) ?? { above: 0, eligible: 0 };
    if (eligible === 0) return { date, above, eligible, percent: null };
    const scaled = (BigInt(above) * 100n * unit * 2n + BigInt(eligible)) / (BigInt(eligible) * 2n);
    const digits = scaled.toString().padStart(decimals + 1, '0');
    const cut = digits.length - decimals;
    return { date, above, eligible, percent: decimals > 0 ? `${digits.slice(0, cut)}.${digits.slice(cut)}` : digits };
  });
}
