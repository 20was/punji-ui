'use client';

/**
 * useUrlFilters (design.punji.app/components/filter-url): the filters of a screen, kept in the address, with any
 * router. It takes two functions and nothing else: `get` reads the current query and `set` writes the next one.
 * No router, no `window`, no history API is imported, so it works with a Next.js `useSearchParams`, React Router,
 * TanStack Router, a hash router, or a plain `useState` in a test. The address is the single source of truth; the
 * hook keeps no copy, so back and forward, a pasted link and a reload all give the same filters.
 *
 * `get` is called on every render, so pass a function that reads reactive router state (it must re-render the
 * component when the address changes, as a router's own hook does). Other parameters (`sort`, `page`) are kept.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { activeFilterKeys, filtersToLink, filtersToQueryString, normalizeFilters, searchParamsToFilters, toSearchParams, type FilterSchema, type FilterValues, type SearchParamsInput } from '../filter-url/FilterUrl.ts';

export interface UseUrlFiltersOptions<S extends FilterSchema> {
  /** The typed schema of the screen's filters. Keep it stable (a module constant) so the result is memoised. */
  schema: S;
  /** Reads the current query: a string (with or without `?`), `URLSearchParams` or a router's plain object. */
  get: () => SearchParamsInput;
  /** Writes the next query string (no `?`; empty for no filters). `replace` is true when the entry should replace the current one. */
  set: (search: string, options: { replace: boolean }) => void;
  /** Replace the history entry instead of pushing one for each change (default true: a slider drag is not a page). */
  replace?: boolean;
}

export interface UseUrlFiltersResult<S extends FilterSchema> {
  /** The filters in the address, normalised. */
  filters: FilterValues<S>;
  /** Replace all filters (a value or an updater). Other query parameters are kept. */
  setFilters: (next: FilterValues<S> | ((current: FilterValues<S>) => FilterValues<S>)) => void;
  /** Set one filter; `undefined` clears it. */
  setField: <K extends keyof S & string>(key: K, value: FilterValues<S>[K] | undefined) => void;
  /** Clear one filter. */
  clearField: (key: keyof S & string) => void;
  /** Clear every filter, keeping other query parameters. */
  clear: () => void;
  /** The keys of the filters that are set, in written order. */
  active: (keyof S & string)[];
  /** The query string for the current filters (no `?`). */
  search: string;
  /** A shareable link: `base` (a path or an absolute URL; default '') with the current filters. */
  shareLink: (base?: string) => string;
}

/**
 * The filters of a screen, kept in the address through your router's `get` and `set`.
 *
 * @stability beta
 */
export function useUrlFilters<S extends FilterSchema>({ schema, get, set, replace = true }: UseUrlFiltersOptions<S>): UseUrlFiltersResult<S> {
  const current = get();
  const raw = typeof current === 'string' ? current : toSearchParams(current).toString();
  // A change written in this event, until the next render shows it: two changes in one event both land.
  const pending = useRef<string | null>(null);
  useEffect(() => {
    pending.current = null;
  });
  const read = useCallback((): SearchParamsInput => pending.current ?? get(), [get]);
  const filters = useMemo(() => searchParamsToFilters(schema, raw), [schema, raw]);
  const search = useMemo(() => filtersToQueryString(schema, filters), [schema, filters]);
  const active = useMemo(() => activeFilterKeys(schema, filters), [schema, filters]);

  const write = useCallback(
    (next: FilterValues<S>) => {
            const query = filtersToQueryString(schema, next, read());
      pending.current = query;
      set(query, { replace });
    },
    [schema, read, set, replace],
  );
  const setFilters = useCallback(
    (next: FilterValues<S> | ((current: FilterValues<S>) => FilterValues<S>)) => {
      const now = searchParamsToFilters(schema, read());
      write(normalizeFilters(schema, typeof next === 'function' ? next(now) : next));
    },
    [schema, read, write],
  );
  const setField = useCallback(
    <K extends keyof S & string>(key: K, value: FilterValues<S>[K] | undefined) => {
      const now = { ...searchParamsToFilters(schema, read()) } as Record<string, unknown>;
      if (value === undefined) delete now[key];
      else now[key] = value;
      write(now as FilterValues<S>);
    },
    [schema, read, write],
  );
  const clearField = useCallback((key: keyof S & string) => setField(key, undefined), [setField]);
  const clear = useCallback(() => write({} as FilterValues<S>), [write]);
  const shareLink = useCallback((base = '') => filtersToLink(base, schema, filters), [schema, filters]);
  return { filters, setFilters, setField, clearField, clear, active, search, shareLink };
}
