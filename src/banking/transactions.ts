/**
 * Transaction shapes and the CSV export, pure. Amounts are signed bigint minor
 * units from the account holder's view: negative leaves the account (a debit),
 * positive enters it (a credit). The CSV goes through `toCsv`, so spreadsheet
 * formula neutralisation is on for every text cell (counterparty, reference,
 * category). Dates are ISO YYYY-MM-DD and amounts exact decimal text.
 */
import { toCsv, type CsvColumn, type CsvOptions } from '../export/csv.ts';
import { currencyExponent } from '../money/money.ts';
import { minorUnitsToDecimal } from '../nepal/money.ts';

export type TransactionStatusValue = 'completed' | 'pending' | 'failed' | 'reversed';
export type TransactionDirection = 'debit' | 'credit';

export interface BankTransaction {
  /** Stable unique id: the row key, so a page change or a re-sort does not remount rows. */
  id: string;
  /** Calendar date as YYYY-MM-DD (Gregorian). The list groups by it and never reads it in the host time zone. */
  date: string;
  /** Who was paid or who paid (a merchant, a person, a wallet). Untrusted text; it is escaped, never parsed. */
  counterparty: string;
  /** Signed minor units: negative is money out (debit), positive money in (credit). */
  amount: bigint;
  /** Where the entry stands. */
  status: TransactionStatusValue;
  /** The bank's or wallet's reference for the entry. */
  reference?: string;
  /** A label the caller assigns ("Utilities"). */
  category?: string;
  /** Running balance after this entry, minor units. Supplied by the caller; never computed from a partial page. */
  balance?: bigint | null;
}

/** Money out is a debit, money in a credit (the account holder's view). */
export function directionOf(amount: bigint): TransactionDirection {
  return amount < 0n ? 'debit' : 'credit';
}

export interface TransactionsCsvOptions extends CsvOptions {
  /** ISO 4217 code that decides the decimal places ('NPR' 2, 'JPY' 0). Default: use `exponent`. */
  currency?: string;
  /** Minor-unit digits when no `currency` is given. Default 2. */
  exponent?: number;
  /** Add the running balance column when transactions carry one. Default false. */
  balance?: boolean;
  /** Column headings, to translate or rename. */
  headers?: Partial<Record<'date' | 'counterparty' | 'reference' | 'category' | 'direction' | 'amount' | 'status' | 'balance', string>>;
}

/** Exact CSV of transactions in the order given. Amounts such as "-1250.50" stay numeric; text starting = + - @ gets an apostrophe. */
export function transactionsToCsv(transactions: readonly BankTransaction[], options: TransactionsCsvOptions = {}): string {
  const { currency, exponent = 2, balance = false, headers = {}, ...csv } = options;
  const scale = currency === undefined ? exponent : currencyExponent(currency);
  const amount = (value: unknown) => (typeof value === 'bigint' ? minorUnitsToDecimal(value, scale) : '');
  const columns: CsvColumn<BankTransaction>[] = [
    { header: headers.date ?? 'Date', accessor: 'date' },
    { header: headers.counterparty ?? 'Counterparty', accessor: 'counterparty' },
    { header: headers.reference ?? 'Reference', accessor: (t) => t.reference ?? '' },
    { header: headers.category ?? 'Category', accessor: (t) => t.category ?? '' },
    { header: headers.direction ?? 'Direction', accessor: (t) => directionOf(t.amount) },
    { header: headers.amount ?? 'Amount', accessor: 'amount', format: amount, keepNumericText: true },
    { header: headers.status ?? 'Status', accessor: 'status' },
    ...(balance ? [{ header: headers.balance ?? 'Balance', accessor: (t: BankTransaction) => t.balance, format: amount, keepNumericText: true }] : []),
  ];
  return toCsv(transactions, columns, csv);
}
