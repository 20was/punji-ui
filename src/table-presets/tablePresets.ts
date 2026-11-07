/**
 * Domain column presets: typed `ColumnDef[]` factories for the tables finance
 * teams build again and again (holdings, stock quotes, ledger, bank statement,
 * receivables aging, trial balance). Pure and React-free.
 *
 * Money is exact: cells format bigint minor units with the money formatters,
 * aggregates sum as bigint (mixed currencies throw), and nothing passes through
 * Number. Every word is overridable with a `labels` object. Feed the result to
 * a table with `toFinancialColumns` (FinancialTable, VirtualFinancialTable).
 *
 * @example
 * const columns = toFinancialColumns(holdingsColumns<Holding>({ locale: 'en-IN' }));
 * <FinancialTable columns={columns} rows={holdings} rowKey={(h) => h.symbol} totals ... />
 */
import { getMoneyFormatter, isMoney, type Money } from '../money/money.ts';
import { plainValue, type CellValue, type ColumnDef } from '../table-core/tableModel.ts';

/** Options every preset takes. @stability beta */
export interface PresetOptions<Labels> {
  /** Words for the column heads, in the reader's language. Only the keys you give are replaced. */
  labels?: Partial<Labels>;
  /** BCP 47 tag for money and quantity digits and separators. Default 'en'. */
  locale?: string;
  /** How the currency prints. Default 'code' (an unambiguous "NPR 1,234.50"). */
  display?: 'symbol' | 'code' | 'narrowSymbol' | 'none';
  /** Prints a date cell. Default: the ISO date (YYYY-MM-DD) for a Date, a string as given. */
  formatDate?: (value: Date | string) => string;
  /** Marks columns as sortable. Default true. */
  sortable?: boolean;
}

/** A preset's columns: strings in the cells, so they suit any table. @stability beta */
export type PresetColumns<Row> = ColumnDef<Row, string>[];

type Opts = PresetOptions<Record<string, string>>;

const plainDate = (value: Date | string) => (typeof value === 'string' ? value : plainValue(value));

function kit(options: Opts) {
  const { locale = 'en', display = 'code', formatDate = plainDate } = options;
  const sortable = options.sortable ?? true;
  const money = (value: Money | null | undefined) => (value ? getMoneyFormatter({ currency: value.currency, locale, display }).format(value.minor) : '');
  const count = (value: bigint | number | null | undefined) => (value === null || value === undefined ? '' : new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }).format(value));
  const show = (value: CellValue): string => (isMoney(value) ? money(value) : typeof value === 'bigint' || typeof value === 'number' ? count(value) : plainValue(value));
  const sum = { aggregate: 'sum', formatAggregate: show } as const;
  return { money, count, show, sum, formatDate, sortable };
}

/** Basis points (1/100 of a percent) as an exact "12.34%": bigint digits, no float. @stability beta */
export function formatBps(bps: bigint | number, locale = 'en'): string {
  const value = BigInt(bps);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const decimal = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(0.1).charAt(1);
  const frac = (abs % 100n).toString().padStart(2, '0');
  const grouped = new Intl.NumberFormat(locale).format(abs / 100n);
  return `${negative ? '-' : ''}${grouped}${decimal}${frac}%`;
}

// -- Holdings ---------------------------------------------------------------

/** A position in a holdings table. @stability beta */
export interface HoldingRow {
  /** The instrument's ticker or code. */
  symbol: string;
  /** The instrument's or customer's full name. */
  name?: string;
  /** Units held (a whole number). */
  quantity: bigint;
  /** Average cost per unit. */
  averageCost: Money;
  /** Current price per unit. */
  price: Money;
  /** Current market value of the position. */
  value: Money;
  /** Unrealised gain or loss (negative for a loss). */
  gain: Money;
  /** The gain as basis points of cost (1234n is 12.34%). */
  gainBps?: bigint;
}
/** Column heads for `holdingsColumns`. @stability beta */
export interface HoldingsLabels {
  /** The "symbol" column head. */
  symbol: string;
  /** The "name" column head. */
  name: string;
  /** The "quantity" column head. */
  quantity: string;
  /** The "averageCost" column head. */
  averageCost: string;
  /** The "price" column head. */
  price: string;
  /** The "value" column head. */
  value: string;
  /** The "gain" column head. */
  gain: string;
  /** The "gainPercent" column head. */
  gainPercent: string;
}
const HOLDINGS: HoldingsLabels = { symbol: 'Symbol', name: 'Name', quantity: 'Units', averageCost: 'Average cost', price: 'Price', value: 'Value', gain: 'Gain or loss', gainPercent: 'Return' };

