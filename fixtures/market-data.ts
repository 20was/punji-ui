// Deterministic NEPSE-style sample data. Synthetic: not market data.
export interface Holding {
  symbol: string;
  name: string;
  qty: number;
  ltp: number;
  change: number;
}

export const holdings: readonly Holding[] = [
  { symbol: 'NABIL', name: 'Nabil Bank Limited', qty: 120, ltp: 487.5, change: 1.25 },
  { symbol: 'NTC', name: 'Nepal Telecom', qty: 40, ltp: 842, change: -0.47 },
  { symbol: 'HDL', name: 'Himalayan Distillery Limited', qty: 25, ltp: 2150, change: 2.31 },
  { symbol: 'NICA', name: 'NIC Asia Bank Limited', qty: 300, ltp: 512.4, change: -1.08 },
  { symbol: 'SBL', name: 'Siddhartha Bank Limited', qty: 210, ltp: 331.2, change: 0 },
  { symbol: 'UPPER', name: 'Upper Tamakoshi Hydropower', qty: 500, ltp: 398.9, change: 0.82 },
  { symbol: 'CHCL', name: 'Chilime Hydropower Company', qty: 75, ltp: 612.3, change: -2.64 },
  { symbol: 'NLIC', name: 'Nepal Life Insurance', qty: 90, ltp: 745, change: 0.15 },
  { symbol: 'GBIME', name: 'Global IME Bank Limited', qty: 410, ltp: 268.7, change: 1.9 },
  { symbol: 'SHIVM', name: 'Shivam Cements Limited', qty: 60, ltp: 589.5, change: -0.33 },
  { symbol: 'NMB', name: 'NMB Bank Limited', qty: 150, ltp: 301.1, change: 0.55 },
  { symbol: 'PRVU', name: 'Prabhu Bank Limited', qty: 330, ltp: 224.8, change: -0.9 },
];

export const symbols = holdings.map(({ symbol, name }) => ({ symbol, name }));

export const weeklyValue = [
  { label: 'Week 1', value: 1_000_000 },
  { label: 'Week 2', value: 1_124_500 },
  { label: 'Week 3', value: null },
  { label: 'Week 4', value: 1_086_200 },
  { label: 'Week 5', value: 1_213_750 },
];

export const today = '2025-11-14';

// Published depth for one symbol: best first on both sides. Prices in rupees.
export const orderBook = {
  symbol: 'NABIL',
  bids: [
    { price: 487.0, quantity: 1200 },
    { price: 486.5, quantity: 850 },
    { price: 486.0, quantity: 2400 },
    { price: 485.5, quantity: 600 },
    { price: 485.0, quantity: 3100 },
  ],
  asks: [
    { price: 488.0, quantity: 900 },
    { price: 488.5, quantity: 1500 },
    { price: 489.0, quantity: 700 },
    { price: 489.5, quantity: 2200 },
    { price: 490.0, quantity: 1800 },
  ],
} as const;

// Revenue by fiscal year in rupees, two segments. Synthetic.
export const revenueByYear = [
  { key: '2079', label: '2079/80', short: '79/80', values: [412_000_000, 138_000_000] },
  { key: '2080', label: '2080/81', short: '80/81', values: [455_000_000, 161_000_000] },
  { key: '2081', label: '2081/82', short: '81/82', values: [498_000_000, 187_000_000] },
  { key: '2082', label: '2082/83', short: '82/83', values: [531_000_000, 214_000_000] },
] as const;

// ---------------------------------------------------------------------------
// Quotes, indices and series for the market components. Synthetic, deterministic.
// Prices are bigint minor units (paisa), the shape of the library's `Quote`.
// ---------------------------------------------------------------------------
export interface SampleQuote {
  symbol: string;
  name: string;
  sector: string;
  ltp: bigint | null;
  previousClose: bigint | null;
  volume: number | null;
  turnover: bigint | null;
  history: number[];
}

const sectors: Record<string, string> = {
  NABIL: 'Banking', NTC: 'Telecom', HDL: 'Manufacturing', NICA: 'Banking', SBL: 'Banking', UPPER: 'Hydropower',
  CHCL: 'Hydropower', NLIC: 'Insurance', GBIME: 'Banking', SHIVM: 'Manufacturing', NMB: 'Banking', PRVU: 'Banking',
};

/** A repeatable wobbly walk that ends exactly on `last`, oldest first. */
export function sampleCloses(last: number, seed: number, length = 30): number[] {
  const out: number[] = [];
  for (let i = 0; i < length; i += 1) {
    const wobble = Math.sin((i + seed) * 1.3) * 0.012 + Math.cos((i + seed * 2) * 0.55) * 0.018;
    const drift = ((i - (length - 1)) / length) * (seed % 2 === 0 ? 0.04 : -0.04);
    out.push(Math.round(last * (1 + wobble + drift) * 100) / 100);
  }
  out[length - 1] = last;
  return out;
}

