import { cleanup, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import * as fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';

import { monthGridStats, SeasonalityChart, seasonalityStats, type MonthGridYear } from '../src/index.ts';
import { NUM_RUNS } from './fc.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const norm = (t: string | null | undefined) => (t ?? '').replaceAll(' ', ' ');
const live = (c: HTMLElement) => norm(c.querySelector('[role="status"]')!.textContent);
const sr = (c: HTMLElement) => norm([...c.querySelectorAll('.kit-sr')].map((e) => e.textContent).join(' | '));
const cells = (c: HTMLElement) => [...c.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((x) => norm(x.textContent)));

const row = (year: number, base: number): MonthGridYear => ({ year, months: Array.from({ length: 12 }, (_, m) => (m === 11 && year === 2078 ? null : Math.round((((m * 7 + year) % 13) - 4 + base) * 10) / 10)) });
const YEARS = [2076, 2077, 2078, 2079, 2080].map((y, i) => row(y, i * 0.5));

describe('seasonalityStats', () => {
  it('works out mean, lowest and highest with their years, and the hit rate', () => {
    const s = seasonalityStats([{ year: 2020, months: [5, -2] }, { year: 2021, months: [-1, -4] }, { year: 2022, months: [3, 6] }]);
    expect(s[0]).toMatchObject({ month: 1, years: 3, min: -1, max: 5, minYear: 2021, maxYear: 2020, positive: 2 });
    expect(s[0]!.mean!).toBeCloseTo(7 / 3, 12);
    expect(s[0]!.hitRate!).toBeCloseTo(200 / 3, 12);
    expect(s[1]).toMatchObject({ min: -4, max: 6, minYear: 2021, maxYear: 2022, positive: 1 });
  });

  it('skips missing months and never counts them as zero', () => {
    const s = seasonalityStats([{ year: 1, months: [null, Number.NaN] }, { year: 2, months: [2, undefined] }]);
    expect(s[0]).toMatchObject({ years: 1, mean: 2, hitRate: 100 });
    expect(s[1]).toMatchObject({ years: 0, mean: null, min: null, max: null, hitRate: null });
  });

  it('holds the mean back until minYears, but keeps the range and hit rate', () => {
    const s = seasonalityStats([{ year: 1, months: [1] }, { year: 2, months: [-3] }], 3);
    expect(s[0]).toMatchObject({ mean: null, min: -3, max: 1, positive: 1, hitRate: 50 });
  });

  it('agrees with monthGridStats on years, positives and average (property)', () => {
    fc.assert(
      fc.property(fc.array(fc.array(fc.option(fc.double({ min: -30, max: 30, noNaN: true }), { nil: null }), { minLength: 12, maxLength: 12 }), { minLength: 1, maxLength: 15 }), fc.integer({ min: 1, max: 6 }), (rows, minYears) => {
        const years = rows.map((months, i) => ({ year: 2000 + i, months }));
        const a = seasonalityStats(years, minYears);
        const b = monthGridStats(years, minYears);
        a.forEach((s, m) => {
          expect(s.years).toBe(b[m]!.years);
          expect(s.positive).toBe(b[m]!.positive);
          expect(s.hitRate).toEqual(b[m]!.positivePct);
          expect(s.mean === null).toBe(b[m]!.average === null);
          expect(s.mean ?? 0).toBeCloseTo(b[m]!.average ?? 0, 9);
          expect(s.min ?? 0).toBeLessThanOrEqual(s.max ?? 0);
        });
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('SeasonalityChart', () => {
  it('uses the BS month names from the library calendar and lists twelve months', () => {
    const { container } = render(<SeasonalityChart label="NEPSE by BS month" years={YEARS} calendar="bs" testId="s" />);
    const rows = cells(container);
    expect(rows).toHaveLength(12);
    expect(rows[0]![0]).toBe('Baisakh');
    expect(rows[11]![0]).toBe('Chaitra');
    expect(container.querySelector('figure')?.getAttribute('data-calendar')).toBe('bs');
    expect([...container.querySelectorAll('.pu-sea-month')].map((t) => t.textContent).slice(0, 3)).toEqual(['Bai', 'Jes', 'Ash']);
  });

  it('uses AD month names by default and Devanagari names with language ne', () => {
    const ad = render(<SeasonalityChart label="By month" years={YEARS} />);
    expect(cells(ad.container)[0]![0]).toBe('January');
    ad.unmount();
    const ne = render(<SeasonalityChart label="By month" years={YEARS} calendar="bs" language="ne" />);
    expect(cells(ne.container)[0]![0]).toBe('वैशाख');
  });

  it('prints average, lowest and highest with their years, and the hit rate with its sample', () => {
    const { container } = render(<SeasonalityChart label="By month" years={YEARS} />);
    const stats = seasonalityStats(YEARS, 3)[0]!;
    const r = cells(container)[0]!;
    expect(r[1]).toMatch(/^[+−]?\d+\.\d%$/);
    expect(r[2]).toContain(`(${stats.minYear})`);
    expect(r[3]).toContain(`(${stats.maxYear})`);
    expect(r[4]).toBe(`${Math.round(stats.hitRate!)}% (${stats.positive} of ${stats.years})`);
    expect(r[5]).toBe('5');
  });

  it('puts a rise above the zero baseline and a fall below, with the sign in the table', () => {
    const { container } = render(<SeasonalityChart label="By month" years={[{ year: 1, months: [4, -3] }, { year: 2, months: [6, -1] }, { year: 3, months: [5, -2] }]} minYears={3} testId="s" />);
    const zero = Number(container.querySelector('.pu-sea-base')!.getAttribute('y1'));
    const up = container.querySelector('[data-testid="s-month-1"] .pu-sea-bar')!;
    const down = container.querySelector('[data-testid="s-month-2"] .pu-sea-bar')!;
    expect(up.getAttribute('class')).toContain('gain');
    expect(Number(up.getAttribute('y')) + Number(up.getAttribute('height'))).toBeCloseTo(zero, 6);
    expect(down.getAttribute('class')).toContain('loss');
    expect(Number(down.getAttribute('y'))).toBeCloseTo(zero, 6);
    expect(cells(container)[0]![1]).toBe('+5.0%');
    expect(cells(container)[1]![1]).toBe('−2.0%');
  });

  it('says a month needs more years instead of drawing a bar from a thin sample', () => {
    const { container } = render(<SeasonalityChart label="By month" years={YEARS.slice(0, 2)} minYears={5} testId="s" />);
    expect(container.querySelectorAll('.pu-sea-bar')).toHaveLength(2);
    expect(cells(container)[0]![1]).toBe('Needs 5 years');
    expect(sr(container)).toContain('No month has 5 years yet.');
  });

  it('names the strongest and weakest month in the summary', () => {
    const { container } = render(<SeasonalityChart label="By month" years={YEARS} />);
    const ms = seasonalityStats(YEARS, 3).filter((s) => s.mean !== null);
    const best = ms.reduce((a, s) => (s.mean! > a.mean! ? s : a));
    expect(sr(container)).toContain(`Strongest ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][best.month - 1]}`);
    expect(sr(container)).toContain('over 5 years, 2076 to 2080');
  });

  it('moves a keyboard cursor across the twelve months and speaks the words', async () => {
    const user = userEvent.setup();
    const { container } = render(<SeasonalityChart label="By month" years={YEARS} calendar="bs" />);
    await user.tab();
    expect(live(container)).toMatch(/^Chaitra: average [+−]?\d+\.\d%, lowest .* \(20\d\d\), highest .* \(20\d\d\), rose \d of \d$/);
    await user.keyboard('{Home}');
    expect(live(container)).toMatch(/^Baisakh:/);
    await user.keyboard('{ArrowRight}');
    expect(live(container)).toMatch(/^Jestha:/);
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
  });

  it('formats years through formatYear and shows a message with no data', () => {
    const { container } = render(<SeasonalityChart label="By month" years={YEARS} formatYear={(y) => `BS ${y}`} />);
    expect(cells(container)[0]![2]).toContain('(BS 20');
    expect(render(<SeasonalityChart label="None" years={[]} />).container.textContent).toBe('No data');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<SeasonalityChart label="By month" years={YEARS} calendar="bs" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
