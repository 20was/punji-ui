/**
 * Tax deducted at source (TDS): the tax withheld on each payment and the totals by category, for a TDS summary or
 * the working behind a return. Categories and rates are your data (rent, contract payments, service fees, interest);
 * the package ships no rate table. Exact bigint arithmetic with the caller's RoundingMode.
 */
import { applyRate, type RoundingMode } from '../calculations/rounding.ts';
import { toCsv, type CsvColumn, type CsvOptions } from '../export/csv.ts';
import { minorUnitsToDecimal } from '../nepal/money.ts';

export interface TdsEntryInput {
  /** Stable id (a voucher or payment number). */
  id: string;
  /** Who was paid. */
  party: string;
  /** Their PAN, as recorded. */
  pan?: string;
  /** Your category key or name ("Rent", "Contract payment"). Entries with the same category are summed together. */
  category: string;
  /** Amount paid before withholding, in minor units. */
  gross: bigint;
  /** Withholding rate as a decimal fraction ('0.015' for 1.5%). */
  rate: string;
  /** Tax actually withheld, when it differs from gross × rate (a lower-rate certificate, a correction). Used as given. */
  withheld?: bigint;
}

export interface TdsEntry extends TdsEntryInput {
  /** Tax withheld: `withheld` if given, else gross × rate rounded. */
  tds: bigint;
  /** gross − tds: what the party received. */
  net: bigint;
}

export interface TdsCategoryTotal {
  category: string;
  /** The rate when every entry in the category has the same one, else null. */
  rate: string | null;
  count: number;
  gross: bigint;
  tds: bigint;
}

export interface TdsSummaryResult {
  entries: TdsEntry[];
  categories: TdsCategoryTotal[];
  totals: { gross: bigint; tds: bigint; net: bigint };
}

/** Withholding per entry and totals per category, in the order categories first appear. */
export function summariseTds(entries: readonly TdsEntryInput[], options: { rounding: RoundingMode }): TdsSummaryResult {
  const out: TdsEntry[] = [];
  const byCategory = new Map<string, TdsCategoryTotal>();
  let gross = 0n, tds = 0n;
  for (const entry of entries) {
    if (typeof entry.gross !== 'bigint' || entry.gross < 0n) throw new RangeError(`TDS entry ${entry.id}: gross must be a non-negative bigint`);
    if (entry.withheld !== undefined && (typeof entry.withheld !== 'bigint' || entry.withheld < 0n || entry.withheld > entry.gross)) {
      throw new RangeError(`TDS entry ${entry.id}: withheld must be from zero to the gross amount`);
    }
    const tax = entry.withheld ?? applyRate(entry.gross, entry.rate, options.rounding);
    out.push({ ...entry, tds: tax, net: entry.gross - tax });
    const total = byCategory.get(entry.category) ?? { category: entry.category, rate: entry.rate, count: 0, gross: 0n, tds: 0n };
    if (total.rate !== entry.rate) total.rate = null;
    total.count += 1;
    total.gross += entry.gross;
    total.tds += tax;
    byCategory.set(entry.category, total);
    gross += entry.gross;
    tds += tax;
  }
  return { entries: out, categories: [...byCategory.values()], totals: { gross, tds, net: gross - tds } };
}

export interface TdsCsvOptions extends CsvOptions {
  rounding: RoundingMode;
  /** Minor-unit digits. Default 2. */
  exponent?: number;
  /** Column headings, to translate or rename. */
  headers?: Partial<Record<'party' | 'pan' | 'category' | 'gross' | 'rate' | 'tds' | 'net', string>>;
}

/** Exact CSV of TDS entries (amounts such as "1500.00" stay numeric; text starting = + - @ gets an apostrophe). */
export function tdsToCsv(entries: readonly TdsEntryInput[], options: TdsCsvOptions): string {
  const { rounding, exponent = 2, headers = {}, ...csv } = options;
  const amount = (value: unknown) => minorUnitsToDecimal(value as bigint, exponent);
  const columns: CsvColumn<TdsEntry>[] = [
    { header: headers.party ?? 'Party', accessor: 'party' },
    { header: headers.pan ?? 'PAN', accessor: (row) => row.pan ?? '' },
    { header: headers.category ?? 'Category', accessor: 'category' },
    { header: headers.gross ?? 'Gross', accessor: 'gross', format: amount, keepNumericText: true },
    { header: headers.rate ?? 'Rate', accessor: 'rate', keepNumericText: true },
    { header: headers.tds ?? 'TDS', accessor: 'tds', format: amount, keepNumericText: true },
    { header: headers.net ?? 'Net', accessor: 'net', format: amount, keepNumericText: true },
  ];
  return toCsv(summariseTds(entries, { rounding }).entries, columns, csv);
}