/** Holdings: symbol, name, units, average cost, price, value, gain and return. Value and gain total; units and prices do not. @stability beta */
export function holdingsColumns<Row extends HoldingRow = HoldingRow>(options: PresetOptions<HoldingsLabels> = {}): PresetColumns<Row> {
  const l = { ...HOLDINGS, ...options.labels };
  const k = kit(options as Opts);
  const s = k.sortable;
  return [
    { id: 'symbol', header: l.symbol, kind: 'text', rowHeader: true, sortable: s, pin: 'left', accessor: (r) => r.symbol, cell: (r) => r.symbol },
    { id: 'name', header: l.name, kind: 'text', sortable: s, hideUnder: 760, accessor: (r) => r.name, cell: (r) => r.name ?? '' },
    { id: 'quantity', header: l.quantity, kind: 'quantity', sortable: s, accessor: (r) => r.quantity, cell: (r) => k.count(r.quantity) },
    { id: 'averageCost', header: l.averageCost, kind: 'price', sortable: s, hideUnder: 1024, accessor: (r) => r.averageCost, cell: (r) => k.money(r.averageCost) },
    { id: 'price', header: l.price, kind: 'price', sortable: s, accessor: (r) => r.price, cell: (r) => k.money(r.price) },
    { id: 'value', header: l.value, kind: 'money', sortable: s, accessor: (r) => r.value, cell: (r) => k.money(r.value), ...k.sum },
    { id: 'gain', header: l.gain, kind: 'money', sortable: s, accessor: (r) => r.gain, cell: (r) => k.money(r.gain), ...k.sum },
    { id: 'gainBps', header: l.gainPercent, kind: 'percent', sortable: s, hideUnder: 760, accessor: (r) => r.gainBps, cell: (r) => (r.gainBps === undefined ? '' : formatBps(r.gainBps, options.locale)) },
  ];
}

// -- Stock quotes -----------------------------------------------------------

/** A quote line in a market watchlist. @stability beta */
export interface StockQuoteRow {
  /** The instrument's ticker or code. */
  symbol: string;
  /** The instrument's or customer's full name. */
  name?: string;
  /** Last traded price. */
  last: Money;
  /** Change from the previous close, signed. */
  change: Money;
  /** The change in basis points (-125n is -1.25%). */
  changeBps: bigint;
  /** Units traded today. */
  volume?: bigint;
  /** Today's high. */
  high?: Money;
  /** Today's low. */
  low?: Money;
}
/** Column heads for `stockQuoteColumns`. @stability beta */
export interface StockQuoteLabels {
  /** The "symbol" column head. */
  symbol: string;
  /** The "name" column head. */
  name: string;
  /** The "last" column head. */
  last: string;
  /** The "change" column head. */
  change: string;
  /** The "changePercent" column head. */
  changePercent: string;
  /** The "volume" column head. */
  volume: string;
  /** The "high" column head. */
  high: string;
  /** The "low" column head. */
  low: string;
}
const QUOTES: StockQuoteLabels = { symbol: 'Symbol', name: 'Name', last: 'Last', change: 'Change', changePercent: 'Change %', volume: 'Volume', high: 'High', low: 'Low' };

/** Stock quotes: symbol, name, last, change, change %, volume, high, low. Nothing totals (a column of prices has no sum). @stability beta */
export function stockQuoteColumns<Row extends StockQuoteRow = StockQuoteRow>(options: PresetOptions<StockQuoteLabels> = {}): PresetColumns<Row> {
  const l = { ...QUOTES, ...options.labels };
  const k = kit(options as Opts);
  const s = k.sortable;
  return [
    { id: 'symbol', header: l.symbol, kind: 'text', rowHeader: true, sortable: s, pin: 'left', accessor: (r) => r.symbol, cell: (r) => r.symbol },
    { id: 'name', header: l.name, kind: 'text', sortable: s, hideUnder: 1024, accessor: (r) => r.name, cell: (r) => r.name ?? '' },
    { id: 'last', header: l.last, kind: 'price', sortable: s, accessor: (r) => r.last, cell: (r) => k.money(r.last) },
    { id: 'change', header: l.change, kind: 'price', sortable: s, hideUnder: 760, accessor: (r) => r.change, cell: (r) => k.money(r.change) },
    { id: 'changeBps', header: l.changePercent, kind: 'percent', sortable: s, accessor: (r) => r.changeBps, cell: (r) => formatBps(r.changeBps, options.locale) },
    { id: 'volume', header: l.volume, kind: 'quantity', sortable: s, hideUnder: 760, accessor: (r) => r.volume, cell: (r) => k.count(r.volume) },
    { id: 'high', header: l.high, kind: 'price', sortable: s, hideUnder: 1024, accessor: (r) => r.high, cell: (r) => k.money(r.high) },
    { id: 'low', header: l.low, kind: 'price', sortable: s, hideUnder: 1024, accessor: (r) => r.low, cell: (r) => k.money(r.low) },
  ];
}

