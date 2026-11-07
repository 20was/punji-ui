/**
 * The whole session in one line ("Closed for Dashain · prices of 16 Oct · opens Wed 21 Oct, 11:00"), built from a
 * `getMarketSession` result. Pure: no React, no browser globals. The words are replaceable, and the dates are
 * written in the exchange's time zone with Western digits so a server and a browser print the same line.
 */
import { getMarketSession, nepseSchedule, type MarketSchedule, type MarketSession, type MarketState } from './session.ts';

export interface MarketSentenceLabels {
  /** The market is trading. Default "Live". */
  open: string;
  /** Default "Pre-open". */
  preOpen: string;
  /** Default "Market closed". */
  closed: string;
  /** Default "Halted". */
  halted: string;
  /** Default "Offline". */
  offline: string;
  /** A holiday with no name given. Default "Closed for a holiday". */
  holiday: string;
  /** A named holiday. Default "Closed for {name}". */
  holidayNamed: (name: string) => string;
  /** The date of the prices on screen. Default "prices of 16 Oct". */
  pricesOf: (date: string) => string;
  /** When the market next changes. Default "opens Wed 21 Oct, 11:00". */
  opens: (when: string) => string;
}

export const marketSentenceLabels: MarketSentenceLabels = {
  open: 'Live',
  preOpen: 'Pre-open',
  closed: 'Market closed',
  halted: 'Halted',
  offline: 'Offline',
  holiday: 'Closed for a holiday',
  holidayNamed: (name) => `Closed for ${name}`,
  pricesOf: (date) => `prices of ${date}`,
  opens: (when) => `opens ${when}`,
};

export interface MarketSentenceOptions {
  /** The words, in the reader's language. */
  labels?: Partial<MarketSentenceLabels>;
  /** The date of the last prices shown, 'YYYY-MM-DD' (the session they are from). Left out when unknown. */
  lastCloseDate?: string | null;
  /** The schedule the session came from: its time zone writes the next change, and a closed market's next pre-open is followed to the trading open. Default `nepseSchedule`. */
  schedule?: MarketSchedule;
  /** A locale tag for the weekday and month names. Default 'en'. Digits stay Western. */
  locale?: string;
  /** An offline note ("as of 13:42"), after the word. */
  note?: string | null;
  /** Override the state (a feed's `offline` or `halted`) when the session came from the clock alone. */
  state?: MarketState;
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** '2026-10-16' as "16 Oct", with the year ("29 Dec 2025") when it is not the year of `today`. Null when it is not a date. */
function dayText(iso: string, today: string, locale: string): string | null {
  const m = ISO_DAY.exec(iso);
  if (!m) return null;
  const at = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (!Number.isFinite(at)) return null;
  const sameYear = today.slice(0, 4) === m[1];
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat(locale, { timeZone: 'UTC', numberingSystem: 'latn', day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(at)) parts[p.type] = p.value;
  return `${parts.day} ${parts.month}${sameYear ? '' : ` ${parts.year}`}`;
}

/** "Wed 21 Oct, 11:00" in the exchange's time zone. */
function whenText(at: Date, timeZone: string, locale: string): string {
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat(locale, { timeZone, numberingSystem: 'latn', hourCycle: 'h23', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).formatToParts(at)) parts[p.type] = p.value;
  return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute}`;
}

/**
 * The session as one sentence: the state, the date of the prices on screen and when the market next opens, joined by
 * " · ". An open market is just "Live"; an offline one is "Offline" and its note. A closed or holiday market adds the
 * prices' date and the next open when the schedule knows one. Unknown parts are left out, never invented.
 *
 *   marketSessionSentence(getMarketSession(now, nepseSchedule), { lastCloseDate: '2026-10-16' })
 *   // "Closed for Dashain · prices of 16 Oct · opens Wed 21 Oct, 11:00"
 */
export function marketSessionSentence(session: MarketSession, options: MarketSentenceOptions = {}): string {
  const words: MarketSentenceLabels = { ...marketSentenceLabels, ...options.labels };
  const locale = options.locale ?? 'en';
  const state = options.state ?? session.state;
  if (state === 'open') return words.open;
  if (state === 'offline') return [words.offline, options.note].filter(Boolean).join(' · ');
  const head = state === 'holiday' ? (session.label ? words.holidayNamed(session.label) : words.holiday) : state === 'pre-open' ? words.preOpen : state === 'halted' ? words.halted : words.closed;
  const prices = options.lastCloseDate ? dayText(options.lastCloseDate, session.localDate, locale) : null;
  const schedule = options.schedule ?? nepseSchedule;
  let next = session.next;
  // A closed market reopens in pre-open; the line says when trading begins.
  if (next?.state === 'pre-open') {
    const after = getMarketSession(next.at, schedule).next;
    if (after?.state === 'open') next = after;
  }
  const opens = state === 'halted' || !next ? null : words.opens(whenText(next.at, schedule.timeZone, locale));
  return [head, prices && words.pricesOf(prices), opens].filter(Boolean).join(' · ');
}
