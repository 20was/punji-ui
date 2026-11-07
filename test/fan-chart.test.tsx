import { cleanup, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { FanChart, fanLevels, goalPosition, money, type FanStep } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const norm = (t: string | null | undefined) => (t ?? '').replaceAll(' ', ' ').replaceAll(' ', ' ');
const live = (c: HTMLElement) => norm(c.querySelector('[role="status"]')!.textContent);
const sr = (c: HTMLElement) => norm([...c.querySelectorAll('.kit-sr')].map((e) => e.textContent).join(' | '));
const cells = (c: HTMLElement) => [...c.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((x) => norm(x.textContent)));

const STEPS: FanStep[] = [
  { x: '2027', values: ['95000.10', '98000', '101000', '104000', '108000.30'] },
  { x: '2032', values: ['90000', '110000', '135000.50', '165000', '210000'] },
  { x: '2037', values: ['82000', '125000', '180000', '260000', '390000.05'] },
];

describe('FanChart', () => {
  it('prints exact decimals in the table, the end labels and the spoken summary', () => {
    const { container } = render(<FanChart locale="en-US" label="Retirement pot" start={{ x: 'Today', value: '100000' }} steps={STEPS} testId="f" />);
    expect(cells(container)[0]).toEqual(['Today', 'NPR 100,000.00', 'NPR 100,000.00', 'NPR 100,000.00', 'NPR 100,000.00', 'NPR 100,000.00']);
    expect(cells(container)[3]).toEqual(['2037', 'NPR 82,000.00', 'NPR 125,000.00', 'NPR 180,000.00', 'NPR 260,000.00', 'NPR 390,000.05']);
    expect([...container.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(['Step', '5th', '25th', 'Median', '75th', '95th']);
    expect(container.querySelector('[data-testid="f-level-95"]')?.textContent).toContain('390,000.05');
    expect(sr(container)).toContain('At 2037 the median is NPR 180,000.00; the 5th percentile is NPR 82,000.00 and the 95th percentile is NPR 390,000.05.');
  });

  it('groups lakhs by default (en-IN)', () => {
    const { container } = render(<FanChart label="Pot" start={{ x: 'Today', value: '100000' }} steps={STEPS} />);
    expect(cells(container)[0]![1]).toBe('NPR 1,00,000.00');
  });

  it('works in exact Money bigint with no float rounding', () => {
    const big = [money(10n, 'USD'), money(20n, 'USD'), money(30n, 'USD'), money(40n, 'USD'), money(9_007_199_254_740_993n, 'USD')];
    const { container } = render(<FanChart locale="en-US" label="Big" start={{ x: 'Now', value: money(10n, 'USD') }} steps={[{ x: 'Y1', values: big }]} />);
    expect(cells(container)[1]![5]).toBe('USD 90,071,992,547,409.93');
  });

  it('draws two nested bands, a solid median and dashed outer edges', () => {
    const { container } = render(<FanChart locale="en-US" label="Pot" start={{ x: 'Today', value: '100000' }} steps={STEPS} />);
    expect(container.querySelectorAll('polygon.pu-fan-band')).toHaveLength(2);
    expect(container.querySelectorAll('.pu-fan-line.median')).toHaveLength(1);
    expect(container.querySelectorAll('.pu-fan-line.edge')).toHaveLength(2);
  });

  it('moves a keyboard cursor through the start and every step and speaks each', async () => {
    const user = userEvent.setup();
    const { container } = render(<FanChart locale="en-US" label="Pot" start={{ x: 'Today', value: '100000' }} steps={STEPS} />);
    expect(live(container)).toBe('');
    await user.tab();
    expect(live(container)).toContain('2037: 5th NPR 82,000.00, 25th NPR 125,000.00, Median NPR 180,000.00');
    await user.keyboard('{Home}');
    expect(live(container)).toContain('Today: 5th NPR 100,000.00');
    await user.keyboard('{ArrowRight}');
    expect(live(container)).toContain('2027:');
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
  });

  it('places a goal among the percentiles exactly', () => {
    const u = [82000n, 125000n, 180000n, 260000n, 390000n];
    expect(goalPosition(u, 50000n)).toEqual({ where: 'below', low: 0, high: 0 });
    expect(goalPosition(u, 500000n)).toEqual({ where: 'above', low: 4, high: 4 });
    expect(goalPosition(u, 180000n)).toEqual({ where: 'at', low: 2, high: 2 });
    expect(goalPosition(u, 200000n)).toEqual({ where: 'between', low: 2, high: 3 });
    const { container } = render(<FanChart locale="en-US" label="Pot" start={{ x: 'Today', value: '100000' }} steps={STEPS} goal="200000" />);
    expect(sr(container)).toContain('NPR 200,000.00 is between the 50th and 75th percentiles');
    expect(container.querySelector('.pu-fan-goal')).not.toBeNull();
  });

  it('keeps the end labels apart when the percentiles are close', () => {
    const close: FanStep[] = [{ x: 'Y1', values: ['100.00', '100.10', '100.20', '100.30', '100.40'] }];
    const { container } = render(<FanChart locale="en-US" label="Tight" start={{ x: 'Now', value: '100' }} steps={close} />);
    const ys = [...container.querySelectorAll('text.pu-fan-tl')].map((t) => Number(t.getAttribute('y'))).toSorted((a, b) => a - b);
    expect(ys).toHaveLength(5);
    for (let i = 1; i < ys.length; i += 1) expect(ys[i]! - ys[i - 1]!).toBeGreaterThanOrEqual(15 - 1e-9);
  });

  it('skips steps with the wrong count or an unparsable value, and shows a message with nothing left', () => {
    const { container } = render(<FanChart locale="en-US" label="Pot" start={{ x: 'Today', value: '100' }} steps={[{ x: 'a', values: ['1', '2'] }, { x: 'b', values: ['1', '2', '3', '4', 'x'] }, ...STEPS]} />);
    expect(cells(container)).toHaveLength(4);
    const empty = render(<FanChart locale="en-US" label="None" start={{ x: 'Today', value: '100' }} steps={[]} />);
    expect(empty.container.textContent).toBe('No data');
  });

  it('accepts custom levels and falls back to the default when they are not ascending', () => {
    expect(fanLevels([10, 50, 90])).toEqual([10, 50, 90]);
    expect(fanLevels([90, 10])).toEqual([5, 25, 50, 75, 95]);
    expect(fanLevels([0, 50])).toEqual([5, 25, 50, 75, 95]);
    const { container } = render(<FanChart locale="en-US" label="P" levels={[10, 50, 90]} start={{ x: 'Now', value: '10' }} steps={[{ x: 'Y1', values: ['8', '11', '15'] }]} />);
    expect([...container.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(['Step', '10th', 'Median', '90th']);
    expect(container.querySelectorAll('polygon.pu-fan-band')).toHaveLength(1);
  });

  it('is not a tab stop when not interactive, and has no serious axe violations', async () => {
    const off = render(<FanChart locale="en-US" label="Pot" start={{ x: 'Today', value: '100000' }} steps={STEPS} interactive={false} />);
    expect(off.container.querySelector('[tabindex]')).toBeNull();
    off.unmount();
    const { container } = render(<FanChart locale="en-US" label="Pot" start={{ x: 'Today', value: '100000' }} steps={STEPS} goal="200000" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
