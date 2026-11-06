/**
 * table-core, the arithmetic half: aggregates, per-group subtotals, footer totals
 * and the reconciliation of a computed total against an expected one. Split from
 * ./tableModel.ts so a table that never groups or totals does not bundle it.
 * Money stays exact (bigint minor units); a sum across currencies throws.
 */
import type { Money } from '../money/money.ts';
import { code, compareValues, isMissing, isMoneyValue, type CellValue, type ColumnDef } from './tableModel.ts';

/** Thrown when Money in two currencies would be summed, compared or reconciled. @stability beta */
export class MixedCurrencyError extends TypeError {
  readonly currencies: readonly [string, string];
  constructor(a: string, b: string) {
    super(`Cannot combine ${a} and ${b}: convert first`);
    this.name = 'MixedCurrencyError';
    this.currencies = [a, b];
  }
}

const moneyOf = (minor: bigint, currency: string): Money => Object.freeze({ minor, currency });

const typeOf = (v: CellValue) => (isMoneyValue(v) ? 'money' : typeof v);

// Exact for Money and bigint (bigint addition); one type per column, one currency per Money column.
function sum(values: readonly CellValue[]): CellValue {
  if (!values.length) return null;
  const first = values[0];
  const type = typeOf(first);
  if (type !== 'money' && type !== 'bigint' && type !== 'number') throw new TypeError(`Cannot sum ${type} values`);
  const currency = isMoneyValue(first) ? code(first) : '';
  let total: bigint | number = type === 'number' ? 0 : 0n;
  for (const v of values) {
    if (typeOf(v) !== type) throw new TypeError(`Cannot sum ${type} with ${typeOf(v)}`);
    if (isMoneyValue(v)) {
      if (code(v) !== currency) throw new MixedCurrencyError(currency, code(v));
      total = (total as bigint) + v.minor;
    } else total = (total as number) + (v as number);
  }
  return type === 'money' ? moneyOf(total as bigint, currency) : total;
}

function extreme(values: readonly CellValue[], sign: 1 | -1): CellValue {
  let best: CellValue = null;
  for (const v of values) {
    if (isMissing(v)) continue;
    if (isMissing(best)) { best = v; continue; }
    if (isMoneyValue(best) && isMoneyValue(v) && code(best) !== code(v)) throw new MixedCurrencyError(code(best), code(v));
    if (compareValues(v, best) * sign > 0) best = v;
  }
  return best;
}

/** One column's aggregate over `rows` (missing values skipped). Throws `MixedCurrencyError` for Money in two currencies. @stability beta */
export function aggregateColumn<Row>(column: Pick<ColumnDef<Row>, 'aggregate' | 'accessor'>, rows: readonly Row[]): CellValue {
  const { aggregate, accessor } = column;
  if (!aggregate) return undefined;
  const values: CellValue[] = [];
  for (const row of rows) {
    const v = accessor?.(row);
    if (!isMissing(v)) values.push(v);
  }
  switch (aggregate) {
    case 'sum': return sum(values);
    case 'count': return values.length;
    case 'min': return extreme(values, -1);
    case 'max': return extreme(values, 1);
    default: return aggregate(values, rows);
  }
}

/** Aggregates by column id, for columns with an `aggregate`. @stability beta */
export type ColumnTotals = Readonly<Record<string, CellValue>>;

/** The footer row: each aggregate column's value over every row. @stability beta */
export function footerTotals<Row>(rows: readonly Row[], columns: readonly ColumnDef<Row, unknown>[]): ColumnTotals {
  const out: Record<string, CellValue> = {};
  for (const column of columns) if (column.aggregate) out[column.id] = aggregateColumn(column, rows);
  return out;
}

/** A group of rows and its subtotals. @stability beta */
export interface RowGroup<Row> {
  /** The group key `by` returned. */
  key: string;
  /** The group's rows, in their input order. */
  rows: readonly Row[];
  /** Each aggregate column's value over the group's rows. */
  subtotals: ColumnTotals;
}

/**
 * Groups rows by key. Groups come in order of each key's first appearance and
 * rows keep their input order, so sort before grouping to order both. Subtotals
 * are computed for every column with an `aggregate`.
 * @stability beta
 */
export function groupRows<Row>(rows: readonly Row[], by: (row: Row) => string, columns: readonly ColumnDef<Row, unknown>[] = []): RowGroup<Row>[] {
  const buckets = new Map<string, Row[]>();
  for (const row of rows) {
    const key = by(row);
    let bucket = buckets.get(key);
    if (!bucket) buckets.set(key, (bucket = []));
    bucket.push(row);
  }
  return [...buckets].map(([key, members]) => ({ key, rows: members, subtotals: footerTotals(members, columns) }));
}

/** The outcome of checking a computed total against an expected one. `difference` is computed minus expected. @stability beta */
export interface Reconciliation {
  status: 'ok' | 'mismatch';
  expected: Money;
  computed: Money;
  difference: Money;
}

/** Checks a computed total against an expected one (a statement balance, a control total). Exact; throws `MixedCurrencyError` across currencies. @stability beta */
export function reconcile(expected: Money, computed: Money): Reconciliation {
  if (code(expected) !== code(computed)) throw new MixedCurrencyError(code(expected), code(computed));
  const difference = moneyOf(computed.minor - expected.minor, code(expected));
  return { status: difference.minor === 0n ? 'ok' : 'mismatch', expected, computed, difference };
}

/**
 * Reconciles footer totals against expected totals by column id. A column whose
 * computed total is missing (no rows) counts as zero in the expected currency; a
 * computed value that is not Money throws a TypeError.
 * @stability beta
 */
export function reconcileTotals(totals: ColumnTotals, expected: Readonly<Record<string, Money>>): Record<string, Reconciliation> {
  const out: Record<string, Reconciliation> = {};
  for (const [id, want] of Object.entries(expected)) {
    const got = totals[id];
    if (isMissing(got)) out[id] = reconcile(want, moneyOf(0n, code(want)));
    else if (isMoneyValue(got)) out[id] = reconcile(want, got);
    else throw new TypeError(`Total ${id} is not Money; only Money totals reconcile`);
  }
  return out;
}