// -- Ledger -----------------------------------------------------------------

/** A line in an account ledger. Give a debit or a credit (or both), and the running balance if you have it. @stability beta */
export interface LedgerRow {
  /** The posting date (an ISO date string or a Date). */
  date: Date | string;
  /** What the line is for. */
  description: string;
  /** A voucher, cheque or reference number. */
  reference?: string;
  /** Debit amount, or the debit column head. */
  debit?: Money;
  /** Credit amount, or the credit column head. */
  credit?: Money;
  /** The running balance after this line, or the column head. */
  balance?: Money;
}
/** Column heads for `ledgerColumns`. @stability beta */
export interface LedgerLabels {
  /** The "date" column head. */
  date: string;
  /** The "description" column head. */
  description: string;
  /** The "reference" column head. */
  reference: string;
  /** The "debit" column head. */
  debit: string;
  /** The "credit" column head. */
  credit: string;
  /** The "balance" column head. */
  balance: string;
}
const LEDGER: LedgerLabels = { date: 'Date', description: 'Description', reference: 'Reference', debit: 'Debit', credit: 'Credit', balance: 'Balance' };

/** Ledger: date, description, reference, debit, credit and running balance. Debit and credit total; the balance does not. @stability beta */
export function ledgerColumns<Row extends LedgerRow = LedgerRow>(options: PresetOptions<LedgerLabels> = {}): PresetColumns<Row> {
  const l = { ...LEDGER, ...options.labels };
  const k = kit(options as Opts);
  const s = k.sortable;
  return [
    { id: 'date', header: l.date, kind: 'date', sortable: s, accessor: (r) => (r.date instanceof Date ? r.date : r.date), cell: (r) => k.formatDate(r.date) },
    { id: 'description', header: l.description, kind: 'text', rowHeader: true, accessor: (r) => r.description, cell: (r) => r.description },
    { id: 'reference', header: l.reference, kind: 'text', hideUnder: 760, accessor: (r) => r.reference, cell: (r) => r.reference ?? '' },
    { id: 'debit', header: l.debit, kind: 'money', sortable: s, accessor: (r) => r.debit, cell: (r) => k.money(r.debit), ...k.sum },
    { id: 'credit', header: l.credit, kind: 'money', sortable: s, accessor: (r) => r.credit, cell: (r) => k.money(r.credit), ...k.sum },
    { id: 'balance', header: l.balance, kind: 'money', accessor: (r) => r.balance, cell: (r) => k.money(r.balance) },
  ];
}

// -- Bank statement ---------------------------------------------------------

/** A line on a bank statement. @stability beta */
export interface BankStatementLine {
  /** The posting date (an ISO date string or a Date). */
  date: Date | string;
  /** What the line is for. */
  description: string;
  /** A voucher, cheque or reference number. */
  reference?: string;
  /** Money out (a withdrawal or fee). */
  moneyOut?: Money;
  /** Money in (a deposit or interest). */
  moneyIn?: Money;
  /** The balance after this line. */
  balance: Money;
}
/** Column heads for `statementColumns`. @stability beta */
export interface StatementLabels {
  /** The "date" column head. */
  date: string;
  /** The "description" column head. */
  description: string;
  /** The "reference" column head. */
  reference: string;
  /** The "moneyOut" column head. */
  moneyOut: string;
  /** The "moneyIn" column head. */
  moneyIn: string;
  /** The "balance" column head. */
  balance: string;
}
const STATEMENT: StatementLabels = { date: 'Date', description: 'Description', reference: 'Reference', moneyOut: 'Money out', moneyIn: 'Money in', balance: 'Balance' };

/** Bank statement: date, description, reference, money out, money in and balance. Money out and in total; pair with `expectedTotals` to check them against the printed statement. @stability beta */
export function statementColumns<Row extends BankStatementLine = BankStatementLine>(options: PresetOptions<StatementLabels> = {}): PresetColumns<Row> {
  const l = { ...STATEMENT, ...options.labels };
  const k = kit(options as Opts);
  const s = k.sortable;
  return [
    { id: 'date', header: l.date, kind: 'date', sortable: s, accessor: (r) => r.date, cell: (r) => k.formatDate(r.date) },
    { id: 'description', header: l.description, kind: 'text', rowHeader: true, accessor: (r) => r.description, cell: (r) => r.description },
    { id: 'reference', header: l.reference, kind: 'text', hideUnder: 760, accessor: (r) => r.reference, cell: (r) => r.reference ?? '' },
    { id: 'moneyOut', header: l.moneyOut, kind: 'money', sortable: s, accessor: (r) => r.moneyOut, cell: (r) => k.money(r.moneyOut), ...k.sum },
    { id: 'moneyIn', header: l.moneyIn, kind: 'money', sortable: s, accessor: (r) => r.moneyIn, cell: (r) => k.money(r.moneyIn), ...k.sum },
    { id: 'balance', header: l.balance, kind: 'money', accessor: (r) => r.balance, cell: (r) => k.money(r.balance) },
  ];
}

