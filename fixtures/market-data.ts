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
