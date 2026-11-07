import { cleanup, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import * as fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';

import { drawdownOf, RollingReturnsChart, rollingDrawdown, rollingReading, rollingReturns } from '../src/index.ts';
import { NUM_RUNS } from './fc.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const norm = (t: string | null | undefined) => (t ?? '').replaceAll(' ', ' ');
const live = (c: HTMLElement) => norm(c.querySelector('[role="status"]')!.textContent);
const sr = (c: HTMLElement) => norm([...c.querySelectorAll('.kit-sr')].map((e) => e.textContent).join(' | '));
const cells = (c: HTMLElement) => [...c.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((x) => norm(x.textContent)));

const dates = Array.from({ length: 8 }, (_, i) => `2025-0${i + 1}-28`);
const fund = [100, 110, 121, 99, 108.9, 120, 90, 135];
const bench = [100, 102, 104, 103, 106, 108, 107, 110];

describe('rollingReturns', () => {
  it('is value over the value N periods earlier, minus one, in percent', () => {
    const r = rollingReturns([100, 110, 121, 133.1], 2);
    expect(r[0]).toBeNull();
    expect(r[1]).toBeNull();
    expect(r[2]!).toBeCloseTo(21, 10);
    expect(r[3]!).toBeCloseTo(21, 10);
  });

  it('annualises with periodsPerYear', () => {
    const r = rollingReturns([100, 100, 121], 2, 1);
    expect(r[2]!).toBeCloseTo(10, 9);
    expect(rollingReturns([100, 121], 1, 12)[1]!).toBeCloseTo((1.21 ** 12 - 1) * 100, 6);
  });

  it('leaves a gap for missing values and for a base that is not above zero', () => {
    expect(rollingReturns([100, null, 120, 130], 1)).toEqual([null, null, null, (130 / 120 - 1) * 100]);
    expect(rollingReturns([0, 5], 1)).toEqual([null, null]);
    expect(rollingReturns([-5, 5], 1)).toEqual([null, null]);
    expect(rollingReturns([10, Number.NaN, 12], 1)).toEqual([null, null, null]);
  });

  it('treats a window below 1 or fractional as a whole number of at least 1, and a bad one as 1', () => {
    expect(rollingReturns([100, 110], 0)).toEqual(rollingReturns([100, 110], 1));
    expect(rollingReturns([100, 110, 121], 1.9)).toEqual(rollingReturns([100, 110, 121], 1));
    expect(rollingReturns([100, 110], Number.NaN)).toEqual(rollingReturns([100, 110], 1));
  });

  it('property: every figure is above -100 and equals the ratio formula', () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: 1, max: 1e6, noNaN: true }), { minLength: 2, maxLength: 40 }), fc.integer({ min: 1, max: 10 }), (xs, w) => {
        const r = rollingReturns(xs, w);
        expect(r.slice(0, w).every((v) => v === null)).toBe(true);
        r.slice(w).forEach((v, k) => {
          expect(v!).toBeGreaterThan(-100);
          expect(v!).toBeCloseTo((xs[k + w]! / xs[k]! - 1) * 100, 6);
        });
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('rollingDrawdown', () => {
  it('is the fall from the highest value in the trailing window', () => {
    const d = rollingDrawdown([100, 120, 90, 80, 110], 2);
    expect(d[0]).toBe(0);
    expect(d[1]).toBe(0);
    expect(d[2]!).toBeCloseTo((90 / 120 - 1) * 100, 10);
    expect(d[3]!).toBeCloseTo((80 / 120 - 1) * 100, 10);
    // 120 left the window of the previous 2 values.
    expect(d[4]!).toBe(0);
  });

  it('matches drawdownOf when the window covers everything, and is never positive', () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: 1, max: 1e5, noNaN: true }), { minLength: 1, maxLength: 30 }), (xs) => {
        const full = rollingDrawdown(xs, xs.length);
        const run = drawdownOf(xs);
        full.forEach((v, i) => {
          expect(v!).toBeLessThanOrEqual(0);
          expect(v!).toBeCloseTo(run[i]!, 9);
        });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('skips a missing value inside the window and gives null for a missing current value', () => {
    const d = rollingDrawdown([100, null, 90], 3);
    expect(d[0]).toBe(0);
    expect(d[1]).toBeNull();
    expect(d[2]!).toBeCloseTo(-10, 9);
  });
});

describe('RollingReturnsChart', () => {
  it('prints and speaks the latest, best and worst window with dates and a zero baseline', () => {
    const { container } = render(<RollingReturnsChart label="Fund" dates={dates} series={[{ key: 'f', label: 'Fund', values: fund }]} window={2} testId="r" />);
    expect(container.querySelector('.pu-rr-base')).not.toBeNull();
    expect(container.querySelector('[data-testid="r-latest"]')?.textContent).toContain('+12.5%');
    expect(container.querySelector('[data-testid="r-best"]')?.textContent).toContain('2025-06-28');
    expect(container.querySelector('[data-testid="r-worst"]')?.textContent).toContain('−17.4%');
    expect(sr(container)).toContain('Fund: rolling return over 2 periods, from 2025-03-28 to 2025-08-28.');
    expect(container.querySelector('.pu-rr-stats')?.textContent).toMatch(/Above zero\s*\d+%\s*\d+ of \d+/);
  });

  it('has a table row per date with a figure, signed, and "No figure yet" is never zero', () => {
    const { container } = render(<RollingReturnsChart label="Fund" dates={dates} series={[{ key: 'f', label: 'Fund', values: fund }, { key: 'b', label: 'Benchmark', values: bench.map((v, i) => (i === 3 ? null : v)) }]} window={2} />);
    const rows = cells(container);
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual(['2025-03-28', '+21.0%', '+4.0%']);
    expect(rows.flat().some((c) => c === '0.0%')).toBe(false);
    expect(rows.find((r) => r[0] === '2025-04-28')![2]).toBe('No figure yet');
    expect(container.querySelectorAll('.pu-rr-line')).toHaveLength(2);
  });

  it('moves a keyboard cursor over the dates that have a figure', async () => {
    const user = userEvent.setup();
    const { container } = render(<RollingReturnsChart label="Fund" dates={dates} series={[{ key: 'f', label: 'Fund', values: fund }]} window={2} />);
    await user.tab();
    expect(live(container)).toBe('2025-08-28: +12.5%');
    await user.keyboard('{Home}');
    expect(live(container)).toBe('2025-03-28: +21.0%');
    await user.keyboard('{End}{ArrowLeft}');
    expect(live(container)).toBe('2025-07-28: −17.4%');
  });

  it('draws the rolling drawdown as a non-positive line', () => {
    const { container } = render(<RollingReturnsChart label="Fund" dates={dates} series={[{ key: 'f', label: 'Fund', values: fund }]} window={3} metric="drawdown" />);
    expect(cells(container).every((r) => r[1] === '0.0%' || r[1]!.startsWith('−'))).toBe(true);
    expect(sr(container)).toContain('rolling drawdown over 3 periods');
    expect(container.querySelector('.pu-rr-stats')?.textContent).not.toContain('Above zero');
  });

  it('reads the first series for the footer and counts windows above zero', () => {
    const r = rollingReading([{ key: 'f', label: 'F', values: fund }], dates.length, 2, 'return');
    expect(r.windows).toBe(6);
    expect(r.positive).toBe(3);
    expect(r.best?.index).toBe(5);
    expect(r.worst?.index).toBe(6);
  });

  it('says what is missing when there is not enough history, and ignores bad windows', () => {
    const { container } = render(<RollingReturnsChart label="Fund" dates={dates.slice(0, 3)} series={[{ key: 'f', label: 'Fund', values: [100, 101, 102] }]} window={12} />);
    expect(container.textContent).toContain('Not enough history: a 12-period window needs at least 13 dates');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<RollingReturnsChart label="Fund" dates={dates} series={[{ key: 'f', label: 'Fund', values: fund }, { key: 'b', label: 'Benchmark', values: bench }]} window={2} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
