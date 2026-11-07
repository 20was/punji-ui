'use client';
/**
 * BarList (design.punji.app/components/bar-list): quantities in the caller's ranked order, with the exact formatted
 * value and a proportional bar. Static rows are text; optional actions are native buttons. No chart inspection is
 * needed because every label and value is already printed.
 *
 * `value` sets only the bar's length: pass the amount as a bigint (minor units) and the share is worked out in
 * bigint, so it is exact past 2^53. What is printed is `valueText`, which you format (for example with
 * `MoneyDisplay`).
 */
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode, Ref } from 'react';

import { Skeleton } from '../states/States.tsx';

export interface BarListItem {
  /** A stable key; passed to `onItemClick`. */
  id: string;
  /** The row's name. Wraps; never cut. */
  label: ReactNode;
  /** Nonnegative quantity on the shared scale (a bigint for money); negative, null or nonfinite omits the bar. */
  value: bigint | number | null;
  /** The exact value, with its units, or words explaining missing data. */
  valueText: ReactNode;
  /** Disables this row's optional action. Its figure remains readable. */
  disabled?: boolean;
}

export interface BarListProps extends Omit<ComponentPropsWithoutRef<'ol'>, 'children' | 'aria-label'> {
  /** The rows, in the order to show them (ranked by the caller). */
  items: readonly BarListItem[];
  /** Names the ordered list for assistive technology. */
  label: string;
  /** Meaningful content when there are no rows (EmptyState, Note or plain text). */
  empty: ReactNode;
  /** Shared scale maximum; defaults to the largest finite positive value. */
  max?: bigint | number;
  /** The bar's colour: accent (default), neutral or info. */
  tone?: 'accent' | 'neutral' | 'info';
  /** A small heading over the list (a panel with two lists). */
  heading?: string;
  /** Three shaped placeholders; switch off when loading ends. */
  loading?: boolean;
  /** Optional row action. Rows remain static when omitted. */
  onItemClick?: (id: string) => void;
  /** Sets `data-testid` on the list; each row gets `<testId>-row-<id>`. Default 'bar-list'. */
  testId?: string;
  /** React 19: a ref is a prop (the list). */
  ref?: Ref<HTMLOListElement>;
}

const usable = (v: unknown): v is bigint | number => (typeof v === 'bigint' ? v >= 0n : typeof v === 'number' && Number.isFinite(v) && v >= 0);

/** The bar's share of the whole, 0 to 100, with four decimals; bigint maths when both are bigint. */
function shareOf(value: bigint | number, whole: bigint | number): number {
  if (typeof value === 'bigint' && typeof whole === 'bigint') return whole > 0n ? Math.min(100, Number((value * 1_000_000n) / whole) / 10_000) : 0;
  const w = Number(whole);
  return w > 0 ? Math.min(100, Math.max(0, (Number(value) / w) * 100)) : 0;
}

/**
 * @stability beta
 */
export function BarList({ items, label, empty, max, tone = 'accent', heading, loading = false, onItemClick, testId = 'bar-list', className, ref, ...rest }: BarListProps) {
  let largest: bigint | number = 0;
  for (const item of items) if (usable(item.value) && item.value > largest) largest = item.value;
  const whole: bigint | number = usable(max) && max > 0 ? max : largest;
  const list = (
    <ol {...rest} ref={ref} className={`pu-bar-list${className ? ` ${className}` : ''}`} aria-label={label} aria-busy={loading || undefined} data-tone={tone} data-testid={testId}>
      {loading ? [68, 84, 52].map((width) => (
        <li key={width} className="pu-bar-list-loading" aria-hidden="true">
          <Skeleton width={`${width}%`} height="calc(var(--pu-text-sm) * 1.5)" still />
          <Skeleton width="100%" height="var(--pu-space-1)" still />
        </li>
      )) : items.length === 0 ? <li className="pu-bar-list-empty">{empty}</li> : items.map((item) => {
        const finite = usable(item.value);
        const share = finite ? shareOf(item.value as bigint | number, whole) : 0;
        const body = (
          <>
            <span className="pu-bar-list-label">{item.label}</span>
            <span className="pu-bar-list-value">{item.valueText}</span>
            {finite && <span className="pu-bar-list-track" aria-hidden="true"><span className="pu-bar-list-fill" style={{ '--bar-list-share': `${share}%` } as CSSProperties} /></span>}
          </>
        );
        return (
          <li key={item.id}>
            {onItemClick ? <button type="button" className="pu-bar-list-row" disabled={item.disabled} onClick={() => onItemClick(item.id)} data-testid={`${testId}-row-${item.id}`}>{body}</button> : <div className="pu-bar-list-row" data-testid={`${testId}-row-${item.id}`}>{body}</div>}
          </li>
        );
      })}
    </ol>
  );
  return heading ? <div className="pu-bar-list-section"><h3 className="pu-bar-list-heading">{heading}</h3>{list}</div> : list;
}
