// Small pieces the screens share: a signed percent and a signed money figure (direction in a sign and words, never
// colour alone), and a scrolling table region that takes focus.
import type { ReactNode } from 'react';
import { MoneyDisplay } from '@punji/ui/money-display';
import { formatBSDate, gregorianToBS } from '@punji/ui/nepal/calendar';
import { formatCalendarDate } from '@punji/ui/nepal/date-only';
import { npr, nprPlain } from './store.ts';

/** An ISO date in AD ('5 Dec 2026') or Bikram Sambat ('19 Mangsir 2083'). */
export function dateText(iso: string, calendar: 'ad' | 'bs' = 'ad'): string {
  if (calendar === 'ad') return formatCalendarDate(iso);
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return formatBSDate(gregorianToBS({ year, month, day }));
}

/** A percent string ('12.34', '-3.10') with its sign; '—' with words when there is none. */
export function Pct({ value, suffix = '%' }: { value: string | null; suffix?: string }) {
  if (value === null)
    return (
      <span className="ii-pct" data-none>
        <span aria-hidden="true">—</span>
        <span className="kit-sr">not available</span>
      </span>
    );
  const negative = value.startsWith('-');
  const zero = /^-?0(\.0+)?$/.test(value);
  const body = negative ? value.slice(1) : value;
  return (
    <span className="ii-pct" data-dir={zero ? undefined : negative ? 'down' : 'up'}>
      {zero ? '' : negative ? '−' : '+'}
      {body}
      {suffix}
    </span>
  );
}

/** A gain or loss in rupees with its sign. */
export function Gain({ value, testId, plain }: { value: bigint; testId?: string; plain?: boolean }) {
  return (
    <span className="ii-pct" data-dir={value > 0n ? 'up' : value < 0n ? 'down' : undefined}>
      <MoneyDisplay value={value} preset={plain ? nprPlain : npr} signDisplay="always" testId={testId} />
    </span>
  );
}

/** gain / base as a percent string with two places, or null without a base. */
export function percentOf(gain: bigint, base: bigint): string | null {
  if (base === 0n) return null;
  const scaled = (gain * 10_000n * 2n + (gain >= 0n ? base : -base)) / (2n * base); // half away from zero, basis points
  const sign = scaled < 0n ? '-' : '';
  const abs = scaled < 0n ? -scaled : scaled;
  return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}

/** A horizontally scrolling region for a wide table: focusable and named, so a keyboard can scroll it. */
export function ScrollRegion({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be keyboard focusable
    <div className="ii-scroll" role="region" aria-label={label} tabIndex={0} data-testid={testId}>
      {children}
    </div>
  );
}
