/**
 * table-core: one column model (`ColumnDef<Row>`) for every Punji table, and the
 * pure arithmetic tables need: bigint-safe sorting, per-group subtotals, footer
 * totals and the reconciliation of a computed total against an expected one.
 *
 * No React, no DOM. The model and sorting live in ./tableModel.ts and the
 * aggregates in ./tableAggregate.ts; this file is the public subpath.
 */
export {
  columnAlign, compareRowsBy, compareValues, fromColumn, fromFinancialColumn, isMissing, isNumericKind, plainValue, sortRows, sortValueOf, toFinancialColumn, toFinancialColumns,
} from './tableModel.ts';
export type {
  AggregateFn, AggregateName, CellValue, ColumnAggregate, ColumnDef, ColumnKind, ColumnLike, ColumnSortRule, FinancialColumnLike, HideUnder, SortKey,
} from './tableModel.ts';
export { MixedCurrencyError, aggregateColumn, footerTotals, groupRows, reconcile, reconcileTotals } from './tableAggregate.ts';
export type { ColumnTotals, Reconciliation, RowGroup } from './tableAggregate.ts';
