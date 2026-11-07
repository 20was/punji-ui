/**
 * Shared display bits for the share-issue components: a civil day printed in Bikram Sambat and Gregorian, and unit
 * counts in lakh/crore grouping. Internal: not exported from the package.
 */
import { formatBSDate, gregorianToBS, toBS, type BsProvenance } from '../nepal/calendar.ts';
import { formatCalendarDate, parseCalendarDate } from '../nepal/date-only.ts';
import type { NepalLanguage } from '../nepal/locale.ts';

export interface DualDateOptions {
  /** Month names: 'en' (default) or 'ne'. */
  language?: NepalLanguage;
  /** Digits: 'latn' (default) or 'deva'. */
  digits?: 'latn' | 'deva';
}

/** The words a component prints beside a BS date it cannot vouch for. Components fold these into their `labels`. */
export interface BsDateLabels {
  /** Visible marker on a projected BS date. */
  projected: string;
  /** Tooltip and screen-reader explanation of "projected". */
  projectedHint: string;
  /** Screen-reader-only note on an unverified BS date (no visible marker). */
  unverified: string;
}
export const DEFAULT_BS_DATE_LABELS: BsDateLabels = {
  projected: 'projected',
  projectedHint: "The Nepal Panchanga Nirnayak Bikas Samiti has not published this month. This Bikram Sambat date is calculated and may differ by a day or two.",
  unverified: 'unverified',
};

/**
 * Marker for a BS date by provenance. Projected: a visible word with a tooltip, and the explanation for screen readers
 * (a date someone may act on). Unverified: screen-reader text only, because these are old, disputed-year dates that
 * people rarely act on and a visible chip on every historic date would be noise. Official and cross-checked: nothing.
 */
export function BsStatusMark({ status, labels }: { status: BsProvenance | null | undefined; labels?: Partial<BsDateLabels> }) {
  const words = { ...DEFAULT_BS_DATE_LABELS, ...labels };
  if (status === 'projected') {
    return <span className="pu-bs-flag" title={words.projectedHint} data-bs-status="projected">{words.projected}<span className="kit-sr">. {words.projectedHint}</span></span>;
  }
  if (status === 'unverified') return <span className="kit-sr" data-bs-status="unverified">, {words.unverified}</span>;
  return null;
}

/** BS and AD text for a Gregorian `YYYY-MM-DD`. `bs` is null outside the converter's range; both are null for a malformed date. `bsStatus` is the provenance of the BS month. */
export function dualDateText(iso: string, options: DualDateOptions = {}): { bs: string | null; ad: string | null; bsStatus: BsProvenance | null } {
  const date = parseCalendarDate(iso);
  if (!date) return { bs: null, ad: null, bsStatus: null };
  const ad = formatCalendarDate(date, { language: options.language, digits: options.digits });
  try {
    return { bs: formatBSDate(gregorianToBS(date), options), ad, bsStatus: toBS(date, { policy: 'allow' })?.status ?? null };
  } catch {
    return { bs: null, ad, bsStatus: null };
  }
}

/** A day as "12 Kartik 2082" with "29 Oct 2025" beside it, in a <time> carrying the Gregorian value. `primary` picks which leads. */
export function DualDate({ value, primary = 'bs', language, digits, adLabel = 'AD', bsLabel = 'BS', labels }: DualDateOptions & {
  value: string;
  primary?: 'bs' | 'ad';
  adLabel?: string;
  bsLabel?: string;
  /** Words for the projected and unverified markers. */
  labels?: Partial<BsDateLabels>;
}) {
  const { bs, ad, bsStatus } = dualDateText(value, { language, digits });
  if (!ad) return <span className="pu-dual-date">—</span>;
  const mark = <BsStatusMark status={bsStatus} labels={labels} />;
  const bsFirst = primary === 'bs' && bs;
  return (
    <time className="pu-dual-date" dateTime={value}>
      <span className="pu-dual-date-a">{bsFirst ? <>{bs} {bsLabel}{mark}</> : `${ad} ${adLabel}`}</span>
      {primary === 'bs' ? bs && <span className="pu-dual-date-b">{ad} {adLabel}</span> : bs && <span className="pu-dual-date-b">{bs} {bsLabel}{mark}</span>}
    </time>
  );
}

/** Whole units with lakh/crore grouping ("1,50,000"), Devanagari on request. */
export function formatUnits(units: bigint, digits: 'latn' | 'deva' = 'latn'): string {
  return new Intl.NumberFormat('en-IN', { numberingSystem: digits, maximumFractionDigits: 0 }).format(units);
}
