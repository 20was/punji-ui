/**
 * Shared by FinancialTable and VirtualFinancialTable: the words for groups and
 * totals, how an aggregate cell is drawn and the reconciliation badge.
 */
import type { ReactNode } from 'react';
import type { Money } from '../money/money.ts';
import { plainValue, type CellValue, type ColumnDef } from '../table-core/tableModel.ts';
import { footerTotals, groupRows, reconcileTotals, type Reconciliation, type ColumnTotals } from '../table-core/tableAggregate.ts';

/** Words for grouped rows, the totals row and the reconciliation badge. Pass them in the reader's language. @stability beta */
export interface TableTotalsLabels {
  /** The totals row's header. Default "Total". */
  total: string;
  /** The row count after a group's name, e.g. "3 rows". */
  groupCount: (count: number) => string;
  /** The badge when a total equals its expected value. Default "Reconciles". */
  reconciled: string;
  /** Printed before the difference when it does not. Default "Off by". */
  mismatch: string;
  /** Printed before the expected value on a mismatch. Default "expected". */
  expected: string;
}

const DEFAULT_TOTALS_LABELS: TableTotalsLabels = {
  total: 'Total',
  groupCount: (count) => `${count} ${count === 1 ? 'row' : 'rows'}`,
  reconciled: 'Reconciles',
  mismatch: 'Off by',
  expected: 'expected',
};

/** An aggregate drawn by the column's `formatAggregate`, else plainly and exactly. */
function aggregateNode<Row>(def: ColumnDef<Row, ReactNode>, value: CellValue, rows: readonly Row[]): ReactNode {
  if (value === undefined) return null;
  return def.formatAggregate ? def.formatAggregate(value, rows) : plainValue(value);
}

function reconcileOrEmpty(totals: ColumnTotals, expected: Readonly<Record<string, Money>> | undefined): Record<string, Reconciliation> {
  return expected ? reconcileTotals(totals, expected) : {};
}

/** A visible word and icon (never colour alone): "Reconciles", or "Off by NPR 1.00, expected NPR 100.00". */
function ReconcileBadge<Row>({ result, def, rows, labels }: { result: Reconciliation; def: ColumnDef<Row, ReactNode>; rows: readonly Row[]; labels: TableTotalsLabels }) {
  const ok = result.status === 'ok';
  return (
    <span className={`kit-recon ${ok ? 'ok' : 'mismatch'}`}>
      <span aria-hidden="true">{ok ? '✓' : '!'}</span>
      {ok ? labels.reconciled : <>{labels.mismatch} {aggregateNode(def, result.difference, rows)}<span className="kit-recon-expected">, {labels.expected} {aggregateNode(def, result.expected, rows)}</span></>}
    </span>
  );
}

/**
 * Everything grouping, subtotals, totals and reconciliation need, in one object:
 * what FinancialTable and VirtualFinancialTable use, for your own table.
 * @stability beta
 */
export interface TableTotalsEngine {
  /** The default words for groups, totals and reconciliation. */
  defaultLabels: TableTotalsLabels;
  /** Groups rows by key, with subtotals. */
  groupRows: typeof groupRows;
  /** Totals each aggregate column over rows. */
  footerTotals: typeof footerTotals;
  /** Reconciles totals against expected ones (none given: nothing). */
  reconcileOrEmpty: typeof reconcileOrEmpty;
  /** Draws an aggregate with the column's formatter. */
  aggregateNode: typeof aggregateNode;
  /** The word-and-icon reconciliation badge. */
  ReconcileBadge: typeof ReconcileBadge;
}

/** The grouping and totals engine the tables use. @stability beta */
export const tableTotals: TableTotalsEngine = { defaultLabels: DEFAULT_TOTALS_LABELS, groupRows, footerTotals, reconcileOrEmpty, aggregateNode, ReconcileBadge };
