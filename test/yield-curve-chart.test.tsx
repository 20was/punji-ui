import { cleanup, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { curveGrid, curveSlopes, parseMaturity, spreadBp, YieldCurveChart, type YieldCurve } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const norm = (t: string | null | undefined) => (t ?? '').replaceAll(' ', ' ');
const live = (c: HTMLElement) => norm(c.querySelector('[role="status"]')!.textContent);
const sr = (c: HTMLElement) => norm([...c.querySelectorAll('.kit-sr')].map((e) => e.textContent).join(' | '));
const cells = (c: HTMLElement) => [...c.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((x) => norm(x.textContent)));

const mk = (key: string, label: string, v: (number | null)[], tenors = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '30Y']): YieldCurve => ({ key, label, points: tenors.map((maturity, i) => ({ maturity, value: v[i] })) });
// Inverted from 3M to 2Y, then normal.
const TODAY = mk('now', 'Today', [5.4, 5.5, 5.3, 4.9, 4.4, 4.2, 4.3, 4.5]);
const MONTH = mk('m', '1 month ago', [5.3, 5.35, 5.2, 4.95, 4.55, 4.3, 4.4, 4.6]);
const YEAR = mk('y', '1 year ago', [4.5, 4.7, 4.9, 4.9, 4.8, 4.5, 4.4, 4.5]);

describe('parseMaturity', () => {
  it('reads D, W, M and Y tenors as years, and numbers as years', () => {
    expect(parseMaturity('1M')).toBeCloseTo(1 / 12, 12);
    expect(parseMaturity('30y')).toBe(30);
    expect(parseMaturity(' 52W ')).toBe(1);
    expect(parseMaturity('90D')).toBeCloseTo(90 / 365, 12);
    expect(parseMaturity('0.5Y')).toBe(0.5);
    expect(parseMaturity(2)).toBe(2);
  });

  it('is null for zero, negatives and anything else', () => {
    for (const bad of ['', '0Y', 'Dec 26', '10', '-1Y', 'Y', Number.NaN, 0, -2]) expect(parseMaturity(bad as string | number)).toBeNull();
  });
});

describe('curveSlopes and spreadBp', () => {
  it('lists adjacent falling segments, not equal ones, and a gap breaks the chain', () => {
    expect(curveSlopes([5, 4, 4, 3])).toEqual([{ from: 0, to: 1, change: -1 }, { from: 2, to: 3, change: -1 }]);
    expect(curveSlopes([5, null, 3])).toEqual([]);
    expect(curveSlopes([1, 2, 3])).toEqual([]);
  });

  it('works out a spread in basis points, to a tenth', () => {
    const g = curveGrid([TODAY]);
    expect(spreadBp(g, 0, '2Y', '10Y')).toBe(-10);
    expect(spreadBp(g, 0, '3M', '10Y')).toBe(-120);
    expect(spreadBp(g, 0, '2Y', '99Y')).toBeNull();
  });
});

describe('curveGrid', () => {
  it('sorts parseable maturities by length and keeps a missing one as a gap', () => {
    const g = curveGrid([mk('a', 'A', [1, 2], ['10Y', '1M']), mk('b', 'B', [3], ['2Y'])]);
    expect(g.names).toEqual(['1M', '2Y', '10Y']);
    expect(g.values).toEqual([[2, null, 1], [null, 3, null]]);
  });

  it('keeps first-seen order when a maturity does not parse', () => {
    const g = curveGrid([mk('a', 'A', [70, 71, 69], ['Dec 26', 'Mar 27', 'Jun 27'])]);
    expect(g.names).toEqual(['Dec 26', 'Mar 27', 'Jun 27']);
  });
});

