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
