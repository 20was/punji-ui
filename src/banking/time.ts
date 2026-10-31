/**
 * A payment's moment in a time zone the caller names. Payments have an exact
 * instant (unlike a ledger's calendar date), so the same instant reads
 * differently in Kathmandu and in Dubai: always say which zone is printed.
 * Pure: no React, no host zone is read (the zone is a parameter).
 */

export interface TimestampOptions {
  /** IANA zone to print in ('Asia/Kathmandu', 'UTC'). Default 'Asia/Kathmandu'. An unknown zone falls back to UTC and says so in the text. */
  timeZone?: string;
  /** BCP 47 locale for the words and digits. Default 'en-GB'. */
  locale?: string;
  /** 'datetime' (default) prints date, time and zone name; 'date' prints the date only. */
  parts?: 'datetime' | 'date';
}

export interface FormattedTimestamp {
  /** Printable text, for example "14 Nov 2025, 10:42:05 GMT+5:45". */
  text: string;
  /** The instant as an ISO 8601 UTC string, for a `<time dateTime>` attribute. */
  iso: string;
}

/** Format an instant (a Date, epoch milliseconds, or an ISO string with an offset or Z). Returns null for anything that is not a real instant. */
export function formatTimestamp(value: Date | number | string | null | undefined, options: TimestampOptions = {}): FormattedTimestamp | null {
  if (value === null || value === undefined) return null;
  // A bare date-time with no offset would be read in the host zone: refuse it, the instant would be a guess.
  if (typeof value === 'string' && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim())) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const { timeZone = 'Asia/Kathmandu', locale = 'en-GB', parts = 'datetime' } = options;
  const shape: Intl.DateTimeFormatOptions = parts === 'date'
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
  let text: string;
  try {
    text = new Intl.DateTimeFormat(locale, { ...shape, timeZone }).format(date);
  } catch {
    text = `${new Intl.DateTimeFormat(locale, { ...shape, timeZone: 'UTC' }).format(date)}`;
  }
  return { text, iso: date.toISOString() };
}
