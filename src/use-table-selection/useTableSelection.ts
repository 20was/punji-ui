'use client';

import { useCallback, useMemo } from 'react';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export interface TableSelectionOptions {
  /** Ids of the rows on the current page (or visible set). */
  pageIds: readonly string[];
  /** Ids of every selectable row, when the caller knows them. Enables the all-rows state. */
  allIds?: readonly string[] | undefined;
  selected?: ReadonlySet<string> | undefined;
  defaultSelected?: ReadonlySet<string>;
  onChange?: ((selected: ReadonlySet<string>) => void) | undefined;
}

export type CheckState = 'none' | 'some' | 'all';

export interface TableSelectionState {
  selected: ReadonlySet<string>;
  /** The same ids as an array, shaped for DataTable's `selection.selectedRowIds`. */
  selectedRowIds: readonly string[];
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  select: (ids: readonly string[]) => void;
  deselect: (ids: readonly string[]) => void;
  clear: () => void;
  /** Header checkbox for the current page. `some` means indeterminate. */
  pageState: CheckState;
  togglePage: () => void;
  /** Same for allIds; `none` when allIds is absent or empty. */
  allState: CheckState;
  toggleAll: () => void;
}

const EMPTY: ReadonlySet<string> = new Set();
const stateOf = (ids: readonly string[], selected: ReadonlySet<string>): CheckState => {
  if (ids.length === 0) return 'none';
  let count = 0;
  for (const id of ids) if (selected.has(id)) count++;
  return count === 0 ? 'none' : count === ids.length ? 'all' : 'some';
};

/** Row selection by id. Selection survives page changes; page and all-row toggles only
 * touch the ids they are given. Ids are opaque strings and are never logged.
 */
export function useTableSelection({ pageIds, allIds, selected: controlled, defaultSelected = EMPTY, onChange }: TableSelectionOptions): TableSelectionState {
  const [selected, setSelected] = useControllableState<ReadonlySet<string>>({ value: controlled, defaultValue: defaultSelected, onChange, name: 'useTableSelection' });
  const select = useCallback((ids: readonly string[]) => setSelected((prev) => (ids.every((id) => prev.has(id)) ? prev : new Set([...prev, ...ids]))), [setSelected]);
  const deselect = useCallback((ids: readonly string[]) => setSelected((prev) => (ids.some((id) => prev.has(id)) ? new Set([...prev].filter((id) => !ids.includes(id))) : prev)), [setSelected]);
  const toggle = useCallback((id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (!next.delete(id)) next.add(id);
    return next;
  }), [setSelected]);
  const clear = useCallback(() => setSelected((prev) => (prev.size === 0 ? prev : new Set())), [setSelected]);
  const pageState = stateOf(pageIds, selected);
  const allState = allIds ? stateOf(allIds, selected) : 'none';
  const togglePage = useCallback(() => (pageState === 'all' ? deselect(pageIds) : select(pageIds)), [pageState, pageIds, select, deselect]);
  const toggleAll = useCallback(() => {
    if (!allIds) return;
    if (allState === 'all') deselect(allIds);
    else select(allIds);
  }, [allState, allIds, select, deselect]);
  const isSelected = useCallback((id: string) => selected.has(id), [selected]);
  const selectedRowIds = useMemo(() => [...selected], [selected]);
  return { selected, selectedRowIds, isSelected, toggle, select, deselect, clear, pageState, togglePage, allState, toggleAll };
}
