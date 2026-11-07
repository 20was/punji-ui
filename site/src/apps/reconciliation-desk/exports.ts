// CSV for the reconciliation desk. Every cell goes through the library's `toCsv` (via TableExport), which prefixes
// text a spreadsheet could run as a formula (= + - @), so a bank narration typed by a payer cannot execute.
// Amounts are exact decimal text from bigint paisa, with `keepNumericText` so negatives stay numbers.
import type { CsvColumn } from '@punji/ui/export';
import type { ReconcileItem, ReconcileMatch } from '@punji/ui/reconciliation-matcher';
import { decimal, isoDate } from '../shared/books.ts';
import type { ReconException } from './store.ts';

export interface LineRow {
  item: ReconcileItem;
  side: 'Statement' | 'Ledger';
  /** The match the line is in, or empty when it is open. */
  match: string;
}

export const LINE_COLUMNS: readonly CsvColumn<LineRow>[] = [
  { header: 'Side', accessor: 'side' },
  { header: 'Id', accessor: (r) => r.item.id },
  { header: 'Date', accessor: (r) => isoDate(r.item.date) },
  { header: 'Description', accessor: (r) => r.item.description },
  { header: 'Reference', accessor: (r) => r.item.reference },
  { header: 'Amount (NPR)', accessor: (r) => r.item.amount, format: (v) => decimal(v as bigint), keepNumericText: true },
  { header: 'Status', accessor: (r) => (r.match ? 'Matched' : 'Open') },
  { header: 'Match', accessor: 'match' },
];

export interface ExceptionRow {
  exception: ReconException;
  acknowledged: boolean;
}

export const EXCEPTION_COLUMNS: readonly CsvColumn<ExceptionRow>[] = [
  { header: 'Kind', accessor: (r) => r.exception.kind },
  { header: 'Severity', accessor: (r) => (r.exception.tone === 'danger' ? 'High' : r.exception.tone === 'warn' ? 'Medium' : 'Low') },
  { header: 'Status', accessor: (r) => (r.acknowledged ? 'Acknowledged' : 'Open') },
  { header: 'Title', accessor: (r) => r.exception.title },
  { header: 'Detail', accessor: (r) => r.exception.detail },
  { header: 'Statement lines', accessor: (r) => r.exception.statementIds.join(' ') },
  { header: 'Ledger entries', accessor: (r) => r.exception.ledgerIds.join(' ') },
];

/** Open exceptions first, then the acknowledged ones. */
export const exceptionRows = (open: readonly ReconException[], acknowledged: readonly ReconException[]): ExceptionRow[] => [
  ...open.map((exception) => ({ exception, acknowledged: false })),
  ...acknowledged.map((exception) => ({ exception, acknowledged: true })),
];

/** The statement and ledger lines as export rows, each with the match it is in. */
export function lineRows(statement: readonly ReconcileItem[], ledger: readonly ReconcileItem[], matches: readonly ReconcileMatch[]): LineRow[] {
  const inS = new Map(matches.flatMap((m) => m.statementIds.map((id) => [id, m.id] as const)));
  const inL = new Map(matches.flatMap((m) => m.ledgerIds.map((id) => [id, m.id] as const)));
  return [
    ...statement.map((item) => ({ item, side: 'Statement' as const, match: inS.get(item.id) ?? '' })),
    ...ledger.map((item) => ({ item, side: 'Ledger' as const, match: inL.get(item.id) ?? '' })),
  ];
}
