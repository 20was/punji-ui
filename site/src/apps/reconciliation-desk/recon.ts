// The reconciliation desk's fixture: one month (October 2026) of a company's bank statement against the bank account in
// its books. Pure TypeScript, no clock, no randomness: the same lines every time. Amounts are signed paisa (bigint),
// money in positive and money out negative, on both sides. Written to leave a realistic queue: most lines agree by
// reference and amount (auto-matched), some agree only by amount, one payroll is paid as three transfers, and a few
// are genuine exceptions (an amount keyed wrongly, a bank line twice, bank charges, an old cheque).
import type { CalendarDate } from '@punji/ui/nepal/date-only';
import type { ReconcileItem } from '@punji/ui/reconciliation-matcher';

/** Exact rupees text ("-85,000.50") to signed paisa, without floating point. */
export function paisa(text: string): bigint {
  const m = /^([+-]?)([\d,]+)(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!m) throw new RangeError(`Not an amount: ${text}`);
  const value = BigInt(m[2]!.replaceAll(',', '')) * 100n + BigInt((m[3] ?? '').padEnd(2, '0') || '0');
  return m[1] === '-' ? -value : value;
}

const day = (d: number): CalendarDate => ({ year: 2026, month: 10, day: d });

export const BANK = { name: 'NIC Asia Bank', account: 'Current account 0123-4567-8901', ledgerAccount: '1010 Bank, NIC Asia' };
export const PERIOD = { label: 'October 2026', from: day(1), to: day(31), asAt: { year: 2026, month: 11, day: 1 } satisfies CalendarDate };

/** An item both sides have: the bank paid it on `d` and the books posted it on `bookDay` (default the same day) under `bookRef`. */
type Both = [d: number, text: string, ref: string, amount: string, over?: { bookDay?: number; bookRef?: string }];
const BOTH: readonly Both[] = [
  [1, 'Rent, Jhamsikhel office, October', 'CHQ-004211', '-85,000.00', { bookRef: 'CHQ-4211' }],
  [1, 'Everest Stores Pvt. Ltd. INV-2082-0140', 'RTGS-77120', '226,000.00', { bookRef: 'INV-2082-0140' }],
  [2, 'Nepal Electricity Authority bill', 'NEA-5521', '-18,640.50', { bookRef: '' }],
  [3, 'Himal Traders INV-2082-0141', 'FPAY-90311', '113,000.00'],
  [4, 'Worldlink internet, October', 'WL-33412', '-9,040.00'],
  [5, 'Cloud hosting invoice', 'AWS-9981', '-61,254.75'],
  [6, 'Annapurna Hospitality INV-2082-0144', 'RTGS-77185', '339,000.00'],
  [8, 'SSF contribution, Ashwin', 'SSF-8851', '-148,460.00'],
  [9, 'VAT deposit to IRD, Ashwin', 'IRD-VAT-02', '-212,480.00'],
  [10, 'TDS deposit to IRD, Ashwin', 'IRD-TDS-02', '-37,420.00'],
  [11, 'Kathmandu Learning Hub INV-2082-0146', 'RTGS-77340', '158,200.00'],
  [12, 'Office supplies, Bhatbhateni', 'POS-4410', '-7,325.25'],
  [13, 'Ncell postpaid', 'NC-2210', '-4,520.00'],
  [14, 'Sunrise Logistics INV-2082-0149', 'FPAY-90455', '92,500.00'],
  [15, 'Fuel and vehicle maintenance', 'POS-4477', '-12,800.00', { bookRef: 'VCH-0912', bookDay: 14 }],
  [16, 'Tax consultant fee', 'CHQ-004213', '-45,000.00'],
  [17, 'Mount View Resort INV-2082-0150', 'RTGS-77402', '271,500.00'],
  [19, 'Staff tea and pantry', 'POS-4521', '-3,675.00'],
  [20, 'Insurance premium, Sagarmatha Insurance', 'CHQ-004214', '-28,900.00'],
  [21, 'Yeti Traders INV-2082-0152', 'FPAY-90577', '67,800.00'],
  [22, 'Courier, DHL Nepal', 'POS-4583', '-5,240.00'],
  [24, 'Software licences', 'CARD-8820', '-34,415.00'],
  [26, 'Pokhara Lakeside Hotels INV-2082-0154', 'RTGS-77511', '198,000.00'],
  [28, 'Contractor payment, Bishal Thapa (1.5% TDS withheld)', 'CHQ-004216', '-98,500.00'],
];

