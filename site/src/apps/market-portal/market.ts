// The market portal's data: every listed company (the shared sim's 16 scrips plus generated ones), their fundamentals,
// a seeded session that writes a floorsheet as it trades, sector and NEPSE indices, daily history, dividends,
// corporate events and share issues. Pure TypeScript and deterministic: the same seed and the same number of ticks
// give the same market on the server and in the browser. Every figure on every screen is computed from here, so the
// volume on a quote is the sum of its floorsheet contracts and the P/E on the screener is the one on the company page.
import type { LiveQuote } from '../shared/sim.ts';
import { SCRIPS, TICK, bandOf, dailyCandles, hashString, nextRandom, seeded, type Scrip } from '../shared/sim.ts';
import type { Candle } from '@punji/ui/candlestick-chart';
import type { DividendEntry } from '@punji/ui/portfolio';
import type { CorporateEvent, ShareIssue } from '@punji/ui/share-issues';

export interface Company extends Scrip {
  /** Earnings per share, trailing twelve months, paisa (negative for a loss). */
  eps: bigint;
  /** Net worth per share, paisa. */
  bookValue: bigint;
  /** Last fiscal year's cash dividend, percent of the Rs 100 par. */
  cash: number;
  /** Last fiscal year's bonus shares, percent. */
  bonus: number;
}

const SECTORS: readonly { sector: string; suffix: string; code: string; count: number; price: [number, number]; pe: [number, number]; pb: [number, number] }[] = [
  { sector: 'Commercial banks', suffix: 'Bank', code: 'B', count: 6, price: [180, 420], pe: [9, 22], pb: [1, 2.2] },
  { sector: 'Development banks', suffix: 'Development Bank', code: 'D', count: 10, price: [250, 520], pe: [14, 40], pb: [1.3, 3] },
  { sector: 'Finance', suffix: 'Finance', code: 'F', count: 8, price: [300, 900], pe: [18, 70], pb: [1.4, 3.5] },
  { sector: 'Microfinance', suffix: 'Laghubitta', code: 'L', count: 14, price: [600, 2400], pe: [20, 90], pb: [2, 6] },
  { sector: 'Hydropower', suffix: 'Hydropower', code: 'H', count: 16, price: [180, 700], pe: [25, 160], pb: [1.5, 5] },
  { sector: 'Life insurance', suffix: 'Life Insurance', code: 'LI', count: 5, price: [450, 1300], pe: [30, 80], pb: [2.5, 6] },
  { sector: 'Non-life insurance', suffix: 'Insurance', code: 'I', count: 6, price: [500, 1100], pe: [20, 50], pb: [2, 4] },
  { sector: 'Manufacturing', suffix: 'Industries', code: 'M', count: 5, price: [400, 1800], pe: [18, 60], pb: [2, 6] },
  { sector: 'Hotels and tourism', suffix: 'Hotels', code: 'T', count: 4, price: [350, 900], pe: [30, 120], pb: [1.5, 4] },
  { sector: 'Investment', suffix: 'Capital', code: 'V', count: 4, price: [300, 1100], pe: [25, 90], pb: [1.5, 4] },
  { sector: 'Trading', suffix: 'Traders', code: 'R', count: 2, price: [600, 2600], pe: [30, 90], pb: [2.5, 7] },
];
const PLACES = [
  'Annapurna', 'Arun', 'Bagmati', 'Bheri', 'Dhaulagiri', 'Everest', 'Gandaki', 'Gorkha', 'Himchuli', 'Ilam', 'Janaki', 'Jhapa', 'Kailash', 'Kanchan', 'Karnali', 'Koshi',
  'Lumbini', 'Mahakali', 'Makalu', 'Manaslu', 'Mithila', 'Narayani', 'Palpa', 'Phewa', 'Rapti', 'Rara', 'Sagarmatha', 'Seti', 'Shikhar', 'Sindhu', 'Tamor', 'Tinau', 'Trishuli',
  'Ganesh', 'Kalinchowk', 'Langtang', 'Machhapuchhre', 'Nilgiri', 'Pathibhara', 'Swargadwari',
];

