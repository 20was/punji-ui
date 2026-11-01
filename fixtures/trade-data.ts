// Deterministic NEPSE-style floorsheet: synthetic trades for the large-table
// examples, the visual fixture and the benchmark. Not market data. The same
// seed and count always give the same trades (no Math.random, no clock).
import { holdings } from './market-data.ts';

export interface SampleTrade {
  /** Contract number, unique and stable. */
  id: string;
  /** Trade time on the session day, "HH:MM:SS" (Asia/Kathmandu, 11:00 to 15:00). */
  time: string;
  symbol: string;
  name: string;
  /** Buyer and seller broker numbers (1 to 90). */
  buyer: number;
  seller: number;
  quantity: number;
  /** Rate per unit in paisa (bigint minor units). */
  rate: bigint;
  /** quantity × rate, in paisa. */
  amount: bigint;
}

/** mulberry32: a small seeded generator, enough for sample data. */
function generator(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** `count` trades in time order across one four-hour session. */
export function sampleTrades(count: number, seed = 2082): SampleTrade[] {
  const next = generator(seed);
  const session = 4 * 60 * 60;
  return Array.from({ length: count }, (_, i) => {
    const stock = holdings[Math.floor(next() * holdings.length)]!;
    const second = Math.floor((i / Math.max(1, count)) * session);
    const drift = 1 + (next() - 0.5) * 0.04;
    const rate = BigInt(Math.round(stock.ltp * drift * 10)) * 10n;
    const quantity = 10 * (1 + Math.floor(next() * next() * 100));
    return {
      id: `2082${pad(i + 1, 7)}`,
      time: `${pad(11 + Math.floor(second / 3600))}:${pad(Math.floor(second / 60) % 60)}:${pad(second % 60)}`,
      symbol: stock.symbol,
      name: stock.name,
      buyer: 1 + Math.floor(next() * 90),
      seller: 1 + Math.floor(next() * 90),
      quantity,
      rate,
      amount: rate * BigInt(quantity),
    };
  });
}

/** A live tick: a new rate for one trade, deterministic from the tick number. */
export function tickTrade(trade: SampleTrade, tick: number): SampleTrade {
  const step = BigInt(((tick * 7919) % 21) - 10) * 10n;
  const rate = trade.rate + step > 100n ? trade.rate + step : trade.rate;
  return { ...trade, rate, amount: rate * BigInt(trade.quantity) };
}
