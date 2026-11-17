'use client';

/**
 * The React half of the economic and earnings calendars: a day heading in AD, BS or both (with the projected marker
 * for a BS month nobody has published), the stated time zone, an importance badge and a beat or miss badge, and the
 * per-day ScrollTable. Internal: not a public subpath.
 */
import { useId, useMemo, type ReactNode } from 'react';

import { DualDate } from './dualDate.tsx';
import { clockInZone, groupCalendarByDay, signedDecimal, signedPercentText, zoneLabel, type CalendarWhen, type Comparison, type Outcome } from './calendarMath.ts';
import type { NepalLanguage } from '../nepal/locale.ts';
import { ScrollTable } from '../scroll-table/ScrollTable.tsx';
import type { ColumnDef } from '../table-core/tableModel.ts';

export type EventCalendarSystem = 'ad' | 'bs' | 'both';
export type Importance = 'low' | 'medium' | 'high';

export interface CalendarWords {
  /** "All times in {zone}". */
  allTimesIn: (zone: string) => string;
  noTime: string;
  none: string;
  high: string;
  medium: string;
  low: string;
  beat: string;
  miss: string;
  inLine: string;
  awaiting: string;
  reported: string;
}

export const DEFAULT_CALENDAR_WORDS: CalendarWords = {
  allTimesIn: (zone) => `All times in ${zone}`,
  noTime: 'Time not set',
  none: '—',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  beat: 'Beat',
  miss: 'Missed',
  inLine: 'In line',
  awaiting: 'Awaiting',
  reported: 'Reported',
};

const LEVEL: Record<Importance, number> = { low: 1, medium: 2, high: 3 };
export const importanceRank = (i: Importance): number => LEVEL[i];

/** Importance as a word with three bars, filled one, two or three: the word is the meaning, the bars repeat it. */
export function ImportanceBadge({ level, labels, suffix }: { level: Importance; labels: Pick<CalendarWords, 'high' | 'medium' | 'low'>; suffix?: string }) {
  return (
    <span className={`pu-evt-imp ${level}`} data-importance={level}>
      <span className="pu-evt-bars" aria-hidden="true">
        <i /><i /><i />
      </span>
      {labels[level]}
      {suffix ? ` ${suffix}` : ''}
    </span>
  );
}

const GLYPH: Record<Outcome, string> = { beat: '', miss: '', inline: '●', pending: '○', reported: '●' };

/** Beat, missed, in line, awaiting or reported, with an arrow for which side of the forecast the actual fell on and the exact gap. */
export function OutcomeBadge({ comparison, labels, unit = '', showPercent = true }: { comparison: Comparison; labels: CalendarWords; unit?: string; showPercent?: boolean }) {
  const { outcome, difference, scale, percent } = comparison;
  const word = outcome === 'beat' ? labels.beat : outcome === 'miss' ? labels.miss : outcome === 'inline' ? labels.inLine : outcome === 'pending' ? labels.awaiting : labels.reported;
  const arrow = difference === null || difference === 0n ? GLYPH[outcome] : difference > 0n ? '▲' : '▼';
  const tone = outcome === 'beat' ? 'gain' : outcome === 'miss' ? 'loss' : 'flat';
  return (
    <span className={`pu-evt-out ${tone}`} data-outcome={outcome}>
      {arrow && <span aria-hidden="true">{arrow} </span>}
      {word}
      {difference !== null && difference !== 0n && (
        <>
          {' '}
          <span className="pu-evt-diff">{signedDecimal(difference, scale)}{unit}{showPercent && percent !== null ? `, ${signedPercentText(percent)}` : ''}</span>
        </>
      )}
    </span>
  );
}

const weekdayFormats = new Map<string, Intl.DateTimeFormat>();
function weekdayOf(day: string, locale: string): string {
  let f = weekdayFormats.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
    weekdayFormats.set(locale, f);
  }
  return f.format(Date.parse(`${day}T00:00:00Z`));
}

/** "Friday 14 November 2025" for a day, for names read by assistive technology (the same labels as the heading). */
function readable(day: string, locale: string): string {
  return `${weekdayOf(day, locale)} ${new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(`${day}T00:00:00Z`))}`;
}

/** A day as "Friday" plus the date in the chosen calendar(s). BS months nobody has published carry the projected marker. */
export function DayHeading({ day, calendar, locale, language }: { day: string; calendar: EventCalendarSystem; locale: string; language?: NepalLanguage }) {
  const weekday = weekdayOf(day, locale);
  if (calendar === 'ad') {
    const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(`${day}T00:00:00Z`));
    return (
      <>
        <span className="pu-evt-wd">{weekday}</span> <time dateTime={day}>{date}</time>
      </>
    );
  }
  return (
    <>
      <span className="pu-evt-wd">{weekday}</span> <DualDate value={day} primary={calendar === 'bs' ? 'bs' : 'ad'} language={language} />
    </>
  );
}

/** The time of an event in the stated zone, or the word for "no time". */
export function WhenCell({ when, timeZone, labels }: { when: CalendarWhen; timeZone: string; labels: Pick<CalendarWords, 'noTime'> }) {
  const clock = clockInZone(when, timeZone);
  return clock === null ? <span className="pu-evt-time none">{labels.noTime}</span> : <time className="pu-evt-time" dateTime={when}>{clock}</time>;
}

export interface CalendarDaysProps<T> {
  items: readonly T[];
  when: (item: T) => CalendarWhen;
  tie: (item: T) => string;
  rowKey: (item: T) => string;
  columns: readonly ColumnDef<T, ReactNode>[];
  /** Names each day's table: "Friday 14 November 2025" is added to it. */
  caption: string;
  timeZone: string;
  calendar: EventCalendarSystem;
  locale: string;
  language?: NepalLanguage;
  headingLevel: 2 | 3 | 4;
  labels: CalendarWords;
  empty: ReactNode;
  testId?: string;
  className: string;
  /** Short key for the table test ids. */
  kind: string;
}

/** Events grouped by day (in the stated time zone), each day a heading and a scrolling table. */
export function CalendarDays<T>({ items, when, tie, rowKey, columns, caption, timeZone, calendar, locale, language, headingLevel, labels, empty, testId, className, kind }: CalendarDaysProps<T>) {
  const groups = useMemo(() => groupCalendarByDay(items, when, timeZone, tie), [items, when, timeZone, tie]);
  const uid = useId();
  const Heading = `h${headingLevel}` as 'h3';
  const first = groups[0];
  // The offset is the one in force at midday UTC on the first listed day; with nothing listed, only the name.
  const zone = zoneLabel(timeZone, first ? Date.parse(`${first.day}T12:00:00Z`) : undefined);
  return (
    <div className={className} data-testid={testId}>
      <p className="pu-evt-zone">{labels.allTimesIn(zone)}</p>
      {groups.length === 0 ? (
        <p className="pu-evt-empty">{empty}</p>
      ) : (
        groups.map((group) => {
          const id = `${uid}-${group.day}`;
          return (
            <div key={group.day} className="pu-evt-day" role="group" aria-labelledby={id} data-day={group.day}>
              <Heading id={id} className="pu-evt-head"><DayHeading day={group.day} calendar={calendar} locale={locale} language={language} /></Heading>
              <ScrollTable
                caption={`${caption}, ${readable(group.day, locale)}`}
                columns={columns}
                rows={group.items}
                rowKey={rowKey}
                stickyFirstColumn
                className="pu-evt-table"
                testId={testId ? `${testId}-${kind}-${group.day}` : undefined}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