export const quotes: readonly SampleQuote[] = holdings.map((h, i) => {
  const ltp = BigInt(Math.round(h.ltp * 100));
  const previousClose = BigInt(Math.round((h.ltp / (1 + h.change / 100)) * 100));
  const volume = 4_000 + ((i * 7_919) % 52_000);
  return {
    symbol: h.symbol,
    name: h.name,
    sector: sectors[h.symbol] ?? 'Other',
    ltp,
    previousClose,
    volume,
    turnover: ltp * BigInt(volume),
    history: sampleCloses(h.ltp, i + 1),
  };
});

/** A board with the awkward rows a real feed has: not traded, no previous close. */
export const quotesWithGaps: readonly SampleQuote[] = [
  ...quotes.slice(0, 4),
  { symbol: 'BFC', name: 'Butwal Finance', sector: 'Finance', ltp: null, previousClose: 41_250n, volume: null, turnover: null, history: [] },
  { symbol: 'IPOX', name: 'Newly listed (no previous close)', sector: 'Other', ltp: 25_000n, previousClose: null, volume: 12_400, turnover: 310_000_000n, history: [] },
];

/** Index values in points. */
export const marketIndices = [
  { id: 'nepse', name: 'NEPSE', value: 2_714.38, previousValue: 2_689.12, history: sampleCloses(2_714.38, 3, 30) },
  { id: 'sensitive', name: 'Sensitive', value: 487.21, previousValue: 489.9, history: sampleCloses(487.21, 4, 30) },
  { id: 'float', name: 'Float', value: 189.64, previousValue: 188.77, history: sampleCloses(189.64, 5, 30) },
  { id: 'banking', name: 'Banking', value: null, previousValue: 1_402.5, history: [] },
] as const;

/** A circuit-limit example: previous close Rs 487.50, +/-10% to the paisa. */
export const circuit = { previousClose: 48_750n, lower: 43_875n, upper: 53_625n } as const;

/** One symbol's closing prices for the price chart; one day is missing on purpose. */
export const priceSeries = [
  { label: '3 Nov', value: 478.2 },
  { label: '4 Nov', value: 481.0 },
  { label: '5 Nov', value: 484.9 },
  { label: '6 Nov', value: null },
  { label: '9 Nov', value: 486.1 },
  { label: '10 Nov', value: 483.5 },
  { label: '11 Nov', value: 485.8 },
  { label: '12 Nov', value: 489.3 },
  { label: '13 Nov', value: 486.2 },
  { label: '14 Nov', value: 487.5 },
] as const;

/** Share of a portfolio by sector, percent. */
export const sectorShares = [
  { key: 'banking', label: 'Banking', pct: 46 },
  { key: 'hydro', label: 'Hydropower', pct: 22 },
  { key: 'manufacturing', label: 'Manufacturing', pct: 14 },
  { key: 'insurance', label: 'Insurance', pct: 10 },
  { key: 'telecom', label: 'Telecom', pct: 8 },
] as const;

/** How many holdings sit at each rating step, highest first. */
export const ratingCounts = [
  { key: 'a', label: 'Strong', count: 18, step: 4 },
  { key: 'b', label: 'Good', count: 42, step: 3 },
  { key: 'c', label: 'Fair', count: 63, step: 2 },
  { key: 'd', label: 'Weak', count: 27, step: 1 },
  { key: 'e', label: 'Poor', count: 9, step: 0 },
] as const;

/** A moment on a Sunday morning in Kathmandu (UTC 05:00 = 10:45 NPT), inside NEPSE's example pre-open. */
export const sampleNow = new Date('2025-11-16T05:00:00Z');

// Thirty closes for NABIL (NPR), oldest first.
export const nabilCloses: readonly number[] = [
  471.2, 473.5, 472.1, 475.9, 478.4, 477.0, 480.3, 479.1, 481.6, 484.2,
  482.8, 485.5, 487.9, 486.1, 484.7, 483.2, 485.0, 488.6, 490.4, 489.2,
  491.8, 493.5, 492.1, 490.7, 488.3, 486.9, 485.4, 486.8, 488.2, 487.5,
];

// Dividends received by fiscal year (NPR): cash, bonus shares and rights value.
export const dividendSeries = [
  { key: 'cash', label: 'Cash dividend', tone: 'chart' },
  { key: 'bonus', label: 'Bonus shares', tone: 'series2' },
  { key: 'rights', label: 'Rights value', tone: 'series3' },
] as const;
export const dividendColumns = [
  { key: '79', label: '2079/80', short: '79/80', values: [84_000, 21_000, 6_500] },
  { key: '80', label: '2080/81', short: '80/81', values: [120_000, 31_000, 0] },
  { key: '81', label: '2081/82', short: '81/82', values: [134_500, 0, 12_000] },
  { key: '82', label: '2082/83', short: '82/83', values: [98_750, 44_200, 9_800] },
] as const;

export const bookBids = [
  { price: 546.9, quantity: 1840 }, { price: 546.5, quantity: 920 }, { price: 546, quantity: 2650 },
  { price: 545.5, quantity: 410 }, { price: 545, quantity: 1130 },
] as const;
export const bookAsks = [
  { price: 547, quantity: 1210 }, { price: 547.5, quantity: 3340 }, { price: 548, quantity: 760 },
  { price: 548.6, quantity: 1580 }, { price: 549, quantity: 290 },
] as const;
