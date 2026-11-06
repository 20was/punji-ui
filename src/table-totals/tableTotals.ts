/**
 * Opt-in grouping, subtotals, totals and reconciliation for FinancialTable and
 * VirtualFinancialTable. Pass `tableTotals` as `totalsEngine` to have them in
 * the first paint and in server output; without it the tables load the same
 * code on demand. A table that never groups or totals never bundles it.
 */
export { tableTotals } from '../internal/tableTotals.tsx';
export type { TableTotalsEngine, TableTotalsLabels } from '../internal/tableTotals.tsx';