describe('YieldCurveChart', () => {
  it('names the inversion in words and shades it, with the spread', () => {
    const { container } = render(<YieldCurveChart label="US Treasuries" curves={[TODAY, MONTH, YEAR]} testId="y" />);
    const shape = container.querySelector('[data-testid="y-shape"]')!.textContent!;
    expect(shape).toContain('Inverted between 3M and 5Y');
    expect(container.querySelector('[data-testid="y-spread-0"]')?.textContent).toBe('10Y minus 2Y: −10 bp, inverted');
    expect(container.querySelector('figure')?.getAttribute('data-shape')).toBe('falling');
    expect(container.querySelectorAll('.pu-yc-inv')).toHaveLength(1);
    expect(sr(container)).toContain('Inverted between 3M and 5Y');
  });

  it('reads a normal curve as not inverted', () => {
    const { container } = render(<YieldCurveChart label="Normal" curves={[mk('n', 'Today', [3, 3.2, 3.4, 3.6, 3.8, 4, 4.2, 4.4])]} testId="y" />);
    expect(container.querySelector('[data-testid="y-shape"]')?.textContent).toContain('Normal: the curve does not fall with maturity');
    expect(container.querySelector('.pu-yc-inv')).toBeNull();
    expect(container.querySelector('[data-testid="y-spread-0"]')?.textContent).toBe('10Y minus 2Y: +40 bp, normal');
    expect(container.querySelector('figure')?.getAttribute('data-shape')).toBe('rising');
  });

  it('calls a spread inside the flat band flat', () => {
    const { container } = render(<YieldCurveChart label="Flat" curves={[mk('f', 'Today', [4, 4, 4, 4, 4.0, 4.01, 4.03, 4.05])]} testId="y" />);
    expect(container.querySelector('[data-testid="y-spread-0"]')?.textContent).toBe('10Y minus 2Y: +3 bp, flat');
  });

  it('has a table of maturity by curve with two-decimal yields and a true minus', () => {
    const { container } = render(<YieldCurveChart label="US Treasuries" curves={[TODAY, MONTH]} />);
    expect([...container.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(['Maturity', 'Today', '1 month ago']);
    expect(cells(container)[0]).toEqual(['1M', '5.40%', '5.30%']);
    expect(cells(container)).toHaveLength(8);
  });

  it('draws comparison curves with their own dash and marker, not only colour', () => {
    const { container } = render(<YieldCurveChart label="US Treasuries" curves={[TODAY, MONTH, YEAR]} />);
    expect(container.querySelectorAll('path.pu-yc-line')).toHaveLength(3);
    const tags = [0, 1, 2].map((i) => container.querySelector(`.pu-yc-pt.s${i}`)!.tagName);
    expect(new Set(tags).size).toBe(3);
    expect(container.querySelector('.pu-yc-legend')?.textContent).toContain('1 year ago');
  });

  it('moves a keyboard cursor across the maturities', async () => {
    const user = userEvent.setup();
    const { container } = render(<YieldCurveChart label="US Treasuries" curves={[TODAY, MONTH]} />);
    await user.tab();
    expect(live(container)).toBe('30Y: Today 4.50%, 1 month ago 4.60%');
    await user.keyboard('{Home}');
    expect(live(container)).toBe('1M: Today 5.40%, 1 month ago 5.30%');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(live(container)).toBe('6M: Today 5.30%, 1 month ago 5.20%');
  });

  it('term-structure mode says backwardation and contango, with no percent sign and no spreads', () => {
    const tenors = ['Dec 26', 'Mar 27', 'Jun 27', 'Sep 27'];
    const back = render(<YieldCurveChart label="Crude" mode="term-structure" curves={[mk('c', 'Today', [78.5, 77.2, 76.9, 77.4], tenors)]} testId="t" />);
    expect(back.container.querySelector('[data-testid="t-shape"]')?.textContent).toContain('Backwardation between Dec 26 and Jun 27');
    expect(cells(back.container)[0]).toEqual(['Dec 26', '78.50']);
    expect(back.container.querySelector('.pu-yc-spreads')).toBeNull();
    expect([...back.container.querySelectorAll('thead th')][0]!.textContent).toBe('Contract');
    back.unmount();
    const up = render(<YieldCurveChart label="Gold" mode="term-structure" curves={[mk('g', 'Today', [2000, 2010, 2025, 2040], tenors)]} testId="t" />);
    expect(up.container.querySelector('[data-testid="t-shape"]')?.textContent).toContain('Contango: the curve does not fall');
  });

  it('spaces maturities by length in time scale, and falls back to equal spacing when one does not parse', () => {
    const t = render(<YieldCurveChart label="T" curves={[TODAY]} scale="time" testId="y" />);
    const xs = [...t.container.querySelectorAll('[data-testid="y-curve-now"] circle')].map((c) => Number(c.getAttribute('cx')));
    const gaps = xs.slice(1).map((x, i) => x - xs[i]!);
    expect(gaps[0]).toBeLessThan(gaps[gaps.length - 1]!);
    t.unmount();
    const bad = render(<YieldCurveChart label="T" scale="time" curves={[mk('c', 'Today', [1, 2, 3], ['A', 'B', 'C'])]} testId="y" />);
    const bx = [...bad.container.querySelectorAll('[data-testid="y-curve-c"] circle')].map((c) => Number(c.getAttribute('cx')));
    expect(bx[1]! - bx[0]!).toBeCloseTo(bx[2]! - bx[1]!, 6);
  });

  it('shows a message with no data and has no serious axe violations', async () => {
    expect(render(<YieldCurveChart label="None" curves={[]} />).container.textContent).toBe('No data');
    const { container } = render(<YieldCurveChart label="US Treasuries" curves={[TODAY, MONTH, YEAR]} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
