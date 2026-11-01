/**
 * Shared display bits for the share-issue components: a civil day printed in Bikram Sambat and Gregorian, and unit
 * counts in lakh/crore grouping. Internal: not exported from the package.
 */
import { formatBSDate, gregorianToBS } from '../nepal/calendar.ts';
import { formatCalendarDate, parseCalendarDate } from '../nepal/date-only.ts';
import type { NepalLanguage } from '../nepal/locale.ts';

export interface DualDateOptions {
  /** Month names: 'en' (default) or 'ne'. */
  language?: NepalLanguage;
  /** Digits: 'latn' (default) or 'deva'. */
  digits?: 'latn' | 'deva';
}

/** BS and AD text for a Gregorian `YYYY-MM-DD`. `bs` is null outside the converter's range; both are null for a malformed date. */
export function dualDateText(iso: string, options: DualDateOptions = {}): { bs: string | null; ad: string | null } {
  const date = parseCalendarDate(iso);
  if (!date) return { bs: null, ad: null };
  const ad = formatCalendarDate(date, { language: options.language, digits: options.digits });
  try {
    return { bs: formatBSDate(gregorianToBS(date), options), ad };
  } catch {
    return { bs: null, ad };
  }
}

/** A day as "12 Kartik 2082" with "29 Oct 2025" beside it, in a <time> carrying the Gregorian value. `primary` picks which leads. */
export function DualDate({ value, primary = 'bs', language, digits, adLabel = 'AD', bsLabel = 'BS' }: DualDateOptions & {
  value: string;
  primary?: 'bs' | 'ad';
  adLabel?: string;
  bsLabel?: string;
}) {
  const { bs, ad } = dualDateText(value, { language, digits });
  if (!ad) return <span className="pu-dual-date">—</span>;
  const lead = primary === 'bs' && bs ? `${bs} ${bsLabel}` : `${ad} ${adLabel}`;
  const second = primary === 'bs' ? (bs ? `${ad} ${adLabel}` : null) : bs ? `${bs} ${bsLabel}` : null;
  return (
    <time className="pu-dual-date" dateTime={value}>
      <span className="pu-dual-date-a">{lead}</span>
      {second && <span className="pu-dual-date-b">{second}</span>}
    </time>
  );
}

/** Whole units with lakh/crore grouping ("1,50,000"), Devanagari on request. */
export function formatUnits(units: bigint, digits: 'latn' | 'deva' = 'latn'): string {
  return new Intl.NumberFormat('en-IN', { numberingSystem: digits, maximumFractionDigits: 0 }).format(units);
}
