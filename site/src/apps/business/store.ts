// The billing and payroll app's state: customers, invoices (lines in paisa), payments against them, the invoice
// being written, and this month's payroll run. One reducer and one `derive`, so the invoice list, the customer
// balances, payments received and the dashboard figures are computed from the same records and agree to the paisa.
import { createContext, useContext, type Dispatch } from 'react';
import type { LineItemDraft } from '@punji/ui/line-item-editor';
import type { CalendarDate } from '@punji/ui/nepal/date-only';
import { computeInvoice, type InvoiceTotals } from '@punji/ui/tax';
import type { TaxInvoiceLine } from '@punji/ui/tax-invoice';
import { CUSTOMERS, TODAY, addDays, compareDates, isoDate, type Customer } from '../shared/books.ts';

export type Screen = 'invoices' | 'create' | 'customers' | 'payments' | 'payroll' | 'tax';
export type PaymentMode = 'bank' | 'cheque' | 'cash' | 'qr';
export const MODES: Record<PaymentMode, string> = { bank: 'Bank transfer', cheque: 'Cheque', cash: 'Cash', qr: 'QR (Fonepay)' };

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  date: CalendarDate;
  due: CalendarDate;
  lines: TaxInvoiceLine[];
  notes?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  date: CalendarDate;
  /** Money received, paisa. */
  amount: bigint;
  /** Tax the customer withheld and deposited for us, paisa. Settles the invoice like cash. */
  tds: bigint;
  mode: PaymentMode;
  reference?: string;
}

export interface Draft {
  customerId: string;
  date: string;
  notes: string;
  lines: LineItemDraft[];
  step: 'edit' | 'preview';
}

export type PayrollStage = 'review' | 'approved' | 'paid';

export interface BizState {
  customers: readonly Customer[];
  invoices: readonly Invoice[];
  payments: readonly Payment[];
  draft: Draft;
  payroll: PayrollStage;
  /** The invoice open in the list, and the one the payment form is for. */
  selected: string | null;
  payFor: string | null;
  notice: string;
}

export type Action =
  | { type: 'draft'; draft: Partial<Draft> }
  | { type: 'issue'; lines: TaxInvoiceLine[] }
  | { type: 'pay'; payment: Omit<Payment, 'id'> }
  | { type: 'customer'; customer: Omit<Customer, 'id'> }
  | { type: 'payroll'; stage: PayrollStage }
  | { type: 'select'; id: string | null }
  | { type: 'pay-for'; id: string | null };

export const VAT = { vatRate: '0.13', rounding: 'half-up' } as const;

const CATALOG = {
  dev: { description: 'Web application development', unit: 'hr', rate: 250_000n },
  amc: { description: 'Annual maintenance, quarterly instalment', unit: 'qtr', rate: 7_500_000n },
  cloud: { description: 'Cloud hosting and backups', unit: 'month', rate: 1_850_000n },
  design: { description: 'UI design sprint', unit: 'sprint', rate: 9_000_000n },
  training: { description: 'Staff training', unit: 'day', rate: 3_500_000n },
  books: { description: 'Printed training manuals', unit: 'pcs', rate: 75_000n, taxable: false },
} as const;
type Item = keyof typeof CATALOG;
const lines = (items: [Item, bigint | string][]): TaxInvoiceLine[] =>
  items.map(([key, quantity], i) => {
    const c = CATALOG[key];
    return { id: `l${i + 1}`, description: c.description, unit: c.unit, quantity, rate: c.rate, ...('taxable' in c ? { taxable: c.taxable } : {}) };
  });
const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const numberOf = (n: number) => `INV-2083/84-${String(n).padStart(4, '0')}`;

