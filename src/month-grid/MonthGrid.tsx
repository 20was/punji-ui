'use client';

/**
 * MonthGrid (design.punji.app/components/month-grid): a year by month table of returns, one calendar at a time,
 * Gregorian (AD) or Bikram Sambat (BS). The seasonality grid: how a subject did in each month of each year.
 *
 *   rows      one per year, oldest first, then the year's own return when the year has one
 *   foot      Average (a month with fewer than `minYears` years prints its words instead of a figure) and
 *             how often the month rose, with its sample ("4 of 7")
 *   pick      with `onSelect` each month head is a button (`aria-pressed`); the arrow keys move the choice along
 *             the heads and focus follows
 *
 * Every cell prints its value with its sign ("+6.7%", "−2.1%"); the shade (gain and loss tokens) only repeats it.
 * An absent month is a quiet dot with its words for screen readers and as its tooltip, never a bare dash or a
 * computed zero. The table scrolls sideways inside its own focusable region, never the page. Month names come from
 * the Nepal calendar (`BS_MONTHS`) for BS and from `Intl` for AD; pass `months` to use your own.
 */
import { type KeyboardEvent, type ReactNode } from 'react';

import { heatBand, signedPercent, type HeatBand, type HeatTone } from '../internal/heat.ts';
import { BS_MONTHS } from '../nepal/locale.ts';

export type MonthGridCalendar = 'ad' | 'bs';

export interface MonthGridYear {
  /** The AD year, or the BS year (2082) on the BS calendar. */
  year: number;
  /** Percent return per month, 12 values: index 0 is January (AD) or Baisakh (BS). `null` or missing: no figure, never zero. */
  months: readonly (number | null | undefined)[];
  /** The year's own return in percent; `null` or missing when the year is not complete. */
  yearReturn?: number | null;
}

export interface MonthGridStat {
  /** 1 to 12. */
  month: number;
  /** Mean of the month across years; `null` while the month has fewer than `minYears` years. */
  average: number | null;
  /** Years in which the month rose. */
  positive: number;
  /** Years with a figure for the month. */
  years: number;
  /** Share of those years that rose, in percent; `null` with no years. */
  positivePct: number | null;
}

export interface MonthGridData {
  /** Which month names head the grid: 'ad' (January to December) or 'bs' (Baisakh to Chaitra). */
  calendar: MonthGridCalendar;
  /** One row per year, oldest first. */
  years: readonly MonthGridYear[];
  /** The foot rows. Omit it and they are worked out from `years` with `monthGridStats`. */
  months?: readonly MonthGridStat[];
}

export interface MonthGridLabels {
  /** The first head. Default "Year". */
  year: string;
  /** The last head (the year's own return). Default "Year". */
  yearReturn: string;
  /** The average row. Default "Average". */
  average: string;
  /** The share-up row. Default "Rose". */
  shareUp: string;
  /** An absent month, in words. Default "No data". */
  noData: string;
  /** A month with no average yet. Default "Needs N years". */
  noAverage: (minYears: number) => string;
  /** A year with no full-year return. Default "Not a full year". */
  noYear: string;
  /** "4 of 7" under a month's share up. */
  ofYears: (positive: number, years: number) => string;
  /** A cell's tooltip: "Shrawan 2081: +6.7%". */
  cellTitle: (month: string, year: string, value: string) => string;
  /** Legend: a fall. Default "Fell; darker is deeper". */
  legendFell: string;
  /** Legend: a rise. Default "Rose; darker is higher". */
  legendRose: string;
  /** Legend: no figure. Default "No data". */
  legendNone: string;
  /** The legend list's accessible name. Default "Key". */
  key: string;
}

export interface MonthGridProps {
  /** The years, the calendar and (optionally) the foot rows. */
  grid: MonthGridData;
  /** Names the region and the table's caption ("NEPSE by month, AD calendar"). */
  label: string;
  /** Twelve full names (tooltips, screen readers) and twelve short ones (the head). Default: from the calendar and `language`. */
  months?: { full: readonly string[]; short: readonly string[] };
  /** Month and year words when `months` is not given. Default 'en'. */
  language?: 'en' | 'ne';
  /** Prints a return. Default signed percent, one decimal ("+4.2%", "−4.2%"). */
  formatReturn?: (value: number) => string;
  /** Prints a share in percent with no sign ("57%"). Default a rounded whole percent. */
  formatShare?: (percent: number) => string;
  /** Prints a year (a BS year may print in Devanagari digits). Default the number. */
  formatYear?: (year: number) => string;
  /** A month needs this many years before it has an average. Default 5. Used when `grid.months` is omitted. */
  minYears?: number;
  /** The chosen month, 1 to 12, ringed. */
  selected?: number | null;
  /** Makes every month head a button. Called with the month, 1 to 12. */
  onSelect?: (month: number) => void;
  /** Why one absent month has no figure ("Under 10 sessions"). Default `labels.noData`. */
  absent?: (year: number, month: number) => string | undefined;
  /** Print the key under the table. Default false. */
  legend?: boolean;
  /** One line in the average row while no month has an average. */
  averageNote?: ReactNode;
  /** Overrides for the printed words. */
  labels?: Partial<MonthGridLabels>;
  /** Layout only. */
  className?: string;
  /** Test id on the table; the region is `${testId}-region`. */
  testId?: string;
}

