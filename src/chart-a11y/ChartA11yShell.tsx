'use client';

/**
 * ChartA11yShell (design.punji.app/components/chart-a11y-shell): the accessible half of a chart, factored out so any
 * renderer (SVG, canvas, a third-party library) can wear it. It owns
 *   - the `<figure>` named by `label`;
 *   - the one focus stop (`plotProps`): arrow keys, Home, End and Escape move a cursor, the pointer reads one position;
 *   - the polite live region that speaks the active position (`speak(index)`);
 *   - the keyboard hint, and an optional spoken summary of the whole series;
 *   - the visually hidden data table (`table`), so every figure can be read by row.
 * The renderer draws; the shell never measures or paints. The drawing should be `aria-hidden`.
 */
import { useId, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react';

import { useChartCursor } from '../internal/chartFrame.tsx';

export interface ChartA11yContext {
  /** The active position, or null. Set by the pointer or the keyboard. */
  index: number | null;
  /** Let a pointer handler set (or clear, with null) the active position. */
  pointerTo: (index: number | null) => void;
  /** Spread onto the plot element (the one focus stop). Pass a pointer handler that maps the event to an index. Empty when the shell is not interactive. */
  plotProps: (onPointer?: (event: PointerEvent<HTMLDivElement>) => void) => HTMLAttributes<HTMLDivElement>;
}

export interface ChartA11yShellProps {
  /** Names the figure, the plot and the data table. */
  label: string;
  /** Read after the name, such as "line chart". */
  roleDescription: string;
  /** The number of positions the cursor moves through. */
  count: number;
  /** The words for position `index`, spoken by the live region when the cursor lands on it. */
  speak: (index: number) => string;
  /** The keyboard hint, read with the name. Default "Use the left and right arrow keys to move, Home and End to jump to the first and last." */
  hint?: string;
  /** A spoken summary of the whole chart ("Net worth rose from NPR 1,000 to NPR 1,200"), read with the name. */
  summary?: ReactNode;
  /** The visually hidden data table: usually a `ChartDataTable`. */
  table: ReactNode;
  /** Default true. False removes the tab stop, the hint and the live region (a parent gives the same figures another way). */
  interactive?: boolean;
  /** Class on the figure. */
  className?: string;
  /** Extra `data-*` attributes on the figure (values left undefined are dropped). */
  dataAttrs?: Record<`data-${string}`, string | undefined>;
  /** Becomes data-testid on the figure; each item gets `${testId}-${key}`. */
  testId?: string;
  /** Drawn after the plot and before the hidden parts: a legend, a note. */
  footer?: ReactNode;
  /** The drawing. Receives the cursor and the props for the focusable plot element. */
  children: (ctx: ChartA11yContext) => ReactNode;
}

const DEFAULT_HINT = 'Use the left and right arrow keys to move, Home and End to jump to the first and last.';

/**
 * @stability beta
 */
export function ChartA11yShell({ label, roleDescription, count, speak, hint, summary, table, interactive = true, className, dataAttrs, testId, footer, children }: ChartA11yShellProps) {
  const hintId = useId();
  const summaryId = useId();
  const cursor = useChartCursor(count);
  const describedBy = summary ? `${hintId} ${summaryId}` : hintId;
  const plotProps: ChartA11yContext['plotProps'] = (onPointer) =>
    interactive
      ? {
          tabIndex: 0,
          role: 'group',
          'aria-label': label,
          'aria-roledescription': roleDescription,
          'aria-describedby': describedBy,
          onKeyDown: cursor.onKeyDown,
          onFocus: cursor.onFocus,
          onBlur: cursor.clear,
          ...(onPointer ? { onPointerMove: onPointer, onPointerDown: onPointer, onPointerLeave: () => cursor.pointerTo(null) } : {}),
        }
      : {};
  return (
    <figure className={className} aria-label={label} data-testid={testId} {...dataAttrs}>
      {children({ index: cursor.index, pointerTo: cursor.pointerTo, plotProps })}
      {footer}
      {interactive && <p className="kit-sr" id={hintId}>{hint ?? DEFAULT_HINT}</p>}
      {interactive && summary && <p className="kit-sr" id={summaryId}>{summary}</p>}
      {interactive && <div className="kit-sr" role="status" aria-live="polite" aria-atomic="true">{cursor.index === null ? '' : speak(cursor.index)}</div>}
      <div className="kit-sr">{table}</div>
    </figure>
  );
}

export interface ChartDataTableRow {
  key: string;
  /** The row head (the date, the period, the step). */
  head: ReactNode;
  cells: readonly ReactNode[];
}

export interface ChartDataTableProps {
  /** The table's caption, usually the chart's name. */
  caption: string;
  /** Column heads, the first being the row-head column. */
  head: readonly ReactNode[];
  /** One row per position. */
  rows: readonly ChartDataTableRow[];
  /** A line after the table, such as "Showing the latest 500 of 2000 dates". */
  note?: ReactNode;
}

/**
 * The plain `<table>` a screen reader reads by row: scoped heads, one row per position.
 * @stability beta
 */
export function ChartDataTable({ caption, head, rows, note }: ChartDataTableProps) {
  return (
    <>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.head}</th>
              {r.cells.map((c, i) => (
                <td key={i}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note}
    </>
  );
}