const r2 = (rupees: number) => BigInt(Math.round(rupees * 10)) * TICK; // rupees to paisa on the tick grid
const between = (rand: () => number, [lo, hi]: [number, number]) => lo + rand() * (hi - lo);

/** Fundamentals for the shared sim's scrips, seeded by symbol so they never change. */
function fundamentalsFor(scrip: Scrip): Company {
  const rand = seeded(hashString(`${scrip.symbol}-fund`));
  const price = Number(scrip.previousClose) / 100;
  const bank = scrip.sector === 'Commercial banks';
  const pe = bank ? between(rand, [10, 20]) : between(rand, [18, 70]);
  const pb = bank ? between(rand, [1.2, 2.4]) : between(rand, [1.6, 5]);
  return { ...scrip, eps: BigInt(Math.round((price / pe) * 100)), bookValue: BigInt(Math.round((price / pb) * 100)), cash: Math.round(rand() * 14), bonus: Math.round(rand() * 12) };
}

function generated(): Company[] {
  const rand = seeded(20_261_102);
  const taken = new Set(SCRIPS.map((s) => s.symbol));
  const out: Company[] = [];
  let place = 0;
  for (const s of SECTORS) {
    for (let i = 0; i < s.count; i += 1) {
      const name = PLACES[place % PLACES.length]!;
      place += 7; // walk the list with a stride so neighbouring sectors do not share names
      let symbol = (name.slice(0, 3) + s.code).toUpperCase();
      for (let n = 2; taken.has(symbol); n += 1) symbol = `${name.slice(0, 3).toUpperCase()}${s.code}${n}`;
      taken.add(symbol);
      const price = between(rand, s.price);
      const loss = rand() < 0.06;
      const pe = between(rand, s.pe);
      const pb = between(rand, s.pb);
      out.push({
        symbol,
        name: `${name} ${s.suffix}`,
        sector: s.sector,
        previousClose: r2(price),
        listedShares: Math.round((4 + rand() * 120) * 1e6),
        liquidity: Math.round((60 + rand() * 1400) / 10) * 10,
        eps: BigInt(Math.round(((loss ? -0.15 : 1) * price * 100) / pe)),
        bookValue: BigInt(Math.round((price * 100) / pb)),
        cash: loss ? 0 : Math.round(rand() * 12),
        bonus: loss ? 0 : Math.round(rand() * 14),
      });
    }
  }
  return out;
}

/** Every listed company, in a fixed order. */
export const COMPANIES: readonly Company[] = [...SCRIPS.map(fundamentalsFor), ...generated()];
const BY_SYMBOL = new Map(COMPANIES.map((c) => [c.symbol, c]));
export const companyOf = (symbol: string): Company | undefined => BY_SYMBOL.get(symbol);
export const SECTOR_NAMES: readonly string[] = [...new Set(COMPANIES.map((c) => c.sector))].toSorted();

/** A contract in the floorsheet: one trade between a buying and a selling broker. */
export interface FloorTrade {
  id: string;
  tick: number;
  symbol: string;
  buyer: number;
  seller: number;
  quantity: number;
  /** Price per unit, paisa. */
  rate: bigint;
  /** quantity × rate, paisa, exact. */
  amount: bigint;
}

export interface PortalMarket {
  seed: number;
  /** Ticks since the open at 11:00 (five simulated seconds each). */
  tick: number;
  quotes: LiveQuote[];
  /** Today's floorsheet, oldest first. */
  trades: FloorTrade[];
  /** Index values per tick (NEPSE and each sector), oldest first, the latest PATH points. */
  paths: Record<string, number[]>;
}