const AD_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DEFAULT_LABELS: MonthGridLabels = {
  year: 'Year',
  yearReturn: 'Year',
  average: 'Average',
  shareUp: 'Rose',
  noData: 'No data',
  noAverage: (minYears) => `Needs ${minYears} years`,
  noYear: 'Not a full year',
  ofYears: (positive, years) => `${positive} of ${years}`,
  cellTitle: (month, year, value) => `${month} ${year}: ${value}`,
  legendFell: 'Fell; darker is deeper',
  legendRose: 'Rose; darker is higher',
  legendNone: 'No data',
  key: 'Key',
};

/** The default month names for a calendar and language: BS from the Nepal calendar, AD from Intl (English fixed). */
export function monthNames(calendar: MonthGridCalendar, language: 'en' | 'ne' = 'en'): { full: string[]; short: string[] } {
  let full: string[];
  if (calendar === 'bs') full = [...BS_MONTHS[language]];
  else if (language === 'en') full = [...AD_EN];
  else {
    const f = new Intl.DateTimeFormat('ne-NP', { month: 'long', timeZone: 'UTC' });
    full = AD_EN.map((_, i) => f.format(new Date(Date.UTC(2024, i, 15))));
  }
  return { full, short: language === 'en' ? full.map((m) => m.slice(0, 3)) : full };
}

/**
 * The foot rows from the years: for each month, how many years have a figure, how many of them rose, their share, and
 * the average once `minYears` years are in. Pure; the average is a float mean, display only.
 */