// -- Receivables aging ------------------------------------------------------

/** What one customer owes, by how late it is. All buckets in one currency. @stability beta */
export interface AgingLine {
  /** The customer or supplier. */
  party: string;
  /** Not yet due. */
  current: Money;
  /** 1 to 30 days late. */
  days1to30: Money;
  /** 31 to 60 days late. */
  days31to60: Money;
  /** 61 to 90 days late. */
  days61to90: Money;
  /** More than 90 days late. */
  over90: Money;
  /** Everything owed, or the column head. */
  total: Money;
}
/** Column heads for `agingColumns`. @stability beta */
export interface AgingLabels {
  /** The "party" column head. */
  party: string;
  /** The "current" column head. */
  current: string;
  /** The "days1to30" column head. */
  days1to30: string;
  /** The "days31to60" column head. */
  days31to60: string;
  /** The "days61to90" column head. */
  days61to90: string;
  /** The "over90" column head. */
  over90: string;
  /** The "total" column head. */
  total: string;
}
const AGING: AgingLabels = { party: 'Customer', current: 'Current', days1to30: '1 to 30 days', days31to60: '31 to 60 days', days61to90: '61 to 90 days', over90: 'Over 90 days', total: 'Total' };

/** Receivables aging: customer, five buckets and the total, every bucket summed exactly. @stability beta */
export function agingColumns<Row extends AgingLine = AgingLine>(options: PresetOptions<AgingLabels> = {}): PresetColumns<Row> {
  const l = { ...AGING, ...options.labels };
  const k = kit(options as Opts);
  const s = k.sortable;
  const bucket = (id: 'current' | 'days1to30' | 'days31to60' | 'days61to90' | 'over90' | 'total', hideUnder?: 760 | 1024): ColumnDef<Row, string> => ({
    id, header: l[id], kind: 'money', sortable: s, hideUnder, accessor: (r) => r[id], cell: (r) => k.money(r[id]), ...k.sum,
  });
  return [
    { id: 'party', header: l.party, kind: 'text', rowHeader: true, sortable: s, pin: 'left', accessor: (r) => r.party, cell: (r) => r.party },
    bucket('current', 1024), bucket('days1to30', 1024), bucket('days31to60', 760), bucket('days61to90', 760), bucket('over90'), bucket('total'),
  ];
}

// -- Trial balance ----------------------------------------------------------

/** An account on a trial balance. @stability beta */
export interface TrialBalanceRow {
  /** The account code. */
  code: string;
  /** The account name. */
  account: string;
  /** Debit amount, or the debit column head. */
  debit?: Money;
  /** Credit amount, or the credit column head. */
  credit?: Money;
}
/** Column heads for `trialBalanceColumns`. @stability beta */
export interface TrialBalancePresetLabels {
  /** The "code" column head. */
  code: string;
  /** The "account" column head. */
  account: string;
  /** The "debit" column head. */
  debit: string;
  /** The "credit" column head. */
  credit: string;
}
const TRIAL: TrialBalancePresetLabels = { code: 'Code', account: 'Account', debit: 'Debit', credit: 'Credit' };

/** Trial balance: account code, account, debit and credit. Totals must match: reconcile one against the other with `reconcile`. @stability beta */
export function trialBalanceColumns<Row extends TrialBalanceRow = TrialBalanceRow>(options: PresetOptions<TrialBalancePresetLabels> = {}): PresetColumns<Row> {
  const l = { ...TRIAL, ...options.labels };
  const k = kit(options as Opts);
  const s = k.sortable;
  return [
    { id: 'code', header: l.code, kind: 'text', sortable: s, pin: 'left', accessor: (r) => r.code, cell: (r) => r.code },
    { id: 'account', header: l.account, kind: 'text', rowHeader: true, sortable: s, accessor: (r) => r.account, cell: (r) => r.account },
    { id: 'debit', header: l.debit, kind: 'money', sortable: s, accessor: (r) => r.debit, cell: (r) => k.money(r.debit), ...k.sum },
    { id: 'credit', header: l.credit, kind: 'money', sortable: s, accessor: (r) => r.credit, cell: (r) => k.money(r.credit), ...k.sum },
  ];
}

export { toFinancialColumn, toFinancialColumns } from '../table-core/tableModel.ts';