const SEED: [string, CalendarDate, [Item, bigint | string][]][] = [
  ['c-everest', d(2026, 7, 20), [['dev', 120n], ['cloud', 3n]]],
  ['c-koshi', d(2026, 7, 28), [['design', 1n], ['dev', 40n]]],
  ['c-janakpur', d(2026, 8, 3), [['training', 2n], ['books', 40n]]],
  ['c-himal', d(2026, 8, 12), [['amc', 1n]]],
  ['c-lumbini', d(2026, 8, 25), [['dev', '62.5'], ['cloud', 3n]]],
  ['c-fewa', d(2026, 9, 2), [['cloud', 6n]]],
  ['c-everest', d(2026, 9, 14), [['dev', 96n]]],
  ['c-koshi', d(2026, 9, 26), [['amc', 1n], ['training', 1n]]],
  ['c-janakpur', d(2026, 10, 5), [['dev', 30n], ['books', 25n]]],
  ['c-himal', d(2026, 10, 15), [['design', 1n]]],
  ['c-lumbini', d(2026, 10, 24), [['dev', 48n], ['cloud', 1n]]],
  ['c-fewa', d(2026, 10, 29), [['training', 1n]]],
];

function seedInvoices(): Invoice[] {
  return SEED.map(([customerId, date, items], i) => {
    const customer = CUSTOMERS.find((c) => c.id === customerId)!;
    return { id: `inv-${i + 1}`, number: numberOf(i + 1), customerId, date, due: addDays(date, customer.terms), lines: lines(items) };
  });
}

export const totalsOf = (invoice: Pick<Invoice, 'lines'>): InvoiceTotals => computeInvoice(invoice.lines, VAT);

function seedPayments(invoices: readonly Invoice[]): Payment[] {
  // Paid in full (less 1.5% TDS on the taxable amount), part paid, or not yet: a mix the aging and balances can show.
  const plan: [number, CalendarDate, 'full' | 'half', PaymentMode][] = [
    [0, d(2026, 8, 14), 'full', 'bank'],
    [1, d(2026, 8, 30), 'full', 'cheque'],
    [3, d(2026, 9, 10), 'full', 'bank'],
    [4, d(2026, 10, 1), 'half', 'bank'],
    [5, d(2026, 9, 12), 'full', 'qr'],
    [6, d(2026, 10, 12), 'full', 'bank'],
    [7, d(2026, 10, 28), 'half', 'cheque'],
    [9, d(2026, 10, 30), 'full', 'bank'],
  ];
  return plan.map(([index, date, how, mode], i) => {
    const invoice = invoices[index]!;
    const t = totalsOf(invoice);
    const tds = how === 'full' ? (t.taxable * 15n + 500n) / 1000n : 0n;
    const amount = how === 'full' ? t.total - tds : t.total / 2n;
    return { id: `pay-${i + 1}`, invoiceId: invoice.id, date, amount, tds, mode, reference: mode === 'cheque' ? `CHQ ${100_200 + i}` : mode === 'bank' ? `TXN${88_410 + i * 7}` : undefined };
  });
}

export const blankDraft = (): Draft => ({
  customerId: CUSTOMERS[0]!.id,
  date: isoDate(TODAY),
  notes: '',
  lines: [
    { id: 'd1', description: 'Web application development (hours)', quantity: '40', rate: '2500', taxable: true },
    { id: 'd2', description: 'Cloud hosting and backups (months)', quantity: '1', rate: '18500', taxable: true },
  ],
  step: 'edit',
});

export function initialState(): BizState {
  const invoices = seedInvoices();
  return { customers: CUSTOMERS, invoices, payments: seedPayments(invoices), draft: blankDraft(), payroll: 'review', selected: null, payFor: null, notice: '' };
}

export interface InvoiceRow {
  invoice: Invoice;
  customer: Customer;
  totals: InvoiceTotals;
  /** Cash plus TDS settled. */
  received: bigint;
  balance: bigint;
  status: 'paid' | 'part' | 'overdue' | 'due';
}

export const STATUS: Record<InvoiceRow['status'], string> = { paid: 'Paid', part: 'Part paid', overdue: 'Overdue', due: 'Due' };

