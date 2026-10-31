'use client';

import { useCallback } from 'react';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export interface PageRange {
  /** One-based, clamped into 1..pageCount. */
  page: number;
  pageSize: number;
  /** At least 1, even for an empty list. */
  pageCount: number;
  total: number;
  /** Zero-based index of the first row on the page; slice(startIndex, endIndex). */
  startIndex: number;
  /** Exclusive. Equals startIndex when total is 0. */
  endIndex: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

const whole = (n: number, min: number) => (Number.isFinite(n) ? Math.max(min, Math.floor(n)) : min);

/** Pure pagination arithmetic. Non-finite or out-of-range input is clamped, never thrown. */
export function paginate(total: number, page: number, pageSize: number): PageRange {
  const size = whole(pageSize, 1);
  const count = whole(total, 0);
  const pageCount = Math.max(1, Math.ceil(count / size));
  const clamped = Math.min(whole(page, 1), pageCount);
  const startIndex = Math.min((clamped - 1) * size, count);
  return { page: clamped, pageSize: size, pageCount, total: count, startIndex, endIndex: Math.min(startIndex + size, count), hasPrevious: clamped > 1, hasNext: clamped < pageCount };
}

export interface PaginationOptions {
  total: number;
  page?: number | undefined;
  defaultPage?: number;
  onPageChange?: ((page: number) => void) | undefined;
  pageSize?: number | undefined;
  defaultPageSize?: number;
  onPageSizeChange?: ((pageSize: number) => void) | undefined;
}

export interface PaginationState extends PageRange {
  /** Zero-based, for DataTable's pageIndex. */
  pageIndex: number;
  setPage: (page: number) => void;
  next: () => void;
  previous: () => void;
  first: () => void;
  last: () => void;
  /** Keeps the first visible row on screen. */
  setPageSize: (pageSize: number) => void;
}

/** Pagination state. When `total` shrinks, the reported page is clamped at once; the
 * stored request is kept, so growth restores it. The setters clamp what they are given.
 */
export function usePagination({ total, page, defaultPage = 1, onPageChange, pageSize, defaultPageSize = 10, onPageSizeChange }: PaginationOptions): PaginationState {
  const [rawPage, setRawPage] = useControllableState({ value: page, defaultValue: defaultPage, onChange: onPageChange, name: 'usePagination page' });
  const [rawSize, setRawSize] = useControllableState({ value: pageSize, defaultValue: defaultPageSize, onChange: onPageSizeChange, name: 'usePagination pageSize' });
  const range = paginate(total, rawPage, rawSize);
  const { pageCount, pageSize: size, startIndex } = range;
  const setPage = useCallback((next: number) => setRawPage(paginate(total, next, size).page), [setRawPage, total, size]);
  const setPageSize = useCallback((next: number) => {
    const nextSize = whole(next, 1);
    setRawSize(nextSize);
    setRawPage(paginate(total, Math.floor(startIndex / nextSize) + 1, nextSize).page);
  }, [setRawSize, setRawPage, total, startIndex]);
  return {
    ...range,
    pageIndex: range.page - 1,
    setPage,
    next: useCallback(() => setPage(range.page + 1), [setPage, range.page]),
    previous: useCallback(() => setPage(range.page - 1), [setPage, range.page]),
    first: useCallback(() => setPage(1), [setPage]),
    last: useCallback(() => setPage(pageCount), [setPage, pageCount]),
    setPageSize,
  };
}
