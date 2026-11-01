// The simulated market every app runs on: a fixed list of synthetic NEPSE-style scrips and a deterministic, seeded
// tick generator. Pure TypeScript (no React, no clock, no network): the same seed and the same number of steps give
// the same prices on the server and in the browser, so a prerendered page hydrates without a mismatch and a test can
// replay any moment. Money is bigint paisa; numbers appear only where a chart needs a number (rupees).
import type { Quote } from '@punji/ui/stock-table';
import type { BookLevel } from '@punji/ui/order-book';
import type { Candle } from '@punji/ui/candlestick-chart';

/** mulberry32: a tiny, fast, seedable generator. Returns the next state and a float in [0, 1). */
export function nextRandom(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [s, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
}

/** A stateful generator for one-off sequences (candles, books), seeded by a number. */
export function seeded(seed: number): () => number {
  let state = seed | 0;
  return () => {
    const [next, value] = nextRandom(state);
    state = next;
    return value;
  };
}

/** A stable 32-bit hash of a string, to seed per-symbol sequences. */
export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface Scrip {
  symbol: string;
  name: string;
  sector: string;
  /** Previous close, paisa. */
  previousClose: bigint;
  /** Listed shares, for the index weight. */
  listedShares: number;
  /** Typical shares traded per tick, for volume. */
  liquidity: number;
}

/** Synthetic scrips modelled on NEPSE sectors. Names and prices are invented. */
export const SCRIPS: readonly Scrip[] = [
  { symbol: 'NABIL', name: 'Nabil Bank', sector: 'Commercial banks', previousClose: 51_230n, listedShares: 270_572_411, liquidity: 900 },
  { symbol: 'NICA', name: 'NIC Asia Bank', sector: 'Commercial banks', previousClose: 49_810n, listedShares: 138_420_000, liquidity: 700 },
  { symbol: 'GBIME', name: 'Global IME Bank', sector: 'Commercial banks', previousClose: 22_460n, listedShares: 356_100_000, liquidity: 1_400 },
  { symbol: 'SBL', name: 'Siddhartha Bank', sector: 'Commercial banks', previousClose: 33_120n, listedShares: 140_900_000, liquidity: 600 },
  { symbol: 'NTC', name: 'Nepal Telecom', sector: 'Others', previousClose: 84_200n, listedShares: 180_000_000, liquidity: 300 },
  { symbol: 'UPPER', name: 'Upper Tamakoshi Hydropower', sector: 'Hydropower', previousClose: 39_890n, listedShares: 105_900_000, liquidity: 1_800 },
  { symbol: 'CHCL', name: 'Chilime Hydropower', sector: 'Hydropower', previousClose: 61_230n, listedShares: 72_100_000, liquidity: 800 },
  { symbol: 'API', name: 'Api Power Company', sector: 'Hydropower', previousClose: 28_740n, listedShares: 54_300_000, liquidity: 1_500 },
  { symbol: 'NLIC', name: 'Nepal Life Insurance', sector: 'Life insurance', previousClose: 74_500n, listedShares: 68_400_000, liquidity: 400 },
  { symbol: 'LICN', name: 'Life Insurance Corp. Nepal', sector: 'Life insurance', previousClose: 128_800n, listedShares: 30_200_000, liquidity: 200 },
  { symbol: 'HDL', name: 'Himalayan Distillery', sector: 'Manufacturing', previousClose: 215_000n, listedShares: 8_100_000, liquidity: 60 },
  { symbol: 'SHIVM', name: 'Shivam Cements', sector: 'Manufacturing', previousClose: 58_950n, listedShares: 37_800_000, liquidity: 500 },
  { symbol: 'CIT', name: 'Citizen Investment Trust', sector: 'Investment', previousClose: 241_500n, listedShares: 45_600_000, liquidity: 90 },
  { symbol: 'HRL', name: 'Himalayan Reinsurance', sector: 'Non-life insurance', previousClose: 82_300n, listedShares: 100_000_000, liquidity: 700 },
  { symbol: 'NIFRA', name: 'Nepal Infrastructure Bank', sector: 'Investment', previousClose: 26_380n, listedShares: 216_300_000, liquidity: 2_100 },
  { symbol: 'SONA', name: 'Sonapur Minerals and Oil', sector: 'Manufacturing', previousClose: 47_210n, listedShares: 15_000_000, liquidity: 650 },
];

export const scripBySymbol = (symbol: string): Scrip | undefined => SCRIPS.find((s) => s.symbol === symbol);

/** NEPSE's price step: Rs 0.10. */
export const TICK = 10n;
/** NEPSE's regular lot: 10 units. */
export const LOT = 10n;
/** The daily band around the previous close used here: ±10%. */
export const BAND_RATE = '0.10';
/** The band on the tick grid: the lower limit rounds up to a tick and the upper rounds down, so both are tradable prices. */
export const bandOf = (previousClose: bigint) => {
  const lower = (previousClose * 90n + 99n) / 100n;
  const upper = (previousClose * 110n) / 100n;
  return { lower: ((lower + TICK - 1n) / TICK) * TICK, upper: (upper / TICK) * TICK };
};

/** The simulated session starts at 12:00 on Sunday 1 November 2026, Kathmandu time (06:15 UTC). */
export const SESSION_START = Date.UTC(2026, 10, 1, 6, 15, 0);
/** Simulated seconds per tick. */
export const TICK_SECONDS = 5;
/** The trading day as Gregorian `YYYY-MM-DD` (for issue statuses and timelines). */
export const SESSION_DATE = '2026-11-01';
/** Points of the intraday path kept per symbol for the trend line. */
const PATH = 48;
/** Steps run before the first render, so the screen opens on a morning that has already traded. */
const WARM_UP = 72;

export interface LiveQuote extends Quote {
  sector: string;
  name: string;
  ltp: bigint;
  previousClose: bigint;
  volume: number;
  turnover: bigint;
  open: bigint;
  high: bigint;
  low: bigint;
  lowerLimit: bigint;
  upperLimit: bigint;
  /** Intraday LTPs in rupees, oldest first (for the trend line and the intraday candle). */
  history: number[];
  /** Trades today. */
  trades: number;
}

export interface MarketHalt {
  kind: 'circuit-breaker' | 'resumed';
  /** The index move that tripped it, percent. */
  changePercent: number;
  /** The tick trading resumes on (circuit breaker), or the tick it resumed on. */
  untilTick: number;
}

export interface MarketState {
  seed: number;
  tick: number;
  quotes: LiveQuote[];
  halt: MarketHalt | null;
}

const rupees = (paisa: bigint) => Number(paisa) / 100;
const clampBig = (value: bigint, lo: bigint, hi: bigint) => (value < lo ? lo : value > hi ? hi : value);

/** The opening state for a seed: every scrip at its previous close, then a warm-up so the morning has traded. */
export function createMarket(seed = 20_261_101): MarketState {
  let state: MarketState = {
    seed,
    tick: 0,
    halt: null,
    quotes: SCRIPS.map((s) => {
      const band = bandOf(s.previousClose);
      return {
        symbol: s.symbol,
        name: s.name,
        sector: s.sector,
        ltp: s.previousClose,
        previousClose: s.previousClose,
        volume: 0,
        turnover: 0n,
        open: s.previousClose,
        high: s.previousClose,
        low: s.previousClose,
        lowerLimit: band.lower,
        upperLimit: band.upper,
        history: [rupees(s.previousClose)],
        trades: 0,
      };
    }),
  };
  for (let i = 0; i < WARM_UP; i += 1) state = stepMarket(state);
  return { ...state, tick: 0 };
}

/**
 * One tick: about a third of the scrips trade, each moving a few price steps with a slight per-symbol drift, inside
 * the circuit band. Volume and turnover grow with each trade (turnover = units × price, exact). A halted market
 * does not move; the halt lifts on its own at `untilTick`.
 */
export function stepMarket(state: MarketState): MarketState {
  let rng = state.seed;
  const draw = () => {
    const [next, value] = nextRandom(rng);
    rng = next;
    return value;
  };
  const tick = state.tick + 1;
  let halt = state.halt;
  if (halt?.kind === 'circuit-breaker' && tick >= halt.untilTick) halt = { kind: 'resumed', changePercent: halt.changePercent, untilTick: tick };
  if (halt?.kind === 'circuit-breaker') return { ...state, tick, halt, seed: rng };
  const quotes = state.quotes.map((q) => {
    if (draw() > 0.38) return q;
    const scrip = scripBySymbol(q.symbol)!;
    const drift = ((hashString(q.symbol) % 7) - 3) * 0.04;
    const size = 1 + Math.floor(draw() * 6);
    const direction = draw() + drift * 0.1 < 0.5 ? -1n : 1n;
    const ltp = clampBig(q.ltp + direction * BigInt(size) * TICK, q.lowerLimit, q.upperLimit);
    const units = Math.max(10, Math.round((scrip.liquidity * (0.4 + draw() * 1.2)) / 10) * 10);
    const history = [...q.history, rupees(ltp)];
    return {
      ...q,
      ltp,
      high: ltp > q.high ? ltp : q.high,
      low: ltp < q.low ? ltp : q.low,
      volume: q.volume + units,
      turnover: q.turnover + BigInt(units) * ltp,
      history: history.length > PATH ? history.slice(-PATH) : history,
      trades: q.trades + 1 + Math.floor(draw() * 4),
    };
  });
  return { seed: rng, tick, quotes, halt };
}

/**
 * A shock for the demo: every scrip is marked down to 95.7% of its previous close (on the tick grid, inside its
 * band), so the index stands about 4.3% down and trips the first circuit-breaker stage. Trading pauses for
 * `haltTicks` ticks.
 */
export function shockMarket(state: MarketState, haltTicks: number): MarketState {
  const quotes = state.quotes.map((q) => {
    const target = (q.previousClose * 957n) / 1000n;
    const ltp = clampBig((target / TICK) * TICK, q.lowerLimit, q.upperLimit);
    return { ...q, ltp, low: ltp < q.low ? ltp : q.low, history: [...q.history.slice(1 - PATH), rupees(ltp)] };
  });
  return { ...state, quotes, halt: { kind: 'circuit-breaker', changePercent: indexOf(quotes).changePercent, untilTick: state.tick + haltTicks } };
}

/** Lift a halt now (the exchange reopened early, or the demo wants to move on). */
export function resumeMarket(state: MarketState): MarketState {
  if (state.halt?.kind !== 'circuit-breaker') return state;
  return { ...state, halt: { kind: 'resumed', changePercent: state.halt.changePercent, untilTick: state.tick } };
}

export interface IndexSnapshot {
  /** Index points. */
  value: number;
  previous: number;
  change: number;
  changePercent: number;
  turnover: bigint;
  volume: number;
  advances: number;
  declines: number;
  unchanged: number;
}

const INDEX_BASE = 2_684.37;

/** A capitalisation-weighted index over the scrips, based at INDEX_BASE on the previous closes. */
export function indexOf(quotes: readonly LiveQuote[]): IndexSnapshot {
  let now = 0;
  let before = 0;
  let turnover = 0n;
  let volume = 0;
  let advances = 0;
  let declines = 0;
  for (const q of quotes) {
    const shares = scripBySymbol(q.symbol)?.listedShares ?? 0;
    now += shares * rupees(q.ltp);
    before += shares * rupees(q.previousClose);
    turnover += q.turnover;
    volume += q.volume;
    if (q.ltp > q.previousClose) advances += 1;
    else if (q.ltp < q.previousClose) declines += 1;
  }
  const value = before > 0 ? (INDEX_BASE * now) / before : INDEX_BASE;
  const change = value - INDEX_BASE;
  return { value, previous: INDEX_BASE, change, changePercent: (change / INDEX_BASE) * 100, turnover, volume, advances, declines, unchanged: quotes.length - advances - declines };
}

/** The simulated wall clock at a tick. */
export const clockAt = (tick: number): Date => new Date(SESSION_START + tick * TICK_SECONDS * 1000);

const pad = (n: number) => String(n).padStart(2, '0');

/** "12:04:35" on the Kathmandu clock, without reading the host time zone (UTC + 5:45). */
export function timeAt(tick: number): string {
  const d = new Date(clockAt(tick).getTime() + (5 * 60 + 45) * 60_000);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** The order book around a quote: best first on both sides, a spread of one or two steps, sizes seeded by symbol and tick. */
export function bookFor(quote: Pick<LiveQuote, 'symbol' | 'ltp' | 'lowerLimit' | 'upperLimit'>, tick: number, levels = 10): { bids: BookLevel[]; asks: BookLevel[] } {
  const random = seeded(hashString(quote.symbol) ^ (tick * 2_654_435_761));
  const scrip = scripBySymbol(quote.symbol);
  const base = Math.max(20, (scrip?.liquidity ?? 500) / 2);
  const gap = random() < 0.5 ? 1n : 2n;
  const bids: BookLevel[] = [];
  const asks: BookLevel[] = [];
  for (let i = 0; i < levels; i += 1) {
    const bid = quote.ltp - TICK * BigInt(i);
    const ask = quote.ltp + TICK * (BigInt(i) + gap);
    const size = (k: number) => Math.round((base * (0.5 + random() * 2) * (1 + k * 0.25)) / 10) * 10;
    if (bid >= quote.lowerLimit) bids.push({ price: rupees(bid), quantity: size(i) });
    if (ask <= quote.upperLimit) asks.push({ price: rupees(ask), quantity: size(i) });
  }
  return { bids, asks };
}

/**
 * Daily candles ending at the previous close: a seeded walk backwards from it, so the chart's last close is exactly
 * the close the quote says. `today` adds the live session as the last candle.
 */
export function dailyCandles(scrip: Scrip, sessions: number, today?: Pick<LiveQuote, 'open' | 'high' | 'low' | 'ltp' | 'volume'>): Candle[] {
  const random = seeded(hashString(`${scrip.symbol}-daily`));
  const out: Candle[] = [];
  let close = rupees(scrip.previousClose);
  // Trading days before 2026-11-01 (NEPSE trades Sunday to Thursday), newest first.
  let day = Date.UTC(2026, 9, 29);
  for (let i = 0; i < sessions; i += 1) {
    while ([5, 6].includes(new Date(day).getUTCDay())) day -= 86_400_000;
    const move = (random() - 0.48) * 0.035;
    const open = Math.round(close / (1 + move) * 10) / 10;
    const high = Math.round(Math.max(open, close) * (1 + random() * 0.012) * 10) / 10;
    const low = Math.round(Math.min(open, close) * (1 - random() * 0.012) * 10) / 10;
    out.push({ date: new Date(day).toISOString().slice(0, 10), open, high, low, close, volume: Math.round(scrip.liquidity * (40 + random() * 80)) });
    close = open;
    day -= 86_400_000;
  }
  out.reverse();
  if (today) out.push({ date: SESSION_DATE, open: rupees(today.open), high: rupees(today.high), low: rupees(today.low), close: rupees(today.ltp), volume: today.volume });
  return out;
}
