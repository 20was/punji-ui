/**
 * Technical indicators as pure functions: numbers in, numbers out, one value per input and `null` where the
 * indicator has not warmed up or an input is missing (never zero). No React, no DOM. Kept in their own module so a
 * chart that draws no indicator does not carry them.
 *
 *   rsi        Relative Strength Index, Wilder's smoothing (default 14)
 *   macd       Moving Average Convergence Divergence: EMA(fast) - EMA(slow), a signal EMA of it, and the histogram (12, 26, 9)
 *   bollinger  Bollinger Bands: a simple average and bands `mult` population standard deviations either side (20, 2)
 *   vwap       volume-weighted average price of the typical price, from the first candle
 *
 * Reference values the tests pin: StockCharts' published RSI worksheet (first RSI 70.53 at index 14), the MACD of a
 * straight line (steady state is exactly (slow - fast) / 2 times the slope), Bollinger on 1..20 (mean 10.5,
 * deviation sqrt((20^2 - 1) / 12)), and a hand-worked VWAP.
 */
import { ema, sma } from './chartMath.ts';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Relative Strength Index with Wilder's smoothing. The first average gain and loss are the plain means of the first
 * `period` changes (so the first value is at index `period`); after that each is (previous x (period - 1) +
 * current) / period. RSI = 100 - 100 / (1 + averageGain / averageLoss); no losses at all is 100, and no movement
 * at all is 50. A missing close gives `null` there and the next change is measured from the last real close.
 *
 * @stability beta
 */
export function rsi(closes: readonly (number | null | undefined)[], period = 14): (number | null)[] {
  const w = Math.max(1, Math.floor(isNum(period) ? period : 14));
  const out: (number | null)[] = Array.from({ length: closes.length }, () => null);
  let prev: number | null = null;
  let seen = 0;
  let gain = 0;
  let loss = 0;
  for (let i = 0; i < closes.length; i += 1) {
    const v = closes[i];
    if (!isNum(v)) continue;
    if (prev !== null) {
      const change = v - prev;
      const g = Math.max(0, change);
      const l = Math.max(0, -change);
      if (seen < w) {
        gain += g;
        loss += l;
        seen += 1;
        if (seen === w) {
          gain /= w;
          loss /= w;
          out[i] = rsiOf(gain, loss);
        }
      } else {
        gain = (gain * (w - 1) + g) / w;
        loss = (loss * (w - 1) + l) / w;
        out[i] = rsiOf(gain, loss);
      }
    }
    prev = v;
  }
  return out;
}

const rsiOf = (gain: number, loss: number): number => (loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss));

export interface MacdResult {
  /** EMA(fast) - EMA(slow). Null until the slow EMA exists. */
  macd: (number | null)[];
  /** EMA of the MACD line over `signal` values, seeded with their mean. */
  signal: (number | null)[];
  /** macd - signal. */
  histogram: (number | null)[];
}

/**
 * MACD: the fast EMA minus the slow EMA of the closes, its signal line (an EMA of the MACD values) and the
 * histogram between them. The EMAs are seeded with the mean of their first values (see `ema`), which is the
 * convention StockCharts and TradingView use.
 *
 * @stability beta
 */
export function macd(closes: readonly (number | null | undefined)[], fast = 12, slow = 26, signal = 9): MacdResult {
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const line = closes.map((_, i) => {
    const f = fastEma[i];
    const s = slowEma[i];
    return isNum(f) && isNum(s) ? f - s : null;
  });
  const sig = ema(line, signal);
  return { macd: line, signal: sig, histogram: line.map((m, i) => (isNum(m) && isNum(sig[i]) ? m - (sig[i] as number) : null)) };
}

export interface BollingerResult {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

/**
 * Bollinger Bands: the simple average of `period` closes, and bands `mult` standard deviations above and below it.
 * The deviation is the population one (divide by `period`), as Bollinger defines it and TradingView draws it.
 * Null where fewer than `period` closes exist or one of them is missing.
 *
 * @stability beta
 */
export function bollinger(closes: readonly (number | null | undefined)[], period = 20, mult = 2): BollingerResult {
  const w = Math.max(1, Math.floor(isNum(period) ? period : 20));
  const k = isNum(mult) ? mult : 2;
  const middle = sma(closes, w);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  middle.forEach((m, i) => {
    if (m === null) {
      upper.push(null);
      lower.push(null);
      return;
    }
    let sum = 0;
    for (let j = i - w + 1; j <= i; j += 1) sum += ((closes[j] as number) - m) ** 2;
    const sd = Math.sqrt(sum / w);
    upper.push(m + k * sd);
    lower.push(m - k * sd);
  });
  return { middle, upper, lower };
}

export interface VwapInput {
  high: number;
  low: number;
  close: number;
  volume?: number | null;
}

/**
 * Volume-weighted average price from the first candle: the running sum of typical price x volume over the running
 * volume, where the typical price is (high + low + close) / 3. A candle with no volume adds nothing; the value is
 * `null` until some volume has traded.
 *
 * @stability beta
 */
export function vwap(candles: readonly VwapInput[]): (number | null)[] {
  let pv = 0;
  let v = 0;
  return candles.map((c) => {
    if (isNum(c.volume) && c.volume > 0 && isNum(c.high) && isNum(c.low) && isNum(c.close)) {
      pv += ((c.high + c.low + c.close) / 3) * c.volume;
      v += c.volume;
    }
    return v > 0 ? pv / v : null;
  });
}