export function monthGridStats(years: readonly MonthGridYear[], minYears = 5): MonthGridStat[] {
  return Array.from({ length: 12 }, (_, m) => {
    const values = years.map((y) => y.months[m]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const positive = values.filter((v) => v > 0).length;
    return {
      month: m + 1,
      years: values.length,
      positive,
      positivePct: values.length ? (positive / values.length) * 100 : null,
      average: values.length >= Math.max(1, minYears) ? values.reduce((s, v) => s + v, 0) / values.length : null,
    };
  });
}

const STEP: Record<string, (m: number) => number> = {
  ArrowRight: (m) => (m % 12) + 1,
  ArrowDown: (m) => (m % 12) + 1,
  ArrowLeft: (m) => ((m + 10) % 12) + 1,
  ArrowUp: (m) => ((m + 10) % 12) + 1,
  Home: () => 1,
  End: () => 12,
};

const shareText = (p: number) => `${Math.round(p)}%`;
const dir = (v: number) => (v > 0 ? 'gain' : v < 0 ? 'loss' : 'flat');

function Absent({ words }: { words: string }) {
  return (
    <>
      <span aria-hidden="true" className="pu-mg-none">{'·'}</span>
      <span className="kit-sr">{words}</span>
    </>
  );
}

/** A heat cell's data attributes: the direction and the band; CSS turns them into a shade. */
function cellAttrs(v: number): { 'data-tone': HeatTone; 'data-band': HeatBand } {
  const { tone, band } = heatBand(v);
  return { 'data-tone': tone, 'data-band': band };
}

/**
 * @stability beta
 */
export function MonthGrid({ grid, label, months, language = 'en', formatReturn = signedPercent, formatShare = shareText, formatYear = String, minYears = 5, selected = null, onSelect, absent, legend = false, averageNote, labels, className, testId }: MonthGridProps) {
  const words = { ...DEFAULT_LABELS, ...labels };
  const names = months ?? monthNames(grid.calendar, language);
  const stats = grid.months ?? monthGridStats(grid.years, minYears);
  const anyYearReturn = grid.years.some((y) => y.yearReturn !== null && y.yearReturn !== undefined);
  const anyAverage = stats.some((s) => s.average !== null);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, m: number) => {
    const step = STEP[e.key];
    if (!onSelect || !step) return;
    e.preventDefault();
    const to = step(m);
    onSelect(to);
    e.currentTarget.closest('table')?.querySelector<HTMLButtonElement>(`[data-month="${to}"]`)?.focus();
  };
  const head = (i: number) => {
    const m = i + 1;
    const short = names.short[i] ?? String(m);
    const full = names.full[i] ?? short;
    if (!onSelect) return short;
    return (
      <button type="button" className="pu-mg-pick" aria-pressed={selected === m} title={full} data-month={m} onClick={() => onSelect(m)} onKeyDown={(e) => onKey(e, m)} data-testid={testId ? `${testId}-month-${m}` : undefined}>
        {short}
        {short !== full && <span className="kit-sr">{` (${full})`}</span>}
      </button>
    );
  };
  const sel = (m: number) => (selected === m ? '' : undefined);

  return (
    <div className={className ? `pu-mg-root ${className}` : 'pu-mg-root'}>
      {/* The region scrolls sideways when the table is wider than the screen, so it must be reachable by keyboard. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="pu-mg-box" tabIndex={0} role="region" aria-label={label} data-testid={testId ? `${testId}-region` : undefined}>
        <table className="pu-mg" data-calendar={grid.calendar} data-testid={testId}>
          <caption className="kit-sr">{label}</caption>
          <thead>
            <tr>
              <th scope="col" className="pu-mg-y">{words.year}</th>
              {Array.from({ length: 12 }, (_, i) => (
                <th key={i} scope="col" abbr={names.full[i]} data-selected={sel(i + 1)}>{head(i)}</th>
              ))}
              {anyYearReturn && <th scope="col" className="pu-mg-yr">{words.yearReturn}</th>}
            </tr>
          </thead>
          <tbody>
            {grid.years.map((y) => (
              <tr key={y.year} data-testid={testId ? `${testId}-year-${y.year}` : undefined}>
                <th scope="row" className="pu-mg-y">{formatYear(y.year)}</th>
                {Array.from({ length: 12 }, (_, i) => {
                  const v = y.months[i];
                  const full = names.full[i] ?? '';
                  const id = testId ? `${testId}-cell-${y.year}-${i + 1}` : undefined;
                  if (v === null || v === undefined || !Number.isFinite(v)) {
                    const why = absent?.(y.year, i + 1) ?? words.noData;
                    return (
                      <td key={i} className="pu-mg-c" data-tone="none" data-selected={sel(i + 1)} title={`${full} ${formatYear(y.year)}: ${why}`} data-testid={id}>
                        <Absent words={why} />
                      </td>
                    );
                  }
                  const text = formatReturn(v);
                  return (
                    <td key={i} className="pu-mg-c" {...cellAttrs(v)} data-selected={sel(i + 1)} title={words.cellTitle(full, formatYear(y.year), text)} data-testid={id}>
                      {text}
                    </td>
                  );
                })}
                {anyYearReturn && (
                  <td className="pu-mg-yr" title={y.yearReturn === null || y.yearReturn === undefined ? words.noYear : undefined}>
                    {y.yearReturn === null || y.yearReturn === undefined ? <Absent words={words.noYear} /> : <span className="pu-mg-fig" data-dir={dir(y.yearReturn)}>{formatReturn(y.yearReturn)}</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="pu-mg-avg" data-testid={testId ? `${testId}-average` : undefined}>
              <th scope="row" className="pu-mg-y">{words.average}</th>
              {!anyAverage && averageNote ? (
                <td colSpan={12} className="pu-mg-note">{averageNote}</td>
              ) : (
                stats.map((s) => (
                  <td key={s.month} data-selected={sel(s.month)} title={s.average === null ? words.noAverage(minYears) : undefined}>
                    {s.average === null ? <Absent words={words.noAverage(minYears)} /> : <span className="pu-mg-fig" data-dir={dir(s.average)}>{formatReturn(s.average)}</span>}
                  </td>
                ))
              )}
              {anyYearReturn && <td>{'\u00a0'}</td>}
            </tr>
            <tr className="pu-mg-rose" data-testid={testId ? `${testId}-rose` : undefined}>
              <th scope="row" className="pu-mg-y">{words.shareUp}</th>
              {stats.map((s) => (
                <td key={s.month} data-selected={sel(s.month)} title={s.positivePct === null ? words.noData : words.ofYears(s.positive, s.years)}>
                  {s.positivePct === null ? (
                    <Absent words={words.noData} />
                  ) : (
                    <>
                      <b>{formatShare(s.positivePct)}</b>
                      <small>{words.ofYears(s.positive, s.years)}</small>
                    </>
                  )}
                </td>
              ))}
              {anyYearReturn && <td>{'\u00a0'}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
      {legend && (
        <ul className="pu-mg-key" aria-label={words.key}>
          <li><i className="pu-mg-c" data-tone="loss" data-band="2" aria-hidden="true" /><i className="pu-mg-c" data-tone="loss" data-band="4" aria-hidden="true" />{words.legendFell}</li>
          <li><i className="pu-mg-c" data-tone="gain" data-band="2" aria-hidden="true" /><i className="pu-mg-c" data-tone="gain" data-band="4" aria-hidden="true" />{words.legendRose}</li>
          <li><i className="pu-mg-c" data-tone="none" aria-hidden="true" />{words.legendNone}</li>
        </ul>
      )}
    </div>
  );
}
