// A realistic NEPSE-style portfolio for the portfolio components, the docs site and the visual fixtures (one source).
// Synthetic, never live. Money is bigint paisa. The history covers every record type: buys, sales (one at a loss, one
// fully sold position), bonus issues, rights, cash dividends, a symbol with no quote and one with no previous close.
import { quotes, quotesWithGaps } from './market-data.ts';

/** Rupees as text ("1234.50") to paisa. */
export const npr = (rupees: string): bigint => {
  const [whole = '0', fraction = ''] = rupees.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
};

export type SampleTransactionType = 'buy' | 'sell' | 'bonus' | 'rights' | 'dividend';
export interface SampleTransaction {
  id: string;
  date: string;
  symbol: string;
  name: string;
  sector: string;
  type: SampleTransactionType;
  quantity?: bigint;
  price?: bigint;
  fees?: bigint;
  amount?: bigint;
  note?: string;
}

const names: Record<string, [string, string]> = {
  NABIL: ['Nabil Bank Limited', 'Banking'], NTC: ['Nepal Telecom', 'Telecom'], HDL: ['Himalayan Distillery Limited', 'Manufacturing'],
  NICA: ['NIC Asia Bank Limited', 'Banking'], UPPER: ['Upper Tamakoshi Hydropower', 'Hydropower'], CHCL: ['Chilime Hydropower Company', 'Hydropower'],
  NLIC: ['Nepal Life Insurance', 'Insurance'], GBIME: ['Global IME Bank Limited', 'Banking'], SHIVM: ['Shivam Cements Limited', 'Manufacturing'],
  NMB: ['NMB Bank Limited', 'Banking'], BFC: ['Butwal Finance', 'Finance'], IPOX: ['Newly listed (no previous close)', 'Other'],
};
const tx = (id: string, date: string, symbol: string, type: SampleTransactionType, fields: { quantity?: bigint; price?: string; fees?: string; amount?: string; note?: string }): SampleTransaction => {
  const [name, sector] = names[symbol] ?? [symbol, 'Other'];
  return {
    id, date, symbol, name, sector, type,
    ...(fields.quantity === undefined ? {} : { quantity: fields.quantity }),
    ...(fields.price === undefined ? {} : { price: npr(fields.price) }),
    ...(fields.fees === undefined ? {} : { fees: npr(fields.fees) }),
    ...(fields.amount === undefined ? {} : { amount: npr(fields.amount) }),
    ...(fields.note === undefined ? {} : { note: fields.note }),
  };
};

/** Oldest first within a symbol; the helpers sort by date anyway. Received in Nepal fiscal years 2079/80 to 2082/83. */
export const portfolioTransactions: readonly SampleTransaction[] = [
  tx('t01', '2022-09-12', 'NABIL', 'buy', { quantity: 100n, price: '640.00', fees: '342.50' }),
  tx('t02', '2022-10-03', 'NICA', 'buy', { quantity: 200n, price: '690.00', fees: '720.10' }),
  tx('t03', '2022-11-21', 'CHCL', 'buy', { quantity: 100n, price: '690.00', fees: '368.75' }),
  tx('t04', '2023-02-08', 'BFC', 'buy', { quantity: 200n, price: '410.00', fees: '442.00' }),
  tx('t05', '2023-03-14', 'NTC', 'buy', { quantity: 40n, price: '865.00', fees: '195.40' }),
  tx('t06', '2023-04-03', 'NABIL', 'buy', { quantity: 50n, price: '590.00', fees: '255.90' }),
  tx('t07', '2023-06-11', 'HDL', 'buy', { quantity: 25n, price: '2180.00', fees: '290.30' }),
  tx('t08', '2023-08-24', 'NICA', 'dividend', { amount: '9400.00', note: 'Cash dividend' }),
  tx('t09', '2023-09-20', 'NABIL', 'bonus', { quantity: 12n, note: '8% bonus' }),
  tx('t10', '2023-10-15', 'UPPER', 'buy', { quantity: 500n, price: '372.00', fees: '985.00' }),
  tx('t11', '2023-11-02', 'GBIME', 'buy', { quantity: 410n, price: '255.00', fees: '560.80' }),
  tx('t12', '2023-12-06', 'CHCL', 'sell', { quantity: 100n, price: '612.30', fees: '430.15', note: 'Cut the loss' }),
  tx('t13', '2024-01-17', 'NLIC', 'buy', { quantity: 90n, price: '720.00', fees: '348.20' }),
  tx('t14', '2024-02-27', 'NICA', 'rights', { quantity: 50n, price: '100.00', fees: '25.00', note: '1:4 rights at par' }),
  tx('t15', '2024-04-09', 'SHIVM', 'buy', { quantity: 60n, price: '560.00', fees: '181.30' }),
  tx('t16', '2024-08-05', 'NABIL', 'sell', { quantity: 40n, price: '710.00', fees: '210.50' }),
  tx('t17', '2024-09-01', 'NABIL', 'dividend', { amount: '14250.00', note: 'Cash dividend' }),
  tx('t18', '2024-09-18', 'NTC', 'dividend', { amount: '22800.00', note: 'Cash dividend' }),
  tx('t19', '2024-10-30', 'GBIME', 'bonus', { quantity: 41n, note: '10% bonus' }),
  tx('t20', '2025-01-14', 'IPOX', 'buy', { quantity: 50n, price: '100.00', fees: '25.00', note: 'IPO allotment' }),
  tx('t21', '2025-03-05', 'UPPER', 'sell', { quantity: 200n, price: '401.50', fees: '600.20' }),
  tx('t22', '2025-05-22', 'NICA', 'buy', { quantity: 100n, price: '560.00', fees: '270.10' }),
  tx('t23', '2025-08-27', 'NABIL', 'dividend', { amount: '16100.00', note: 'Cash dividend' }),
  tx('t24', '2025-09-10', 'HDL', 'dividend', { amount: '7125.00', note: 'Cash dividend' }),
  tx('t25', '2025-10-08', 'NMB', 'rights', { quantity: 30n, price: '100.00', fees: '25.00', note: '3:10 rights' }),
  tx('t26', '2025-10-23', 'NICA', 'dividend', { amount: '12300.00', note: 'Cash dividend' }),
  tx('t27', '2025-11-05', 'GBIME', 'sell', { quantity: 100n, price: '268.00', fees: '147.90' }),
];

/** Today's quotes for every symbol held: the market sample, plus BFC (did not trade) and IPOX (no previous close). */
export const portfolioQuotes = [...quotes, ...quotesWithGaps.slice(4)].map(({ symbol, ltp, previousClose }) => ({ symbol, ltp, previousClose }));
