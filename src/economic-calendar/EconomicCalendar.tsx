'use client';

/**
 * EconomicCalendar (design.punji.app/components/economic-calendar): macro releases grouped by day, each with its
 * importance in words, and the actual figure against its forecast and the previous one. A released figure says whether it
 * beat or missed the forecast and by how much, exact to the digit; an unreleased one says it is awaiting.
 *
 * Built on ScrollTable, so every day is a named, keyboard-scrollable table with a sticky first column. The time zone is
 * a required prop and is printed above the list with its UTC offset: the calendar never guesses the reader's zone.
 * Days print in AD, BS or both; a BS month nobody has published carries the "projected" marker.
 *
 * Figures are decimal strings ("3.2", "-0.4"), compared in bigint. Whether higher or lower is good news is per event
 * (`better`), so a fall in unemployment reads as a beat.
 *
 * @stability beta
 */
import { useMemo, type ReactNode } from 'react';

import { CalendarDays, ImportanceBadge, importanceRank, OutcomeBadge, WhenCell, DEFAULT_CALENDAR_WORDS, type EventCalendarSystem, type CalendarWords, type Importance } from '../internal/calendarDays.tsx';
import { compareToForecast, formatDecimalText, type CalendarWhen, type Comparison } from '../internal/calendarMath.ts';
import type { NepalLanguage } from '../nepal/locale.ts';
import type { ColumnDef } from '../table-core/tableModel.ts';

export { compareToForecast, groupCalendarByDay, dayInZone, zoneLabel } from '../internal/calendarMath.ts';
export type { CalendarWhen, Comparison, DayGroup, Outcome } from '../internal/calendarMath.ts';
export type { EventCalendarSystem, Importance } from '../internal/calendarDays.tsx';

export interface EconomicEvent {
  /** Stable key. */
  id: string;
  /** When it is released: a day (`2025-11-14`) or an ISO time with `Z` or an offset (`2025-11-14T08:30:00Z`). */
  when: CalendarWhen;
  /** The release ("Non-farm payrolls"). */
  title: string;
  /** Where it applies ("US", "Nepal"). */
  country?: string;
  /** The period it covers ("Oct", "Q3"). */
  period?: string;
  /** How much it tends to move markets. */
  importance: Importance;
  /** The released figure, a decimal string. Leave it out until it is out. */
  actual?: string;
  /** The consensus forecast, a decimal string. */
  forecast?: string;
  /** The previous figure, a decimal string. */
  previous?: string;
  /** Printed after each figure, with its own spacing ("%", " K", " bn"). */
  unit?: string;
  /** Which direction is good news. Default 'higher'. */
  better?: 'higher' | 'lower';
}

export interface EconomicCalendarLabels extends Partial<CalendarWords> {
  event?: string;
  /** Said after the importance word. Default "impact". */
  impact?: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  result?: string;
  empty?: ReactNode;
}

export interface EconomicCalendarProps {
  /** The releases, any order. */
  events: readonly EconomicEvent[];
  /** Names the calendar and each day's table. */
  caption: string;
  /** The IANA time zone every time and every day is shown in ("Asia/Kathmandu", "America/New_York"). Required: the calendar never uses the reader's zone. */
  timeZone: string;
  /** How days print. Default 'ad'. 'both' leads with AD and adds BS; 'bs' leads with BS. */
  calendar?: EventCalendarSystem;
  /** Month names for BS dates. Default 'en'. */
  language?: NepalLanguage;
  /** Hide releases below this importance. Default shows all. */
  minImportance?: Importance;
  /** BCP 47 tag for weekday names and number grouping. Default "en-IN". */
  locale?: string;
  /** Heading level of each day (2 to 4). Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Overrides for the printed and spoken words. */
  labels?: EconomicCalendarLabels;
  /** Becomes data-testid on the root; each day's table gets `${testId}-economic-${day}`. */
  testId?: string;
}

/** The comparison for one event, exact. Throws a RangeError for a malformed figure. */
export function economicResult(event: Pick<EconomicEvent, 'actual' | 'forecast' | 'better'>): Comparison {
  return compareToForecast(event.actual, event.forecast, event.better);
}

/** The day tables' columns, built outside the component so each cell is a plain function of its row. */
function economicColumns(words: CalendarWords, labels: EconomicCalendarLabels | undefined, locale: string, timeZone: string): ColumnDef<EconomicEvent, ReactNode>[] {
  const figure = (e: EconomicEvent, value: string | undefined) => (value === undefined || value === '' ? words.none : `${formatDecimalText(value, locale)}${e.unit ?? ''}`);
  return [
    {
      id: 'event',
      header: labels?.event ?? 'Event',
      rowHeader: true,
      cell: (e) => (
        <span className="pu-evt-what">
          <WhenCell when={e.when} timeZone={timeZone} labels={words} />
          <span className="pu-evt-title">{e.title}</span>
          {(e.country || e.period) && <span className="pu-evt-sub">{[e.country, e.period].filter(Boolean).join(' · ')}</span>}
          <ImportanceBadge level={e.importance} labels={words} suffix={labels?.impact ?? 'impact'} />
          <span className="pu-evt-fold">
            <span>{labels?.previous ?? 'Previous'} <b>{figure(e, e.previous)}</b></span>
            <OutcomeBadge comparison={economicResult(e)} labels={words} unit={e.unit} />
          </span>
        </span>
      ),
    },
    { id: 'actual', header: labels?.actual ?? 'Actual', kind: 'quantity', cell: (e) => <strong className="pu-evt-actual">{figure(e, e.actual)}</strong> },
    { id: 'forecast', header: labels?.forecast ?? 'Forecast', kind: 'quantity', cell: (e) => figure(e, e.forecast) },
    { id: 'previous', header: labels?.previous ?? 'Previous', kind: 'quantity', hideUnder: 760, cell: (e) => figure(e, e.previous) },
    { id: 'result', header: labels?.result ?? 'Result', hideUnder: 760, cell: (e) => <OutcomeBadge comparison={economicResult(e)} labels={words} unit={e.unit} /> },
  ];
}

/**
 * @stability beta
 */
export function EconomicCalendar({ events, caption, timeZone, calendar = 'ad', language, minImportance, locale = 'en-IN', headingLevel = 3, labels, testId }: EconomicCalendarProps) {
  const words = useMemo((): CalendarWords => ({ ...DEFAULT_CALENDAR_WORDS, ...labels }), [labels]);
  const shown = useMemo(() => (minImportance ? events.filter((e) => importanceRank(e.importance) >= importanceRank(minImportance)) : events), [events, minImportance]);
  const columns = useMemo(() => economicColumns(words, labels, locale, timeZone), [words, labels, locale, timeZone]);
  return (
    <CalendarDays
      kind="economic"
      className="pu-ecal"
      items={shown}
      when={(e) => e.when}
      tie={(e) => e.title}
      rowKey={(e) => e.id}
      columns={columns}
      caption={caption}
      timeZone={timeZone}
      calendar={calendar}
      locale={locale}
      language={language}
      headingLevel={headingLevel}
      labels={words}
      empty={labels?.empty ?? 'No releases to show.'}
      testId={testId}
    />
  );
}
