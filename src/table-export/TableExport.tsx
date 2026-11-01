'use client';

/**
 * TableExport: CSV export controls for a table's visible, all or selected rows,
 * over the formula-neutralising `toCsv` (docs/EXPORT.md). Formula
 * neutralisation cannot be turned off here. The file is made in the browser
 * from the rows you pass; nothing is sent anywhere.
 */
import { useState } from 'react';
import { toCsv, type CsvColumn, type CsvOptions } from '../export/csv.ts';
import { downloadText } from '../download/downloadText.ts';
import { buttonClass } from '../button/Button.tsx';

/** Which rows an export holds. */
export type ExportScope = 'visible' | 'all' | 'selected';

/** The rows of `rows` whose key is in `ids`, in table order (not selection order). */
export function rowsWithIds<T>(rows: readonly T[], ids: Iterable<string>, rowKey: (row: T) => string): T[] {
  const wanted = new Set(ids);
  return wanted.size === 0 ? [] : rows.filter((row) => wanted.has(rowKey(row)));
}

export interface TableExportProps<T> {
  /** The CSV columns: header, accessor and, for money, Date or bigint, a `format`. */
  columns: readonly CsvColumn<T>[];
  /** The file name, or one per scope. ".csv" is added when missing; the name is sanitised. */
  filename: string | ((scope: ExportScope) => string);
  /** The rows the table shows now (after search and filters). Omit to hide the button. */
  visibleRows?: readonly T[];
  /** Every row, before search and filters. Omit to hide the button. */
  allRows?: readonly T[];
  /** The selected rows (see `rowsWithIds`). Omit to hide the button; empty disables it. */
  selectedRows?: readonly T[];
  /** Names the group of buttons. Default "Export CSV". */
  label?: string;
  /** A button's words for a scope and its row count. Default "Visible (1,234)". */
  scopeLabel?: (scope: ExportScope, count: number) => string;
  /** Announced after a file is made. Default "Exported 1,234 rows". */
  doneLabel?: (count: number, scope: ExportScope) => string;
  /** Announced when the browser cannot save the file. Default "The file could not be saved". */
  errorLabel?: string;
  /** CSV options. A UTF-8 byte order mark is on by default so Excel reads Devanagari. Formula neutralisation is always on. */
  csv?: Omit<CsvOptions, 'neutralizeFormulas'>;
  /** Called after a file is made, for example to log the export. Rows are not passed. */
  onExport?: (scope: ExportScope, count: number) => void;
  /** Test id prefix: buttons are `${prefix}-${scope}`. */
  testIdPrefix?: string;
}

const count = (n: number) => n.toLocaleString('en-IN');
const SCOPE_WORDS: Record<ExportScope, string> = { visible: 'Visible', all: 'All', selected: 'Selected' };

/** Export buttons for visible, all and selected rows. Each makes a CSV file from the rows you pass. */
export function TableExport<T>({ columns, filename, visibleRows, allRows, selectedRows, label = 'Export CSV', scopeLabel, doneLabel, errorLabel = 'The file could not be saved', csv, onExport, testIdPrefix }: TableExportProps<T>) {
  const [message, setMessage] = useState('');
  const scopes: [ExportScope, readonly T[] | undefined][] = [['visible', visibleRows], ['all', allRows], ['selected', selectedRows]];
  const run = (scope: ExportScope, rows: readonly T[]) => {
    const text = toCsv(rows, columns, { bom: true, ...csv, neutralizeFormulas: true });
    const base = typeof filename === 'function' ? filename(scope) : filename;
    try {
      downloadText(/\.csv$/i.test(base) ? base : `${base}.csv`, text, 'text/csv;charset=utf-8');
    } catch {
      setMessage(errorLabel);
      return;
    }
    setMessage(doneLabel ? doneLabel(rows.length, scope) : `Exported ${count(rows.length)} rows`);
    onExport?.(scope, rows.length);
  };
  return (
    <div className="pu-table-export" role="group" aria-label={label}>
      <span className="pu-table-export-label" aria-hidden="true">{label}</span>
      {scopes.map(([scope, rows]) => rows && (
        <button key={scope} type="button" className={buttonClass({ variant: 'secondary', size: 'sm' })} disabled={rows.length === 0} onClick={() => run(scope, rows)}
          data-testid={testIdPrefix ? `${testIdPrefix}-${scope}` : undefined}>
          {scopeLabel ? scopeLabel(scope, rows.length) : `${SCOPE_WORDS[scope]} (${count(rows.length)})`}
        </button>
      ))}
      <span className="kit-sr" role="status" aria-live="polite">{message}</span>
    </div>
  );
}
