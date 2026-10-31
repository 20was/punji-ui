import { useMemo, useSyncExternalStore } from 'react';

/** One price update. Minor units (paisa, cents) as a bigint; `at` is the exchange timestamp in ms. */
export interface Tick {
  symbol: string;
  ltp: bigint;
  at: number;
}

/**
 * The adapter contract. Your transport (WebSocket, server-sent events, polling) sits behind it, so the
 * components never know how data arrives and a test can pass a fake feed.
 */
export interface QuoteFeed {
  subscribe(symbol: string, onTick: (tick: Tick) => void): () => void;
}

/** Parse one message and reject anything that is not exactly a tick. Network data is untrusted input. */
export function parseTick(raw: unknown): Tick | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { symbol, ltp, at } = raw as Record<string, unknown>;
  if (typeof symbol !== 'string' || !/^[A-Z0-9]{1,12}$/.test(symbol)) return null;
  if (typeof ltp !== 'string' || !/^\d{1,15}$/.test(ltp)) return null; // minor units travel as strings, JSON has no bigint
  if (typeof at !== 'number' || !Number.isFinite(at)) return null;
  return { symbol, ltp: BigInt(ltp), at };
}

/** A WebSocket adapter. Reconnection, back-off and auth belong here, not in a component. */
export function createSocketFeed(url: string): QuoteFeed {
  return {
    subscribe(symbol, onTick) {
      const socket = new WebSocket(url);
      socket.addEventListener('open', () => socket.send(JSON.stringify({ subscribe: symbol })));
      socket.addEventListener('message', (event: MessageEvent<string>) => {
        let tick: Tick | null = null;
        try {
          tick = parseTick(JSON.parse(event.data));
        } catch {
          // A malformed frame is dropped, never rendered.
        }
        if (tick && tick.symbol === symbol) onTick(tick);
      });
      return () => socket.close();
    },
  };
}

/** A tiny external store for one symbol: the latest tick, and a subscription that keeps it current. */
function createTickStore(feed: QuoteFeed, symbol: string) {
  let last: Tick | null = null;
  return {
    subscribe: (notify: () => void) =>
      feed.subscribe(symbol, (tick) => {
        last = tick;
        notify();
      }),
    get: () => last,
  };
}

/** The latest tick for a symbol, or null before the first one. The server render and hydration see null. */
export function useLastTick(feed: QuoteFeed, symbol: string): Tick | null {
  const store = useMemo(() => createTickStore(feed, symbol), [feed, symbol]);
  return useSyncExternalStore(store.subscribe, store.get, () => null);
}
