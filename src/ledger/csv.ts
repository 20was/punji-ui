/**
 * ledgerToCsv: a general ledger as RFC 4180 CSV through `toCsv`, so spreadsheet
 * formula neutralisation stays on for every text cell (account, reference,
 * description). Amounts are exact decimal text at the currency's minor-unit
 * scale, never floats; dates are ISO YYYY-MM-DD. No React, no browser globals.
 */
import { toCsv, type CsvColumn, type CsvOptions } from '../export/csv.ts';
import { currencyExponent } from '../money/money.ts';
import { minorUnitsToDecimal } from '../nepal/money.ts';
import { runningBalance, type LedgerEntry, type NormalSide } from './core.ts';

export interface LedgerCsvOptions extends CsvOptions {
  /** ISO 4217 code that decides the decimal places ('NPR' 2, 'JPY' 0). Default: use `exponent`. */
  currency?: string;
  /** Minor-unit digits when no `currency` is given. Default 2. */
  exponent?: number;
  /** Add an exact running "Balance" column, signed so that a debit balance is positive and a credit balance negative. */
  balance?: boolean;
  /** The account's normal side; used with `balance`. Default 'debit'. */
  normal?: NormalSide;
  /** Opening balance on the normal side, for the running balance. Default 0n. */
  opening?: bigint;
  /** Column headings, to translate or rename. */
  headers?: Partial<Record<'date' | 'reference' | 'account' | 'description' | 'debit' | 'credit' | 'balance', string>>;
}

interface Row { entry: LedgerEntry; net: bigint }
const pad = (value: number, length: number) => String(value).padStart(length, '0');

/** Exact CSV of ledger entries in the order given. Amounts such as "-1250.50" stay numeric; text starting = + - @ gets an apostrophe. */
export function ledgerToCsv(entries: readonly LedgerEntry[], options: LedgerCsvOptions = {}): string {
  const { currency, exponent = 2, balance = false, normal = 'debit', opening = 0n, headers = {}, ...csv } = options;
  const scale = currency === undefined ? exponent : currencyExponent(currency);
  const amount = (value: unknown) => minorUnitsToDecimal(value as bigint, scale);
  const running = balance ? runningBalance(entries, { normal, opening }) : null;
  const rows: Row[] = entries.map((entry, index) => ({ entry, net: running ? (normal === 'debit' ? running[index]!.balance : -running[index]!.balance) : 0n }));
  const columns: CsvColumn<Row>[] = [
    { header: headers.date ?? 'Date', accessor: row => `${pad(row.entry.date.year, 4)}-${pad(row.entry.date.month, 2)}-${pad(row.entry.date.day, 2)}` },
    { header: headers.reference ?? 'Reference', accessor: row => row.entry.reference ?? '' },
    { header: headers.account ?? 'Account', accessor: row => row.entry.account },
    { header: headers.description ?? 'Description', accessor: row => row.entry.description ?? '' },
    { header: headers.debit ?? 'Debit', accessor: row => row.entry.debit, format: amount, keepNumericText: true },
    { header: headers.credit ?? 'Credit', accessor: row => row.entry.credit, format: amount, keepNumericText: true },
    ...(balance ? [{ header: headers.balance ?? 'Balance', accessor: (row: Row) => row.net, format: amount, keepNumericText: true }] : []),
  ];
  return toCsv(rows, columns, csv);
}
