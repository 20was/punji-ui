'use client';

import { useCallback, useMemo } from 'react';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export interface ColumnVisibilityOptions {
  /** Every column id, in display order. */
  columns: readonly string[];
  hidden?: ReadonlySet<string> | undefined;
  defaultHidden?: ReadonlySet<string>;
  onChange?: ((hidden: ReadonlySet<string>) => void) | undefined;
}

export interface ColumnVisibilityState {
  /** Visible column ids in `columns` order. Never empty while `columns` is not. */
  visible: readonly string[];
  hidden: ReadonlySet<string>;
  isVisible: (id: string) => boolean;
  toggle: (id: string) => void;
  show: (id: string) => void;
  /** Ignored if it would hide the last visible column. */
  hide: (id: string) => void;
  showAll: () => void;
}

const EMPTY: ReadonlySet<string> = new Set();

/** Which table columns show. Unknown ids are ignored and at least one column always stays
 * visible. Persist by feeding `hidden`/`onChange` from useLocalStorage with a validator.
 */
export function useColumnVisibility({ columns, hidden: controlled, defaultHidden = EMPTY, onChange }: ColumnVisibilityOptions): ColumnVisibilityState {
  const [raw, setRaw] = useControllableState<ReadonlySet<string>>({ value: controlled, defaultValue: defaultHidden, onChange, name: 'useColumnVisibility' });
  const visible = useMemo(() => {
    const shown = columns.filter((id) => !raw.has(id));
    return shown.length > 0 ? shown : columns.slice(0, 1);
  }, [columns, raw]);
  const hidden = useMemo(() => new Set(columns.filter((id) => !visible.includes(id))), [columns, visible]);
  const hide = useCallback((id: string) => setRaw((prev) => {
    if (!columns.includes(id) || prev.has(id)) return prev;
    if (columns.every((c) => c === id || prev.has(c))) return prev;
    return new Set([...prev, id]);
  }), [setRaw, columns]);
  const show = useCallback((id: string) => setRaw((prev) => {
    if (!prev.has(id)) return prev;
    const next = new Set(prev);
    next.delete(id);
    return next;
  }), [setRaw]);
  const toggle = useCallback((id: string) => (hidden.has(id) ? show(id) : hide(id)), [hidden, show, hide]);
  const showAll = useCallback(() => setRaw((prev) => (prev.size === 0 ? prev : new Set())), [setRaw]);
  const isVisible = useCallback((id: string) => visible.includes(id), [visible]);
  return { visible, hidden, isVisible, toggle, show, hide, showAll };
}
