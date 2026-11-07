import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { compareToForecast, dayInZone, earningsResult, EarningsCalendar, EconomicCalendar, groupCalendarByDay, zoneLabel, type EarningsEvent, type EconomicEvent } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const flat = (t: string | null | undefined) => (t ?? '').replaceAll(' ', ' ');
const KTM = 'Asia/Kathmandu';
const result = (name: string) => flat([...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent!.includes(name))!.lastElementChild!.textContent);

describe('compareToForecast', () => {
  it('beat, miss and in line, exact to the digit and as a percent of the forecast', () => {
    expect(compareToForecast('3.2', '3.0')).toEqual({ outcome: 'beat', difference: 2n, scale: 1, percent: '6.7' });
    expect(compareToForecast('2.85', '3.0')).toEqual({ outcome: 'miss', difference: -15n, scale: 2, percent: '-5.0' });
    expect(compareToForecast('3.00', '3.0')).toMatchObject({ outcome: 'inline', difference: 0n, scale: 2 });
  });

  it('lets lower be better, so a fall in unemployment is a beat', () => {
    expect(compareToForecast('3.9', '4.0', 'lower')).toMatchObject({ outcome: 'beat', difference: -1n });
    expect(compareToForecast('4.1', '4.0', 'lower')).toMatchObject({ outcome: 'miss', difference: 1n });
  });

  it('is pending without an actual, and reported without a forecast', () => {
    expect(compareToForecast(undefined, '1.0').outcome).toBe('pending');
    expect(compareToForecast('', '1.0').outcome).toBe('pending');
    expect(compareToForecast('1.0', undefined)).toMatchObject({ outcome: 'reported', difference: null });
  });

  it('does not touch a float: it separates values a float cannot', () => {
    expect(compareToForecast('9007199254740993.1', '9007199254740993.0')).toMatchObject({ outcome: 'beat', difference: 1n, scale: 1 });
    expect(compareToForecast('0.30', '0.1').difference).toBe(20n);
  });

  it('gives no percent for a zero forecast, and rejects malformed numbers', () => {
    expect(compareToForecast('1', '0').percent).toBeNull();
    expect(() => compareToForecast('1e3', '1')).toThrow(RangeError);
    expect(() => compareToForecast('1', '1,5')).toThrow(RangeError);
  });
});

describe('days and time zones', () => {
  it('puts an instant on the day it is in the stated zone, which can differ from the UTC day', () => {
    // 20:30 UTC on 13 Nov is 02:15 on 14 Nov in Kathmandu (UTC+05:45) and 15:30 on 13 Nov in New York.
    expect(dayInZone('2025-11-13T20:30:00Z', KTM)).toBe('2025-11-14');
    expect(dayInZone('2025-11-13T20:30:00Z', 'America/New_York')).toBe('2025-11-13');
    expect(dayInZone('2025-11-13T20:30:00Z', 'UTC')).toBe('2025-11-13');
    expect(dayInZone('2025-11-14T01:00:00+05:45', KTM)).toBe('2025-11-14');
    expect(dayInZone('2025-11-14', 'America/New_York')).toBe('2025-11-14');
  });

  it('rejects text that is neither a day nor a time with an offset', () => {
    expect(() => dayInZone('14 Nov 2025', KTM)).toThrow(RangeError);
    expect(() => dayInZone('2025-11-14T08:30:00', KTM)).toThrow(RangeError);
  });

  it('groups by day ascending, no-time events first, then by time, then by title', () => {
    const items = [
      { id: 'c', when: '2025-11-14T10:00:00Z', t: 'B' },
      { id: 'a', when: '2025-11-14T10:00:00Z', t: 'A' },
      { id: 'd', when: '2025-11-15', t: 'Z' },
      { id: 'e', when: '2025-11-14', t: 'All day' },
      { id: 'f', when: '2025-11-14T04:00:00Z', t: 'Early' },
    ];
    const groups = groupCalendarByDay(items, (i) => i.when, KTM, (i) => i.t);
    expect(groups.map((g) => [g.day, g.items.map((i) => i.id)])).toEqual([['2025-11-14', ['e', 'f', 'a', 'c']], ['2025-11-15', ['d']]]);
    expect(items[0]!.id).toBe('c');
  });

  it('names the zone with its UTC offset on a stated day', () => {
    expect(zoneLabel(KTM, Date.parse('2025-11-14T00:00:00Z'))).toBe('Asia/Kathmandu, UTC+05:45');
    expect(zoneLabel('UTC', Date.parse('2025-11-14T00:00:00Z'))).toBe('UTC, UTC+00:00');
    expect(zoneLabel('America/New_York', Date.parse('2025-07-01T00:00:00Z'))).toBe('America/New_York, UTC-04:00');
    expect(zoneLabel('America/New_York', Date.parse('2025-12-01T00:00:00Z'))).toBe('America/New_York, UTC-05:00');
  });
});

