'use client';

/**
 * EarningsCalendar (design.punji.app/components/earnings-calendar): company results grouped by the day they are
 * reported, each with the time or session, the fiscal period, earnings per share and revenue as actual against forecast
 * (EPS also against the previous figure), and a beat or miss in words with the exact gap and its percent.
 *
 * Built on ScrollTable, so every day is a named, keyboard-scrollable table with a sticky first column. The time zone is a
 * required prop and is printed above the list with its UTC offset. Days print in AD, BS or both; a BS month nobody has
 * published carries the "projected" marker. Companies that report outside market hours say "Before open" or "After
 * close" rather than guessing a clock time.
 *
 * Figures are decimal strings ("4.38"), compared in bigint; a beat is the actual above the forecast.
 *
 * @stability beta
 */
import { useMemo, type ReactNode } from 'react';

import { CalendarDays, OutcomeBadge, WhenCell, DEFAULT_CALENDAR_WORDS, type EventCalendarSystem, type CalendarWords } from '../internal/calendarDays.tsx';
import { compareToForecast, formatDecimalText, isDayOnly, type CalendarWhen, type Comparison } from '../internal/calendarMath.ts';
import type { NepalLanguage } from '../nepal/locale.ts';
import type { ColumnDef } from '../table-core/tableModel.ts';

export type EarningsSession = 'before-open' | 'during' | 'after-close';

export interface EarningsEvent {
  /** Stable key. */
  id: string;
  /** The reporting day (`2025-11-14`) or an ISO time with `Z` or an offset. */
  when: CalendarWhen;
  /** The ticker ("NABIL"). */
  symbol: string;
  /** The company's name. */
  company: string;
  /** Before the market opens, during it, or after it closes. Use it when there is no exact time. */
  session?: EarningsSession;
  /** The fiscal period reported ("Q2 FY26"). */
  period?: string;
  /** ISO currency for the figures ("NPR"). Without it figures print as plain numbers. */
  currency?: string;
  /** Reported earnings per share, a decimal string. Leave it out until it is out. */
  epsActual?: string;
  /** The consensus EPS forecast, a decimal string. */
  epsForecast?: string;
  /** The previous period's EPS, a decimal string. */
  epsPrevious?: string;
  /** Reported revenue, a decimal string in `revenueUnit`. */
  revenueActual?: string;
  /** The consensus revenue forecast, a decimal string. */
  revenueForecast?: string;
  /** Printed after revenue figures, with its own spacing (" M", " bn"). */
  revenueUnit?: string;
}

export interface EarningsCalendarLabels extends Partial<CalendarWords> {
  company?: string;
  period?: string;
  epsActual?: string;
  epsForecast?: string;
  epsPrevious?: string;
  revenueActual?: string;
  revenueForecast?: string;
  result?: string;
  /** Prefixes in the result cell. Default "EPS" and "Revenue". */
  eps?: string;
  revenue?: string;
  beforeOpen?: string;
  during?: string;
  afterClose?: string;
  empty?: ReactNode;
}

export interface EarningsCalendarProps {
  /** The reports, any order. */
  events: readonly EarningsEvent[];
  /** Names the calendar and each day's table. */
  caption: string;
  /** The IANA time zone every time and every day is shown in. Required: the calendar never uses the reader's zone. */
  timeZone: string;
  /** How days print. Default 'ad'. 'both' leads with AD and adds BS; 'bs' leads with BS. */
  calendar?: EventCalendarSystem;
  /** Month names for BS dates. Default 'en'. */
  language?: NepalLanguage;
  /** BCP 47 tag for weekday names and number grouping. Default "en-IN". */
  locale?: string;
  /** Heading level of each day (2 to 4). Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Overrides for the printed and spoken words. */
  labels?: EarningsCalendarLabels;
  /** Becomes data-testid on the root; each day's table gets `${testId}-earnings-${day}`. */
  testId?: string;
}

/** EPS and revenue compared with their forecasts for one report, exact. Throws a RangeError for a malformed figure. */
export function earningsResult(event: Pick<EarningsEvent, 'epsActual' | 'epsForecast' | 'revenueActual' | 'revenueForecast'>): { eps: Comparison; revenue: Comparison } {
  return { eps: compareToForecast(event.epsActual, event.epsForecast), revenue: compareToForecast(event.revenueActual, event.revenueForecast) };
}