/** Brokers trading on the exchange (numbered as NEPSE numbers its members). */
export const BROKERS = 58;
/** Ticks before the first render: the page opens at 11:20 on a market that has traded for twenty minutes. */
export const WARM_UP = 240;
/** The close, 15:00, in ticks from the 11:00 open. */
export const CLOSE_TICK = 4 * 60 * 12;
const PATH = 96;
const rupees = (paisa: bigint) => Number(paisa) / 100;
const clampBig = (v: bigint, lo: bigint, hi: bigint) => (v < lo ? lo : v > hi ? hi : v);
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** "11:20:05": the Kathmandu clock at a tick, from the 11:00 open. */
export function portalTime(tick: number): string {
  const s = 11 * 3600 + tick * 5;
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

export const INDEX_BASE = 2_684.37;
/** Each sector index's previous close, seeded by its name. */
export const SECTOR_BASE: Readonly<Record<string, number>> = Object.fromEntries(SECTOR_NAMES.map((s) => [s, Math.round(400 + (hashString(s) % 600_000) / 100) + 0.37]));

/** A capitalisation-weighted index over some quotes, at `base` on their previous closes. */
export function indexValue(quotes: readonly Pick<LiveQuote, 'symbol' | 'ltp' | 'previousClose'>[], base: number): number {
  let now = 0;
  let before = 0;
  for (const q of quotes) {
    const shares = companyOf(q.symbol)?.listedShares ?? 0;
    now += shares * rupees(q.ltp);
    before += shares * rupees(q.previousClose);
  }
  return before > 0 ? (base * now) / before : base;
}

function samplePaths(quotes: readonly LiveQuote[], paths: Record<string, number[]>): Record<string, number[]> {
  const next: Record<string, number[]> = {};
  const push = (key: string, value: number) => {
    const p = [...(paths[key] ?? []), Math.round(value * 100) / 100];
    next[key] = p.length > PATH ? p.slice(-PATH) : p;
  };
  // One pass: capitalisation now and at the previous close, for the market and each sector.
  const sums = new Map<string, [number, number]>([['NEPSE', [0, 0]]]);
  for (const q of quotes) {
    const shares = companyOf(q.symbol)?.listedShares ?? 0;
    for (const key of ['NEPSE', q.sector]) {
      const s = sums.get(key) ?? [0, 0];
      s[0] += shares * rupees(q.ltp);
      s[1] += shares * rupees(q.previousClose);
      sums.set(key, s);
    }
  }
  const value = (key: string, base: number) => {
    const s = sums.get(key);
    return s && s[1] > 0 ? (base * s[0]) / s[1] : base;
  };
  push('NEPSE', value('NEPSE', INDEX_BASE));
  for (const s of SECTOR_NAMES) push(s, value(s, SECTOR_BASE[s]!));
  return next;
}

/**
 * One tick: about a third of companies trade a few price steps, each trade split into contracts between brokers.
 * `inPlace` appends to the state's own floorsheet instead of copying it (only for a state nothing else holds).
 */
export function stepPortal(state: PortalMarket, inPlace = false): PortalMarket {
  let rng = state.seed;
  const draw = () => {
    const [next, value] = nextRandom(rng);
    rng = next;
    return value;
  };
  const tick = state.tick + 1;
  if (tick > CLOSE_TICK) return state;
  const fresh: FloorTrade[] = [];
  let seq = state.trades.length;
  const quotes = state.quotes.map((q) => {
    if (draw() > 0.38) return q;
    const c = companyOf(q.symbol)!;
    const drift = ((hashString(q.symbol) % 7) - 3) * 0.04;
    const size = 1 + Math.floor(draw() * 4);
    const direction = draw() + drift * 0.1 < 0.5 ? -1n : 1n;
    const ltp = clampBig(q.ltp + direction * BigInt(size) * TICK, q.lowerLimit, q.upperLimit);
    const contracts = draw() < 0.5 ? 1 : 2;
    let volume = q.volume;
    let turnover = q.turnover;
    for (let k = 0; k < contracts; k += 1) {
      const quantity = Math.max(10, Math.round((c.liquidity * (0.2 + draw() * 0.8)) / 10) * 10);
      const buyer = 1 + Math.floor(draw() * BROKERS);
      let seller = 1 + Math.floor(draw() * BROKERS);
      if (seller === buyer) seller = (seller % BROKERS) + 1;
      seq += 1;
      const amount = BigInt(quantity) * ltp;
      fresh.push({ id: `2026110101${pad(seq, 6)}`, tick, symbol: q.symbol, buyer, seller, quantity, rate: ltp, amount });
      volume += quantity;
      turnover += amount;
    }
    const history = [...q.history, rupees(ltp)];
    return {
      ...q,
      ltp,
      open: q.trades === 0 ? ltp : q.open,
      high: q.trades === 0 || ltp > q.high ? ltp : q.high,
      low: q.trades === 0 || ltp < q.low ? ltp : q.low,
      volume,
      turnover,
      history: history.length > 48 ? history.slice(-48) : history,
      trades: q.trades + contracts,
    };
  });
  return { seed: rng, tick, quotes, trades: inPlace ? (state.trades.push(...fresh), state.trades) : fresh.length ? state.trades.concat(fresh) : state.trades, paths: samplePaths(quotes, state.paths) };
}

/** The opening state: every company at its previous close, then twenty minutes of trading. */
export function createPortal(seed = 20_261_101): PortalMarket {
  const quotes: LiveQuote[] = COMPANIES.map((c) => {
    const band = bandOf(c.previousClose);
    return {
      symbol: c.symbol, name: c.name, sector: c.sector, ltp: c.previousClose, previousClose: c.previousClose, volume: 0, turnover: 0n,
      open: c.previousClose, high: c.previousClose, low: c.previousClose, lowerLimit: band.lower, upperLimit: band.upper, history: [rupees(c.previousClose)], trades: 0,
    };
  });
  let state: PortalMarket = { seed, tick: 0, quotes, trades: [], paths: samplePaths(quotes, {}) };
  for (let i = 0; i < WARM_UP; i += 1) state = stepPortal(state, true);
  return state;
}

// ---- Daily history ----

const candleCache = new Map<string, Candle[]>();
/** A year of daily candles before today (250 sessions), ending at the previous close. Cached: they never change. */
export function yearOf(c: Company): Candle[] {
  let found = candleCache.get(c.symbol);
  if (!found) {
    found = dailyCandles(c, 250);
    candleCache.set(c.symbol, found);
  }
  return found;
}

/** 52-week high and low, paisa, including today's range. */
export function range52(c: Company, q: Pick<LiveQuote, 'high' | 'low'>): { high: bigint; low: bigint } {
  let hi = q.high;
  let lo = q.low;
  for (const d of yearOf(c)) {
    const h = r2(d.high);
    const l = r2(d.low);
    if (h > hi) hi = h;
    if (l < lo) lo = l;
  }
  return { high: hi, low: lo };
}

let indexYear: { date: string; value: number }[] | null = null;
/** The NEPSE index's daily closes for the year before today, ending at INDEX_BASE. */
export function indexHistory(): { date: string; value: number }[] {
  if (indexYear) return indexYear;
  const years = COMPANIES.map((c) => ({ shares: c.listedShares, candles: yearOf(c) }));
  const last = years.reduce((s, y) => s + y.shares * y.candles.at(-1)!.close, 0);
  indexYear = years[0]!.candles.map((d, i) => ({ date: d.date, value: Math.round(((INDEX_BASE * years.reduce((s, y) => s + y.shares * y.candles[i]!.close, 0)) / last) * 100) / 100 }));
  return indexYear;
}

// ---- Fundamentals, dividends and events ----

export interface Fundamentals {
  /** Market capitalisation at the live price, paisa. */
  marketCap: bigint;
  /** Price over EPS; null for a loss. */
  pe: number | null;
  pb: number;
  /** Last cash dividend (percent of par) over the live price, percent. */
  dividendYield: number;
  /** EPS over book value, percent. */
  roe: number;
}

export function fundamentalsOf(c: Company, ltp: bigint): Fundamentals {
  const price = rupees(ltp);
  return {
    marketCap: ltp * BigInt(c.listedShares),
    pe: c.eps > 0n ? Math.round((price / rupees(c.eps)) * 100) / 100 : null,
    pb: Math.round((price / rupees(c.bookValue)) * 100) / 100,
    dividendYield: price > 0 ? Math.round((c.cash / price) * 10_000) / 100 : 0,
    roe: Math.round((rupees(c.eps) / rupees(c.bookValue)) * 10_000) / 100,
  };
}

/** Five fiscal years of distributions on 100 shares: cash (percent of par × Rs 100) and bonus shares at par. */
export function dividendsOf(c: Company): DividendEntry[] {
  const rand = seeded(hashString(`${c.symbol}-div`));
  const out: DividendEntry[] = [];
  for (let k = 4; k >= 0; k -= 1) {
    const year = 2026 - k;
    const cash = k === 0 ? c.cash : Math.max(0, Math.round(c.cash * (0.5 + rand())));
    const bonus = k === 0 ? c.bonus : Math.max(0, Math.round(c.bonus * (0.3 + rand())));
    const date = `${year - (k === 0 ? 1 : 0)}-12-${pad(5 + Math.floor(rand() * 20))}`;
    if (cash > 0) out.push({ id: `${c.symbol}-c${year}`, date, symbol: c.symbol, kind: 'cash', amount: BigInt(cash) * 10_000n });
    if (bonus > 0) out.push({ id: `${c.symbol}-b${year}`, date, symbol: c.symbol, kind: 'bonus', amount: BigInt(bonus) * 10_000n });
  }
  return out;
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY = 86_400_000;
const TODAY = Date.UTC(2026, 10, 1);

/** A company's corporate events around today: the board's proposal, the book close, the AGM and the payout. */
export function eventsOf(c: Company): CorporateEvent[] {
  if (c.cash === 0 && c.bonus === 0) return [];
  const h = hashString(`${c.symbol}-agm`);
  const agm = TODAY + ((h % 70) - 20) * DAY;
  const words = [c.bonus ? `${c.bonus}% bonus` : '', c.cash ? `${c.cash}% cash` : ''].filter(Boolean).join(' and ');
  return [
    { id: `${c.symbol}-ann`, kind: 'announcement', date: iso(agm - 32 * DAY), label: `Board proposes ${words}`, detail: 'Subject to the AGM.' },
    { id: `${c.symbol}-bc`, kind: 'book-close', date: iso(agm - DAY), detail: 'Hold the shares at the end of the day before to be entitled.' },
    { id: `${c.symbol}-agm`, kind: 'agm', date: iso(agm), detail: `Annual general meeting, Kathmandu, ${10 + (h % 4)}:00.` },
    { id: `${c.symbol}-dist`, kind: 'distribution', date: iso(agm + 35 * DAY), label: `${words} distributed` },
  ];
}

/** Share issues on the calendar: open, upcoming and recently closed. The rights issue matches CHCL's events. */
export const ISSUES: readonly ShareIssue[] = [
  { id: 'iss-kvh', company: 'Kaligandaki Valley Hydro', symbol: 'KVHL', kind: 'ipo', shareGroup: 'Ordinary shares, general public', openDate: '2026-10-29', closeDate: '2026-11-04', units: 2_400_000n, pricePerUnit: 10_000n, minKitta: 10n, maxKitta: 1_000n, kittaMultiple: 10n, issueManager: 'Himal Capital' },
  { id: 'iss-chcl-r', company: 'Chilime Hydropower', symbol: 'CHCL', kind: 'right', shareGroup: '1:5 rights to holders', openDate: '2026-10-18', closeDate: '2026-11-01', units: 14_420_000n, pricePerUnit: 10_000n, minKitta: 1n, maxKitta: 28n, kittaMultiple: 1n, issueManager: 'Gandaki Merchant Bank' },
  { id: 'iss-mf', company: 'Sagarmatha Balanced Fund', kind: 'mutual-fund', shareGroup: 'Closed-end units', openDate: '2026-10-27', closeDate: '2026-11-06', units: 100_000_000n, pricePerUnit: 1_000n, minKitta: 100n, maxKitta: 100_000n, kittaMultiple: 10n },
  { id: 'iss-lci', company: 'Lumbini Cement Industries', symbol: 'LCIL', kind: 'fpo', shareGroup: 'Ordinary shares', openDate: '2026-11-08', closeDate: '2026-11-12', units: 2_000_000n, pricePerUnit: 45_000n, minKitta: 10n, maxKitta: 5_000n, kittaMultiple: 10n, issueManager: 'Himal Capital' },
  { id: 'iss-rara', company: 'Rara Hydropower', symbol: 'RARH', kind: 'ipo', shareGroup: 'Project-affected locals', openDate: '2026-11-15', closeDate: '2026-11-19', units: 900_000n, pricePerUnit: 10_000n, minKitta: 10n, maxKitta: 200n, kittaMultiple: 10n, issueManager: 'Kumari Capital' },
  { id: 'iss-mlb', company: 'Mechi Laghubitta', symbol: 'MLBS', kind: 'ipo', shareGroup: 'Ordinary shares', openDate: '2026-10-12', closeDate: '2026-10-16', units: 250_000n, pricePerUnit: 10_000n, minKitta: 10n, maxKitta: 500n, kittaMultiple: 10n, issueManager: 'Kumari Capital' },
];

/** Every company's events in one list, by date: the calendars screen's book closes and AGMs. */
export type ListedEvent = CorporateEvent & { symbol: string; company: string };
let eventList: ListedEvent[] | null = null;
export function allEvents(): ListedEvent[] {
  if (eventList) return eventList;
  const extra: CorporateEvent[] = [
    { id: 'CHCL-ro', kind: 'right-open', date: '2026-10-18', label: '1:5 rights open' },
    { id: 'CHCL-rc', kind: 'right-close', date: '2026-11-01', label: '1:5 rights close' },
  ];
  eventList = COMPANIES.flatMap((c) => [...eventsOf(c), ...(c.symbol === 'CHCL' ? extra : [])].map((e) => ({ ...e, symbol: c.symbol, company: c.name }))).toSorted((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.symbol.localeCompare(b.symbol)));
  return eventList;
}

/** Events for one company including issue windows on the calendar. */
export function companyEvents(c: Company): CorporateEvent[] {
  return allEvents().filter((e) => e.symbol === c.symbol);
}

/** Quarterly results (FY 2083/84 Q1 back to 2082/83 Q2), from the trailing EPS: net profit and revenue, paisa. */
export function quartersOf(c: Company): { id: string; label: string; revenue: bigint; profit: bigint; eps: bigint }[] {
  const rand = seeded(hashString(`${c.symbol}-q`));
  const annual = c.eps * BigInt(c.listedShares);
  const weights = [0.22 + rand() * 0.06, 0.24 + rand() * 0.04, 0.26 + rand() * 0.04];
  weights.push(1 - weights[0]! - weights[1]! - weights[2]!);
  const labels = ['Q1 2083/84', 'Q4 2082/83', 'Q3 2082/83', 'Q2 2082/83'];
  const margin = 0.12 + rand() * 0.3;
  return labels.map((label, i) => {
    const profit = BigInt(Math.round(Number(annual) * weights[i]!));
    return { id: label, label, profit, revenue: BigInt(Math.round(Math.abs(Number(profit)) / margin)), eps: BigInt(Math.round((Number(profit) * 4) / c.listedShares)) };
  });
}
