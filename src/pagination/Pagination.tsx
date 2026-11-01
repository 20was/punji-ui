'use client';

/**
 * Pagination (design.punji.app/components/pagination): a list shown a page at
 * a time, so its card keeps one height. "6–10 of 12", the page numbers when
 * there are four pages or fewer, and previous / next as icon buttons (a
 * named, 44px tap area on touch). The range is announced politely when the
 * page changes.
 *
 * One model with the rest of the kit: the arithmetic is `paginate` from
 * `use-pagination` (one-based `page`, clamped; garbage input never throws),
 * and `usePagination` drives this component directly:
 *
 *   const pager = usePagination({ total: rows.length, defaultPageSize: 5 });
 *   <Pagination {...pager} onPageChange={pager.setPage} label="Holdings pages" />
 *   rows.slice(pager.startIndex, pager.endIndex)
 *
 * DataTable's built-in footer uses the same arithmetic (`tablePagination`
 * maps the state to its zero-based props). Use this component for lists and
 * cards that are not a DataTable.
 */
import type { ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { formatFigure } from '../format/format.ts';
import { paginate } from '../use-pagination/usePagination.ts';

export interface PaginationProps {
  /** The page shown, from 1 (clamped into range). */
  page: number;
  /** How many items there are in all, and how many a page holds. */
  total: number;
  /** How many items one page holds. */
  pageSize: number;
  /** Called with the one-based page the reader chose. */
  onPageChange: (page: number) => void;
  /** What the pager moves through ("Holdings pages"). */
  label: string;
  /** Its words: previous and next, one page's name ("Page 2"), and the range ("6–10" and "12" become "6–10 of 12"). */
  previousLabel?: string;
  /** The next button's accessible name. Default 'Next page'. */
  nextLabel?: string;
  /** A page button's accessible name from its number. Default 'Page n'. */
  pageLabel?: (page: number) => string;
  /** Builds the range text from the range ("6–10") and the total ("12"). Default "6–10 of 12". */
  rangeLabel?: (range: string, total: string) => string;
  /** Page numbers are drawn up to this many pages (default 4); past it only the range shows. */
  maxNumbers?: number;
  /** Sets `data-testid` on the nav; the buttons get `<id>-prev` and `<id>-next`. */
  testId?: string;
}

function Chevron({ dir }: { dir: 'left' | 'right' }): ReactNode {
  return (
    <svg className="pu-flip" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'M10 3.5L5.5 8l4.5 4.5' : 'M6 3.5L10.5 8 6 12.5'} />
    </svg>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
  label,
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  pageLabel = (n) => `Page ${n}`,
  rangeLabel = (r, t) => `${r} of ${t}`,
  maxNumbers = 4,
  testId,
}: PaginationProps) {
  const p = paginate(total, page, pageSize);
  const from = p.total === 0 ? 0 : p.startIndex + 1;
  const range = p.total === 0 ? rangeLabel('0', '0') : rangeLabel(`${formatFigure(from, 'int')}–${formatFigure(p.endIndex, 'int')}`, formatFigure(p.total, 'int'));
  const id = (suffix: string) => (testId ? `${testId}-${suffix}` : undefined);
  return (
    <nav className="kit-pager" aria-label={label} data-testid={testId}>
      <span className="kit-pager-r" aria-live="polite" data-testid={id('range')}>
        {range}
      </span>
      <span className="kit-pager-b">
        <Button variant="ghost" size="sm" iconOnly label={previousLabel} disabled={!p.hasPrevious} onClick={() => onPageChange(p.page - 1)} testId={id('prev')}>
          <Chevron dir="left" />
        </Button>
        {p.total > 0 && p.pageCount <= maxNumbers &&
          Array.from({ length: p.pageCount }, (_, i) => (
            <Button key={i} variant={i + 1 === p.page ? 'secondary' : 'ghost'} size="sm" aria-label={pageLabel(i + 1)} aria-current={i + 1 === p.page ? 'page' : undefined} onClick={() => onPageChange(i + 1)} className="kit-pager-n" testId={id(`page-${i + 1}`)}>
              {formatFigure(i + 1, 'int')}
            </Button>
          ))}
        <Button variant="ghost" size="sm" iconOnly label={nextLabel} disabled={!p.hasNext} onClick={() => onPageChange(p.page + 1)} testId={id('next')}>
          <Chevron dir="right" />
        </Button>
      </span>
    </nav>
  );
}
