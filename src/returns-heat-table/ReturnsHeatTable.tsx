'use client';

/**
 * ReturnsHeatTable (design.punji.app/components/returns-heat-table): a subject per row, a period per column, each
 * cell shaded by its size (gain for up, loss for down). The sign and the figure are printed, so colour is never
 * alone. Column heads are buttons that sort (`aria-sort`; pressing the sorted one reverses it); you own the order.
 * An average row can be pinned under the head. A row selects its subject: a button in its name cell for the
 * keyboard, the whole row for a pointer. A cell with no figure says so in words.
 *
 * It shares MonthGrid's cell scale: `heatCell(value)` turns a return into a cell with the same direction and band.
 * On a phone the table scrolls sideways inside its own focusable region; with `phone="sorted"` only the sorted
 * column shows and your period control picks it.
 */
import type { CSSProperties, ReactNode } from 'react';

import { HEAT_STRENGTH, heatBand, signedPercent, type HeatTone } from '../internal/heat.ts';

export interface HeatCell {
  /** The figure as printed ("+4.0%", "+11.4 pts"); null when there is none. */
  text: string | null;
  /** The direction; sets the hue. Default 'flat'. */
  tone?: HeatTone;
  /** Percent of the tone mixed into the cell, 0 to 36 (above 36 is held at 36 so the text keeps its contrast). */
  strength?: number;
}

export interface HeatRow {
  /** Stable key; also what `onSelect` and `selected` use. */
  id: string;
  /** The subject's name in the first column. */
  name: ReactNode;
  /** A quiet line under the name ("19 companies"). */
  sub?: ReactNode;
  /** One cell per column, in the order of `columns`. */
  cells: readonly HeatCell[];
  /** The last column's content (a group pill), when the table has one. */
  extra?: ReactNode;
}

export interface HeatColumn {
  /** Stable key; what `sortKey` and `onSort` use. */
  key: string;
  /** The column head's text ('1M'). */
  label: string;
}

export interface ReturnsHeatTableProps {
  /** The table's caption, read by screen readers. */
  caption: string;
  /** The period columns, left to right. */
  columns: readonly HeatColumn[];
  /** The subjects, in the order to show (you sort them). */
  rows: readonly HeatRow[];
  /** The pinned row, under the head. */
  average?: HeatRow;
  /** The column the rows are sorted by. */
  sortKey: string;
  /** The direction `sortKey` is sorted in; sets `aria-sort`. */
  sortDir: 'asc' | 'desc';
  /** Called with a column key when its head is pressed. Sort `rows` yourself. */
  onSort: (key: string) => void;
  /** The chosen row's id. */
  selected?: string;
  /** Makes each name a button and each row clickable. */
  onSelect?: (id: string) => void;
  /** The first column's head ("Sector"). */
  headName: string;
  /** The extra last column's head, when `rows` have `extra`. */
  headExtra?: string;
  /** Words for a cell with no figure. Default "No data". */
  noneLabel?: string;
  /** 'scroll' (default): every column, scrolling sideways on a phone. 'sorted': on a phone only the sorted column shows. */
  phone?: 'scroll' | 'sorted';
  /** Test id on the table; rows are `${testId}-row-${id}`. */
  testId?: string;
}

/**
 * A cell for a return in percent, on the same scale as MonthGrid: the direction and a strength by size.
 * `null` (or not finite) is a cell with no figure.
 */
export function heatCell(value: number | null | undefined, format: (value: number) => string = signedPercent): HeatCell {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { text: null };
  const { tone, band } = heatBand(value);
  return { text: format(value), tone, strength: HEAT_STRENGTH[band] };
}

const cap = (v: number | undefined) => Math.min(HEAT_STRENGTH[4], Math.max(0, v ?? 0));

/**
 * @stability beta
 */
export function ReturnsHeatTable({ caption, columns, rows, average, sortKey, sortDir, onSort, selected, onSelect, headName, headExtra, noneLabel = 'No data', phone = 'scroll', testId }: ReturnsHeatTableProps) {
  const cell = (c: HeatCell | undefined, key: string) => {
    const on = key === sortKey;
    if (!c || c.text === null) {
      return (
        <td key={key} className="pu-rht-c" data-tone="none" data-sorted={on || undefined} data-testid={testId ? `${testId}-cell` : undefined}>
          <span>{noneLabel}</span>
        </td>
      );
    }
    return (
      <td key={key} className="pu-rht-c" data-tone={c.tone ?? 'flat'} data-sorted={on || undefined} style={{ '--rht-s': `${cap(c.strength)}%` } as CSSProperties}>
        <span>{c.text}</span>
      </td>
    );
  };
  return (
    <div className="pu-rht-box" data-phone={phone}>
      {/* The table scrolls sideways when it is wider than the screen, so the region must be reachable by keyboard. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="pu-rht-scroll" tabIndex={0} role="region" aria-label={caption}>
        <table className="pu-rht" data-testid={testId}>
          <caption className="kit-sr">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="pu-rht-n">{headName}</th>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="pu-rht-h" data-sorted={c.key === sortKey || undefined} aria-sort={c.key === sortKey ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}>
                  <button type="button" onClick={() => onSort(c.key)} data-testid={testId ? `${testId}-sort-${c.key}` : undefined}>
                    {c.label}
                    <span aria-hidden="true">{c.key === sortKey ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}</span>
                  </button>
                </th>
              ))}
              {headExtra !== undefined && <th scope="col" className="pu-rht-x">{headExtra}</th>}
            </tr>
          </thead>
          <tbody>
            {average && (
              <tr className="pu-rht-avg" data-testid={testId ? `${testId}-avg` : undefined}>
                <th scope="row" className="pu-rht-n"><span className="pu-rht-name">{average.name}</span>{average.sub && <small>{average.sub}</small>}</th>
                {columns.map((c, i) => cell(average.cells[i], c.key))}
                {headExtra !== undefined && <td>{'\u00a0'}</td>}
              </tr>
            )}
            {rows.map((r) => (
              // The whole row is a pointer target; the name button inside is the keyboard's.
              // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
              <tr key={r.id} className="pu-rht-r" data-selected={r.id === selected || undefined} onClick={onSelect ? () => onSelect(r.id) : undefined} data-testid={testId ? `${testId}-row-${r.id}` : undefined}>
                <th scope="row" className="pu-rht-n">
                  {onSelect ? (
                    <button type="button" className="pu-rht-name" aria-pressed={r.id === selected} onClick={(e) => { e.stopPropagation(); onSelect(r.id); }} data-testid={testId ? `${testId}-pick-${r.id}` : undefined}>{r.name}</button>
                  ) : (
                    <span className="pu-rht-name">{r.name}</span>
                  )}
                  {r.sub && <small>{r.sub}</small>}
                </th>
                {columns.map((c, i) => cell(r.cells[i], c.key))}
                {headExtra !== undefined && <td className="pu-rht-x">{r.extra}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