export interface Derived {
  rows: InvoiceRow[];
  invoiced: bigint;
  received: bigint;
  outstanding: bigint;
  overdue: bigint;
  byCustomer: Map<string, { count: number; outstanding: bigint }>;
}

export function derive(state: BizState): Derived {
  const settled = new Map<string, bigint>();
  for (const p of state.payments) settled.set(p.invoiceId, (settled.get(p.invoiceId) ?? 0n) + p.amount + p.tds);
  const rows = state.invoices.map((invoice): InvoiceRow => {
    const totals = totalsOf(invoice);
    const received = settled.get(invoice.id) ?? 0n;
    const balance = totals.total - received;
    const status = balance <= 0n ? 'paid' : compareDates(invoice.due, TODAY) < 0 ? 'overdue' : received > 0n ? 'part' : 'due';
    return { invoice, customer: state.customers.find((c) => c.id === invoice.customerId)!, totals, received, balance, status };
  });
  const byCustomer = new Map<string, { count: number; outstanding: bigint }>();
  for (const r of rows) {
    const c = byCustomer.get(r.customer.id) ?? { count: 0, outstanding: 0n };
    byCustomer.set(r.customer.id, { count: c.count + 1, outstanding: c.outstanding + r.balance });
  }
  const sum = (pick: (r: InvoiceRow) => bigint) => rows.reduce((s, r) => s + pick(r), 0n);
  return {
    rows,
    invoiced: sum((r) => r.totals.total),
    received: sum((r) => r.received),
    outstanding: sum((r) => r.balance),
    overdue: sum((r) => (r.status === 'overdue' ? r.balance : 0n)),
    byCustomer,
  };
}

export const nextNumber = (state: BizState) => numberOf(state.invoices.length + 1);

export function reducer(state: BizState, action: Action): BizState {
  switch (action.type) {
    case 'draft':
      return { ...state, draft: { ...state.draft, ...action.draft } };
    case 'issue': {
      const { draft } = state;
      const customer = state.customers.find((c) => c.id === draft.customerId);
      const [y, m, dd] = draft.date.split('-').map(Number);
      if (!customer || !y || !m || !dd || !action.lines.length) return state;
      const date = { year: y, month: m, day: dd };
      const id = `inv-${state.invoices.length + 1}`;
      const number = nextNumber(state);
      return {
        ...state,
        invoices: [...state.invoices, { id, number, customerId: customer.id, date, due: addDays(date, customer.terms), lines: action.lines, notes: draft.notes.trim() || undefined }],
        draft: blankDraft(),
        selected: id,
        notice: `Invoice ${number} issued to ${customer.name}.`,
      };
    }
    case 'pay': {
      const id = `pay-${state.payments.length + 1}`;
      const invoice = state.invoices.find((i) => i.id === action.payment.invoiceId);
      return { ...state, payments: [...state.payments, { ...action.payment, id }], payFor: null, notice: `Payment recorded against ${invoice?.number ?? 'the invoice'}.` };
    }
    case 'customer': {
      const id = `c-new-${state.customers.length + 1}`;
      return { ...state, customers: [...state.customers, { ...action.customer, id }], notice: `${action.customer.name} added.` };
    }
    case 'payroll':
      return { ...state, payroll: action.stage, notice: action.stage === 'approved' ? 'Payroll for Kartik 2083 approved. Payslips are ready.' : action.stage === 'paid' ? 'Salaries for Kartik 2083 paid to five accounts.' : 'Payroll reopened for review.' };
    case 'select':
      return { ...state, selected: action.id };
    case 'pay-for':
      return { ...state, payFor: action.id };
  }
}

export interface BizContext {
  state: BizState;
  derived: Derived;
  dispatch: Dispatch<Action>;
  go: (screen: Screen) => void;
}
export const BizContext = createContext<BizContext | null>(null);
export function useBiz(): BizContext {
  const value = useContext(BizContext);
  if (!value) throw new Error('useBiz needs the billing app');
  return value;
}