/** Only the bank has it: payroll paid as three transfers, the bank's own charges and receipts, and exceptions. */
type Single = [d: number, text: string, ref: string, amount: string];
const BANK_ONLY: readonly Single[] = [
  [7, 'Salary transfer 1 of 3, Ashwin', 'SAL-1007-A', '-300,000.00'],
  [7, 'Salary transfer 2 of 3, Ashwin', 'SAL-1007-B', '-250,000.00'],
  [7, 'Salary transfer 3 of 3, Ashwin', 'SAL-1007-C', '-192,300.00'],
  [9, 'Himal Traders RTGS', 'RTGS-77290', '43,500.00'],
  [17, '+977 9841000000 eSewa settlement', 'ESW-5521', '24,900.00'],
  // The bank repeated this line (same date, amount and reference): to be disputed, never booked.
  [19, 'Staff tea and pantry', 'POS-4521', '-3,675.00'],
  // Free text typed by the payer. A spreadsheet would run it as a formula; the CSV export must not.
  [25, '=HYPERLINK("https://example.test/refund","Fonepay QR refund")', 'FPQ-3301', '6,150.00'],
  [30, 'Service charge: SMS alerts and cheque book', 'CHG-1030', '-1,180.00'],
  [31, 'Interest on balance, Ashwin', 'INT-OCT', '3,486.12'],
];

/** Only the books have it: the payroll as one entry, timing items (a cheque not yet presented, a deposit not yet credited) and an amount keyed wrongly. */
const BOOK_ONLY: readonly Single[] = [
  [3, 'Cheque to Himalayan Courier', 'CHQ-004198', '-8,900.00'],
  [7, 'Staff salary batch, Ashwin', 'SAL-1007', '-742,300.00'],
  [9, 'Himal Traders INV-2082-0143 (receipt)', 'RTGS-77290', '45,300.00'],
  [27, 'Cheque to Nepal Stationery', 'CHQ-004215', '-23,450.00'],
  [31, 'Yeti Traders INV-2082-0156 (cheque deposited)', 'DEP-0931', '54,000.00'],
];

const inDateOrder = (items: ReconcileItem[], prefix: string): ReconcileItem[] =>
  items.toSorted((a, b) => a.date.day - b.date.day).map((item, i) => ({ ...item, id: `${prefix}-${String(i + 1).padStart(2, '0')}` }));
const item = (d: number, text: string, ref: string, amount: string): ReconcileItem => ({ id: '', date: day(d), description: text, reference: ref, amount: paisa(amount) });

/** The bank's lines, in date order with ids S-01. */
export const STATEMENT: readonly ReconcileItem[] = inDateOrder([...BOTH.map(([d, t, r, a]) => item(d, t, r, a)), ...BANK_ONLY.map(([d, t, r, a]) => item(d, t, r, a))], 'S');

/** The bank account in the books, in date order with ids L-01. */
export const LEDGER: readonly ReconcileItem[] = inDateOrder(
  [...BOTH.map(([d, t, r, a, over]) => item(over?.bookDay ?? d, t, over?.bookRef ?? r, a)), ...BOOK_ONLY.map(([d, t, r, a]) => item(d, t, r, a))],
  'L',
);

/** The balance both sides opened the month with: September was reconciled to the paisa. */
export const OPENING = paisa('1,845,000.00');
/** The bank's printed closing balance for 31 October. */
export const STATEMENT_CLOSING = paisa('1,829,210.62');
/** The books' balance of the bank account on 31 October, before anything is booked in the app. */
export const LEDGER_CLOSING = paisa('1,822,979.50');