/** The day tables' columns, built outside the component so each cell is a plain function of its row. */
function earningsColumns(words: CalendarWords, labels: EarningsCalendarLabels | undefined, locale: string, timeZone: string): ColumnDef<EarningsEvent, ReactNode>[] {
  const session = { 'before-open': labels?.beforeOpen ?? 'Before open', during: labels?.during ?? 'During hours', 'after-close': labels?.afterClose ?? 'After close' };
  const money = (e: EarningsEvent, value: string | undefined, unit = '') => (value === undefined || value === '' ? words.none : `${formatDecimalText(value, locale, { currency: e.currency })}${unit}`);
  return [
    {
      id: 'company',
      header: labels?.company ?? 'Company',
      rowHeader: true,
      cell: (e) => (
        <span className="pu-evt-what">
          {isDayOnly(e.when) ? <span className="pu-evt-time none">{e.session ? session[e.session] : words.noTime}</span> : <WhenCell when={e.when} timeZone={timeZone} labels={words} />}
          <span className="pu-evt-title"><b>{e.symbol}</b> {e.company}</span>
          {e.session && !isDayOnly(e.when) && <span className="pu-evt-sub">{session[e.session]}</span>}
        </span>
      ),
    },
    { id: 'period', header: labels?.period ?? 'Period', cell: (e) => e.period ?? words.none },
    { id: 'epsActual', header: labels?.epsActual ?? 'EPS actual', kind: 'quantity', cell: (e) => <strong className="pu-evt-actual">{money(e, e.epsActual)}</strong> },
    { id: 'epsForecast', header: labels?.epsForecast ?? 'EPS forecast', kind: 'quantity', cell: (e) => money(e, e.epsForecast) },
    { id: 'epsPrevious', header: labels?.epsPrevious ?? 'EPS previous', kind: 'quantity', cell: (e) => money(e, e.epsPrevious) },
    { id: 'revenueActual', header: labels?.revenueActual ?? 'Revenue actual', kind: 'quantity', cell: (e) => <strong className="pu-evt-actual">{money(e, e.revenueActual, e.revenueUnit)}</strong> },
    { id: 'revenueForecast', header: labels?.revenueForecast ?? 'Revenue forecast', kind: 'quantity', cell: (e) => money(e, e.revenueForecast, e.revenueUnit) },
    {
      id: 'result',
      header: labels?.result ?? 'Result',
      cell: (e) => {
        const { eps, revenue } = earningsResult(e);
        const both = eps.outcome !== 'pending' || revenue.outcome !== 'pending';
        if (!both) return <OutcomeBadge comparison={eps} labels={words} />;
        return (
          <span className="pu-evt-pair">
            <span><span className="pu-evt-metric">{labels?.eps ?? 'EPS'}</span> <OutcomeBadge comparison={eps} labels={words} /></span>
            {(e.revenueActual !== undefined || e.revenueForecast !== undefined) && <span><span className="pu-evt-metric">{labels?.revenue ?? 'Revenue'}</span> <OutcomeBadge comparison={revenue} labels={words} unit={e.revenueUnit} showPercent /></span>}
          </span>
        );
      },
    },
  ];
}

/**
 * @stability beta
 */
export function EarningsCalendar({ events, caption, timeZone, calendar = 'ad', language, locale = 'en-IN', headingLevel = 3, labels, testId }: EarningsCalendarProps) {
  const words = useMemo((): CalendarWords => ({ ...DEFAULT_CALENDAR_WORDS, ...labels }), [labels]);
  const columns = useMemo(() => earningsColumns(words, labels, locale, timeZone), [words, labels, locale, timeZone]);
  return (
    <CalendarDays
      kind="earnings"
      className="pu-ern"
      items={events}
      when={(e) => e.when}
      tie={(e) => e.symbol}
      rowKey={(e) => e.id}
      columns={columns}
      caption={caption}
      timeZone={timeZone}
      calendar={calendar}
      locale={locale}
      language={language}
      headingLevel={headingLevel}
      labels={words}
      empty={labels?.empty ?? 'No reports to show.'}
      testId={testId}
    />
  );
}