const macro: EconomicEvent[] = [
  { id: 'cpi', when: '2025-11-14T08:30:00Z', title: 'Consumer price index', country: 'US', period: 'Oct', importance: 'high', actual: '3.2', forecast: '3.0', previous: '2.9', unit: '%' },
  { id: 'jobs', when: '2025-11-14T13:15:00Z', title: 'Unemployment rate', country: 'US', importance: 'medium', actual: '4.1', forecast: '4.0', previous: '4.0', unit: '%', better: 'lower' },
  { id: 'rate', when: '2025-11-15T05:00:00Z', title: 'Policy rate decision', country: 'Nepal', importance: 'high', forecast: '5.50', previous: '5.50', unit: '%' },
  { id: 'trade', when: '2025-11-15', title: 'Trade balance', importance: 'low', actual: '-12', forecast: '-10' },
  { id: 'inline', when: '2025-11-13T23:00:00Z', title: 'Retail sales', importance: 'low', actual: '0.5', forecast: '0.50', previous: '0.4', unit: '%' },
];

describe('EconomicCalendar', () => {
  it('groups by day in the stated zone, with a heading per day and the zone printed once', () => {
    render(<EconomicCalendar caption="Macro releases" events={macro} timeZone={KTM} testId="c" />);
    expect(screen.getByText(/All times in Asia\/Kathmandu, UTC\+05:45/)).toBeTruthy();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => flat(h.textContent));
    // 23:00 UTC on 13 Nov is 04:45 on 14 Nov in Kathmandu, so retail sales sits with the 14th.
    expect(headings).toEqual(['Friday 14 November 2025', 'Saturday 15 November 2025']);
    const first = screen.getByTestId('c-economic-2025-11-14');
    expect(within(first).getAllByRole('row')).toHaveLength(1 + 3);
    expect(screen.getByRole('region', { name: 'Macro releases, Friday 14 November 2025' })).toBe(first);
  });

  it('prints importance in words, and actual, forecast and previous with their units', () => {
    render(<EconomicCalendar caption="Macro" events={macro} timeZone={KTM} testId="c" />);
    const table = within(screen.getByTestId('c-economic-2025-11-14')).getByRole('table');
    expect([...table.querySelectorAll('thead th')].map((h) => flat(h.textContent))).toEqual(['Event', 'Actual', 'Forecast', 'Previous', 'Result']);
    const row = (name: string) => [...table.querySelectorAll('tbody tr')].find((tr) => tr.textContent!.includes(name))!;
    const cells = [...row('Consumer price index').children].map((c) => flat(c.textContent));
    expect(cells[0]).toBe('14:15Consumer price indexUS · OctHigh impact');
    expect(cells.slice(1)).toEqual(['3.2%', '3.0%', '2.9%', '▲ Beat +0.2%, +6.7%']);
    expect(flat(row('Unemployment').children[0]!.textContent)).toContain('Medium impact');
    expect(flat(row('Retail').children[0]!.textContent)).toContain('Low impact');
  });

  it('says beat, missed, in line and awaiting in words, with the arrow for which side of the forecast', () => {
    render(<EconomicCalendar caption="Macro" events={macro} timeZone={KTM} testId="c" />);
    expect(result('Consumer price index')).toBe('▲ Beat +0.2%, +6.7%');
    // Unemployment rose above its forecast and lower is better: a miss, still marked with the up arrow.
    expect(result('Unemployment rate')).toBe('▲ Missed +0.1%, +2.5%');
    expect(result('Retail sales')).toBe('● In line');
    expect(result('Policy rate decision')).toBe('○ Awaiting');
    expect(result('Trade balance')).toBe('▼ Missed −2, −20.0%');
    // A thousands separator is not a decimal string: it throws rather than guess.
    expect(() => render(<EconomicCalendar caption="Bad" events={[{ ...macro[0]!, actual: '1,200' }]} timeZone={KTM} />)).toThrow(RangeError);
  });

  it('shows the time in the stated zone, "Time not set" for a day-only release', () => {
    render(<EconomicCalendar caption="Macro" events={macro} timeZone={KTM} testId="c" />);
    const day = screen.getByTestId('c-economic-2025-11-15');
    expect(flat(day.textContent)).toContain('Time not set');
    expect(flat(day.textContent)).toContain('10:45'); // 05:00 UTC
    expect(day.querySelector('time[datetime="2025-11-15T05:00:00Z"]')).not.toBeNull();
  });

  it('hides releases under the minimum importance', () => {
        render(<EconomicCalendar caption="Macro" events={macro} timeZone={KTM} minImportance="high" testId="c" />);
    expect(screen.queryByText('Unemployment rate')).toBeNull();
    expect(screen.getByText('Consumer price index')).toBeTruthy();
    expect(screen.getByText('Policy rate decision')).toBeTruthy();
  });

  it('prints BS and AD through the library calendar, and marks a projected BS month', () => {
        const { rerender } = render(<EconomicCalendar caption="Macro" events={macro} timeZone={KTM} calendar="both" />);
    const heading = screen.getAllByRole('heading', { level: 3 })[0]!;
    expect(flat(heading.textContent)).toMatch(/^Friday .*Nov 2025 AD.*Kartik 2082 BS/);
    expect(heading.querySelector('[data-bs-status="projected"]')).toBeNull();
    rerender(<EconomicCalendar caption="Macro" events={[{ id: 'x', when: '2027-04-30T05:00:00Z', title: 'Future', importance: 'low' }]} timeZone={KTM} calendar="bs" />);
    const projected = screen.getAllByRole('heading', { level: 3 })[0]!;
    expect(projected.querySelector('[data-bs-status="projected"]')?.textContent).toContain('projected');
    expect(flat(projected.textContent)).toMatch(/Baisakh 2084 BS/);
  });

  it('prints an empty state, and replaces words through labels', () => {
    const { rerender } = render(<EconomicCalendar caption="Macro" events={[]} timeZone={KTM} />);
    expect(screen.getByText('No releases to show.')).toBeTruthy();
    rerender(<EconomicCalendar caption="Macro" events={[macro[0]!]} timeZone={KTM} labels={{ beat: 'Ramro', high: 'Uchcha', impact: 'prabhav', allTimesIn: (z) => `Samay: ${z}` }} />);
    expect(screen.getByText(/Samay: Asia\/Kathmandu/)).toBeTruthy();
    expect(screen.getByText('Uchcha prabhav')).toBeTruthy();
    expect(screen.getByText(/Ramro/)).toBeTruthy();
  });

  it('takes the heading level of each day', () => {
    render(<EconomicCalendar caption="Macro" events={macro.slice(0, 2)} timeZone={KTM} headingLevel={2} />);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(1);
  });

  it('has no serious axe violations, with projected BS dates and day-only events', async () => {
    const { container } = render(<EconomicCalendar caption="Macro" events={[...macro, { id: 'x', when: '2027-04-30', title: 'Future', importance: 'low' }]} timeZone={KTM} calendar="both" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

const results: EarningsEvent[] = [
  { id: 'nabil', when: '2025-11-14', session: 'before-open', symbol: 'NABIL', company: 'Nabil Bank', period: 'Q1 FY26', currency: 'NPR', epsActual: '4.38', epsForecast: '4.10', epsPrevious: '3.95', revenueActual: '12.4', revenueForecast: '12.9', revenueUnit: ' bn' },
  { id: 'nica', when: '2025-11-14T09:30:00Z', symbol: 'NICA', company: 'NIC Asia', period: 'Q1 FY26', currency: 'NPR', epsActual: '3.10', epsForecast: '3.10', epsPrevious: '2.80' },
  { id: 'hdl', when: '2025-11-17', session: 'after-close', symbol: 'HDL', company: 'Himalayan Distillery', period: 'Q1 FY26', currency: 'NPR', epsForecast: '12.00', epsPrevious: '11.20' },
  { id: 'ntc', when: '2025-11-17', symbol: 'NTC', company: 'Nepal Telecom', period: 'Q1 FY26' },
];

describe('EarningsCalendar', () => {
  it('compares EPS and revenue to their forecasts, exactly', () => {
    const r = earningsResult(results[0]!);
    expect(r.eps).toEqual({ outcome: 'beat', difference: 28n, scale: 2, percent: '6.8' });
    expect(r.revenue).toEqual({ outcome: 'miss', difference: -5n, scale: 1, percent: '-3.9' });
  });

  it('groups by reporting day, with the session or time of each report and the zone stated', () => {
    render(<EarningsCalendar caption="Results" events={results} timeZone={KTM} testId="e" />);
    expect(screen.getByText(/All times in Asia\/Kathmandu/)).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => flat(h.textContent))).toEqual(['Friday 14 November 2025', 'Monday 17 November 2025']);
    const first = flat(screen.getByTestId('e-earnings-2025-11-14').textContent);
    expect(first).toContain('Before open');
    expect(first).toContain('15:15'); // 09:30 UTC
    const second = flat(screen.getByTestId('e-earnings-2025-11-17').textContent);
    expect(second).toContain('After close');
    expect(second).toContain('Time not set');
  });

  it('prints EPS and revenue as currency and unit text, and beat or miss words with exact gaps', () => {
    render(<EarningsCalendar caption="Results" events={results} timeZone={KTM} testId="e" />);
    const table = within(screen.getByTestId('e-earnings-2025-11-14')).getByRole('table');
    expect([...table.querySelectorAll('thead th')].map((h) => flat(h.textContent))).toEqual(['Company', 'Period', 'EPS actual', 'EPS forecast', 'EPS previous', 'Revenue actual', 'Revenue forecast', 'Result']);
    const nabil = [...[...table.querySelectorAll('tbody tr')].find((tr) => tr.textContent!.includes('NABIL'))!.children].map((c) => flat(c.textContent));
    expect(nabil.slice(1)).toEqual(['Q1 FY26', 'NPR 4.38', 'NPR 4.10', 'NPR 3.95', 'NPR 12.4 bn', 'NPR 12.9 bn', 'EPS ▲ Beat +0.28, +6.8%Revenue ▼ Missed −0.5 bn, −3.9%']);
    const nica = [...[...table.querySelectorAll('tbody tr')].find((tr) => tr.textContent!.includes('NICA'))!.children].map((c) => flat(c.textContent));
    expect(nica[nica.length - 1]).toContain('In line');
  });

  it('says awaiting for a report not out, and shows a dash for a figure not given', () => {
    render(<EarningsCalendar caption="Results" events={results} timeZone={KTM} testId="e" />);
    const table = within(screen.getByTestId('e-earnings-2025-11-17')).getByRole('table');
    const rows = [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => flat(c.textContent)));
    expect(rows[0]!.slice(1)).toEqual(['Q1 FY26', '—', 'NPR 12.00', 'NPR 11.20', '—', '—', '○ Awaiting']);
    expect(rows[1]![rows[1]!.length - 1]).toBe('○ Awaiting');
  });

  it('prints BS and AD, with the projected marker, and the result words can be replaced', () => {
    render(<EarningsCalendar caption="Results" events={[{ id: 'f', when: '2027-04-30', symbol: 'ABC', company: 'ABC Ltd', epsActual: '1.00', epsForecast: '0.90' }]} timeZone={KTM} calendar="both" labels={{ beat: 'Ramro' }} />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.querySelector('[data-bs-status="projected"]')).not.toBeNull();
    expect(screen.getByText(/Ramro/)).toBeTruthy();
  });

  it('prints an empty state', () => {
    render(<EarningsCalendar caption="Results" events={[]} timeZone={KTM} />);
    expect(screen.getByText('No reports to show.')).toBeTruthy();
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<EarningsCalendar caption="Results" events={results} timeZone={KTM} calendar="both" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
