import { cleanup, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { labelClusters, quadrantOf, returnPerRisk, RiskReturnScatter, spreadLabels, type RiskReturnPoint } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const norm = (t: string | null | undefined) => (t ?? '').replaceAll(' ', ' ');
const live = (c: HTMLElement) => norm(c.querySelector('[role="status"]')!.textContent);
const sr = (c: HTMLElement) => norm([...c.querySelectorAll('.kit-sr')].map((e) => e.textContent).join(' | '));
const cells = (c: HTMLElement) => [...c.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((x) => norm(x.textContent)));

const POINTS: RiskReturnPoint[] = [
  { key: 'eq', label: 'Equity fund', riskPct: 18.2, returnPct: 12.4, group: 'Equity' },
  { key: 'bd', label: 'Bond fund', riskPct: 4.1, returnPct: 5.6, group: 'Bond' },
  { key: 'mm', label: 'Money market', riskPct: 0.6, returnPct: 3.1, group: 'Cash' },
  { key: 'bal', label: 'Balanced fund', riskPct: 9.8, returnPct: 8.0, group: 'Mixed' },
  { key: 'sm', label: 'Small-cap fund', riskPct: 24.5, returnPct: 9.9, group: 'Equity' },
];

describe('quadrantOf and returnPerRisk', () => {
  it('puts a point in exactly one corner, on a guide counting as higher return and lower risk', () => {
    expect(quadrantOf(5, 10, 8, 6)).toBe('topLeft');
    expect(quadrantOf(12, 10, 8, 6)).toBe('topRight');
    expect(quadrantOf(5, 2, 8, 6)).toBe('bottomLeft');
    expect(quadrantOf(12, 2, 8, 6)).toBe('bottomRight');
    expect(quadrantOf(8, 6, 8, 6)).toBe('topLeft');
  });

  it('gives no ratio at zero risk', () => {
    expect(returnPerRisk(0, 5)).toBeNull();
    expect(returnPerRisk(4, 2)).toBe(0.5);
  });
});

describe('labelClusters', () => {
  it('groups labels whose horizontal ranges overlap, through a chain', () => {
    expect(labelClusters([[0, 10], [8, 20], [19, 30], [50, 60]])).toEqual([[0, 1, 2], [3]]);
    expect(labelClusters([[50, 60], [0, 10]])).toEqual([[0], [1]].toSorted((a, b) => a[0]! - b[0]!));
    expect(labelClusters([[0, 10], [12, 20]], 3)).toEqual([[0, 1]]);
    expect(labelClusters([])).toEqual([]);
  });
});

describe('RiskReturnScatter', () => {
  it('prints every point in the table with risk, return, ratio and its corner', () => {
    const { container } = render(<RiskReturnScatter label="Funds" points={POINTS} />);
    expect([...container.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(['Name', 'Risk', 'Return', 'Return per unit of risk', 'Position']);
    const rows = cells(container);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual(['Money market', '0.6%', '+3.1%', '5.17', 'Lower return, lower risk']);
    expect(rows.find((r) => r[0] === 'Equity fund')).toEqual(['Equity fund', '18.2%', '+12.4%', '0.68', 'Higher return, higher risk']);
  });

  it('labels every point and keeps overlapping labels apart', () => {
    const crowded: RiskReturnPoint[] = Array.from({ length: 6 }, (_, i) => ({ key: `p${i}`, label: `Fund number ${i}`, riskPct: 10 + i * 0.05, returnPct: 8 + i * 0.02 }));
    const { container } = render(<RiskReturnScatter label="Crowded" points={crowded} testId="s" />);
    const ys = [...container.querySelectorAll('text.pu-rrs-name')].map((t) => Number(t.getAttribute('y'))).toSorted((a, b) => a - b);
    expect(ys).toHaveLength(6);
    for (let i = 1; i < ys.length; i += 1) expect(ys[i]! - ys[i - 1]!).toBeGreaterThanOrEqual(14 - 1e-9);
    expect(spreadLabels([10, 11, 12], 14, 0, 100)).toEqual([10, 24, 38]);
    expect(container.querySelectorAll('.pu-rrs-lead').length).toBeGreaterThan(0);
  });

  it('uses the benchmark for the guides, draws it as a diamond and a frontier as a dashed path', () => {
    const { container } = render(
      <RiskReturnScatter label="Funds" points={POINTS} benchmark={{ label: 'NEPSE', riskPct: 12, returnPct: 7 }} frontier={[{ riskPct: 1, returnPct: 3 }, { riskPct: 10, returnPct: 9 }, { riskPct: 20, returnPct: 11 }]} testId="s" />,
    );
    expect(container.querySelector('[data-testid="s-benchmark"] polygon')).not.toBeNull();
    expect(container.querySelector('.pu-rrs-frontier')?.getAttribute('d')).toMatch(/^M[\d.]+,[\d.]+L/);
    expect(sr(container)).toContain('Guides at risk 12.0% and return 7.0% (the benchmark).');
    expect(cells(container).find((r) => r[0] === 'Balanced fund')![4]).toBe('Higher return, lower risk');
    expect(container.querySelector('.pu-rrs-legend')?.textContent).toContain('Efficient frontier');
  });

  it('uses different marker shapes for groups', () => {
    const { container } = render(<RiskReturnScatter label="Funds" points={POINTS} testId="s" />);
    const shape = (k: string) => container.querySelector(`[data-testid="s-${k}"]`)!.firstElementChild!.tagName === 'text' ? '' : [...container.querySelector(`[data-testid="s-${k}"]`)!.children].find((e) => e.classList.contains('pu-rrs-pt'))!.tagName;
    expect(new Set(['eq', 'bd', 'mm', 'bal'].map(shape)).size).toBeGreaterThan(1);
    expect(shape('eq')).toBe(shape('sm'));
  });

  it('moves a keyboard cursor across the points in order of risk and speaks each', async () => {
    const user = userEvent.setup();
    const { container } = render(<RiskReturnScatter label="Funds" points={POINTS} />);
    await user.tab();
    expect(live(container)).toBe('Small-cap fund: return 9.9%, risk 24.5%, Higher return, higher risk');
    await user.keyboard('{Home}');
    expect(live(container)).toBe('Money market: return 3.1%, risk 0.6%, Lower return, lower risk');
    await user.keyboard('{ArrowRight}');
    expect(live(container)).toContain('Bond fund');
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
  });

  it('summarises the highest return, lowest risk and best return per unit of risk', () => {
    const { container } = render(<RiskReturnScatter label="Funds" points={POINTS} />);
    expect(sr(container)).toContain('5 points. Highest return Equity fund at +12.4%; lowest risk Money market at 0.6%. Best return per unit of risk Money market at 5.17.');
  });

  it('skips points that are not finite or have negative risk, and shows a message with none left', () => {
    const { container } = render(<RiskReturnScatter label="Funds" points={[...POINTS, { key: 'x', label: 'Bad', riskPct: Number.NaN, returnPct: 1 }, { key: 'y', label: 'Neg', riskPct: -3, returnPct: 1 }]} />);
    expect(cells(container)).toHaveLength(5);
    expect(render(<RiskReturnScatter label="None" points={[]} />).container.textContent).toBe('No data');
  });

  it('can hide the guides, and has no serious axe violations', async () => {
    const off = render(<RiskReturnScatter label="Funds" points={POINTS} guides={false} />);
    expect(off.container.querySelector('.pu-rrs-guide')).toBeNull();
    expect([...off.container.querySelectorAll('thead th')]).toHaveLength(4);
    off.unmount();
    const { container } = render(<RiskReturnScatter label="Funds" points={POINTS} benchmark={{ label: 'Index', riskPct: 12, returnPct: 7 }} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
