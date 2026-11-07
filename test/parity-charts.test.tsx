import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CorrelationMatrix,
  drawdownOf,
  Histogram,
  heatCell,
  MonthGrid,
  monthGridStats,
  monthNames,
  PerformanceChart,
  ReturnsHeatTable,
  spreadLabels,
  type HeatColumn,
  type HeatRow,
  type MonthGridData,
} from '../src/index.ts';
import { performanceDates, performanceSeries } from '../fixtures/market-data.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const live = (c: HTMLElement) => c.querySelector('[role="status"]')!.textContent;
const plot = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="group"][tabindex="0"]')!;

describe('PerformanceChart extensions', () => {
  const dates = ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05'];
  const value = [100, 120, 90, 110, 130];
  const base = { dates, label: 'Plan', series: [{ key: 'p', label: 'Plan', values: value }] };

  it('draws nothing extra by default', () => {
    const { container } = render(<PerformanceChart {...base} testId="c" />);
    expect(container.querySelector('.pu-ct-ref, .pu-ct-dd, .pu-ct-end')).toBeNull();
    expect(container.querySelectorAll('thead th')).toHaveLength(2);
  });

  it('draws a dashed, labelled reference line and pins a far one to the edge', () => {
    const { container, rerender } = render(<PerformanceChart {...base} normalize={false} reference={{ value: 125, label: 'Target' }} testId="c" />);
    const ref = container.querySelector('[data-testid="c-reference"]')!;
    expect(ref.querySelector('text')!.textContent).toBe('Target 125.00');
    expect(ref.getAttribute('data-pin')).toBeNull();
    expect(container.querySelector('.kit-ct-sr, figure')!.textContent).toContain('Target 125.00');
    rerender(<PerformanceChart {...base} normalize={false} reference={{ value: 5000, label: 'Target', format: (v) => `Rs ${v}` }} testId="c" />);
    const far = container.querySelector('[data-testid="c-reference"]')!;
    expect(far.getAttribute('data-pin')).toBe('1');
    expect(far.querySelector('text')!.textContent).toBe('Target Rs 5000 (above the range)');
  });

  it('converts the reference when the chart is normalised or rebased', () => {
    const { container } = render(<PerformanceChart {...base} reference={{ value: 110, label: 'Goal' }} rebase={100} testId="c" />);
    // 110 against a start of 100 is index 110.0 on the rebased scale; the axis prints indices.
    const ticks = [...container.querySelectorAll('.kit-ct-axis')].map((t) => t.textContent);
    expect(ticks).toContain('100.0');
    expect(container.querySelector('[data-testid="c-reference"]')).not.toBeNull();
  });

  it('computes the drawdown from the running high, adds a band, a table column and a spoken value', async () => {
    expect(drawdownOf([100, 120, 90, null, 130])).toEqual([0, 0, -25, null, 0]);
    expect(drawdownOf([0, -5])).toEqual([null, null]);
    const user = userEvent.setup();
    const { container } = render(<PerformanceChart {...base} drawdown testId="c" />);
    expect(container.querySelector('[data-testid="c-drawdown"]')).not.toBeNull();
    expect([...container.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(['Date', 'Plan', 'Drawdown']);
    const rows = [...container.querySelectorAll('tbody tr')].map((tr) => tr.lastElementChild!.textContent);
    expect(rows).toEqual(['0.00%', '0.00%', '−25.00%', '−8.33%', '0.00%']);
    plot(container).focus();
    await user.keyboard('{Home}{ArrowRight}{ArrowRight}');
    expect(live(container)).toContain('Drawdown −25.00%');
    expect(container.textContent).toContain('Drawdown: worst −25.00%');
  });

  it('draws the money put in as a dotted series with its own toggle, table column and values', () => {
    const { container } = render(<PerformanceChart {...base} normalize={false} contributions={[100, 100, 100, 150, 150]} testId="c" />);
    expect([...container.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(['Date', 'Plan', 'Money put in']);
    expect(screen.getByTestId('c-toggle-__contributions').textContent).toContain('150.00');
    const dotted = container.querySelectorAll('.kit-ct-line')[1]!.querySelector('path')!;
    expect(dotted.getAttribute('stroke-dasharray')).toBe('0.1 5');
    // Against the portfolio's start the put-in line is also in percent when normalised.
    const pct = render(<PerformanceChart {...base} contributions={[100, 100, 100, 150, 150]} />);
    expect(pct.container.querySelectorAll('tbody tr')[3]!.children[2]!.textContent).toBe('+50.00% (150.00)');
  });

  it('prints each visible series\' end value at the right edge, spread so none overlap', () => {
    expect(spreadLabels([100, 102, 103], 14, 10, 200)).toEqual([100, 114, 128]);
    expect(spreadLabels([195, 196, 198], 14, 10, 200)).toEqual([172, 186, 200]);
    expect(spreadLabels([50], 14, 10, 200)).toEqual([50]);
    expect(spreadLabels([], 14, 10, 200)).toEqual([]);
    // The input order is kept even when the positions arrive unsorted.
    expect(spreadLabels([103, 100, 102], 14, 10, 200)).toEqual([128, 100, 114]);
    const { container } = render(
      <PerformanceChart dates={dates} label="Two" endLabels testId="c" series={[{ key: 'a', label: 'A', values: [1, 2, 3, 4, 5] }, { key: 'b', label: 'B', values: [1, 2, 3, 4, 5.05] }]} />,
    );
    const ends = [...container.querySelectorAll('.pu-ct-end text')];
    expect(ends).toHaveLength(2);
    const ys = ends.map((t) => Number(t.getAttribute('y')));
    expect(Math.abs(ys[0]! - ys[1]!)).toBeGreaterThanOrEqual(14);
  });

  it('rebases to 100 for a compare mode, ignoring normalize', () => {
    const { container } = render(<PerformanceChart dates={dates} label="Compare" rebase={100} normalize={false} series={[{ key: 'a', label: 'A', values: [50, 60, 55, 65, 75] }, { key: 'b', label: 'B', values: [200, 210, 190, 220, 240] }]} />);
    const rows = [...container.querySelectorAll('tbody tr')];
    expect(rows[0]!.children[1]!.textContent).toBe('100.0 (50.00)');
    expect(rows[0]!.children[2]!.textContent).toBe('100.0 (200.00)');
    expect(rows[4]!.children[1]!.textContent).toBe('150.0 (75.00)');
    expect(rows[4]!.children[2]!.textContent).toBe('120.0 (240.00)');
  });

  it('has a compact quiet axis: three levels and only the first and last dates', () => {
    const { container } = render(<PerformanceChart {...base} axis="quiet" />);
    expect(container.querySelectorAll('.pu-ct-axis-in')).toHaveLength(3);
    const dateText = [...container.querySelectorAll('text.kit-ct-axis:not(.pu-ct-axis-in)')].map((t) => t.textContent);
    expect(dateText).toEqual(['1 Jan', '5 Jan']);
  });

  it('keeps the keyboard scrub through ChartA11yShell with every layer on, and reports the active date', async () => {
    const user = userEvent.setup();
    const onActive = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(
      <PerformanceChart {...base} normalize={false} reference={{ value: 115, label: 'Target' }} drawdown contributions={[90, 90, 90, 90, 90]} endLabels axis="quiet" onActiveChange={onActive} testId="c" />,
    );
    const p = plot(container);
    expect(p.getAttribute('aria-roledescription')).toBe('line chart');
    act(() => p.focus());
    expect(live(container)).toContain('5 Jan: Plan 130.00, Money put in 90.00, Drawdown 0.00%');
    await user.keyboard('{Home}');
    expect(live(container)).toContain('1 Jan');
    expect(onActive).toHaveBeenLastCalledWith(0);
    await user.keyboard('{ArrowRight}');
    expect(onActive).toHaveBeenLastCalledWith(1);
    await user.keyboard('{Escape}');
    expect(onActive).toHaveBeenLastCalledWith(null);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('is unchanged by the layers it was not given: the default sample renders the same table', () => {
    const { container } = render(<PerformanceChart dates={performanceDates} series={performanceSeries} label="x" />);
    expect(container.querySelectorAll('thead th')).toHaveLength(1 + performanceSeries.length);
    expect(container.querySelector('.pu-ct-axis-in')).toBeNull();
  });
});

const grid: MonthGridData = {
  calendar: 'bs',
  years: [
    { year: 2080, months: [1.2, -3.4, 12.5, null, 0, 0.02, 4, 6, -1, 2, 9, 0.5], yearReturn: 20.1 },
    { year: 2081, months: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, null], yearReturn: null },
  ],
};

describe('MonthGrid', () => {
  it('is a real table with a caption, BS month heads from the Nepal calendar and signed cells', () => {
    const { container } = render(<MonthGrid grid={grid} label="NEPSE by month, BS" testId="mg" />);
    expect(container.querySelector('table caption')!.textContent).toBe('NEPSE by month, BS');
    expect(container.querySelector('[role="region"]')!.getAttribute('aria-label')).toBe('NEPSE by month, BS');
    const heads = [...container.querySelectorAll('thead th')].map((t) => t.getAttribute('abbr') ?? t.textContent);
    expect(heads.slice(1, 13)).toEqual(monthNames('bs').full);
    expect(heads[1]).toBe('Baisakh');
    expect(screen.getByTestId('mg-cell-2080-1').textContent).toBe('+1.2%');
    expect(screen.getByTestId('mg-cell-2080-2').textContent).toBe('−3.4%');
    // Colour is never alone: a flat cell prints 0.0%, an absent month says so in words.
    expect(screen.getByTestId('mg-cell-2080-5').textContent).toBe('0.0%');
    expect(screen.getByTestId('mg-cell-2080-4').textContent).toContain('No data');
    expect(screen.getByTestId('mg-cell-2080-2').getAttribute('data-tone')).toBe('loss');
    expect(screen.getByTestId('mg-cell-2080-3').getAttribute('data-band')).toBe('4');
  });

  it('uses AD month names for the Gregorian calendar and foots with the average only from minYears', () => {
    expect(monthNames('ad').short[0]).toBe('Jan');
    const stats = monthGridStats(grid.years, 2);
    expect(stats[0]).toMatchObject({ month: 1, years: 2, positive: 2, positivePct: 100 });
    expect(stats[0]!.average).toBeCloseTo(1.6);
    expect(stats[3]).toMatchObject({ years: 1, average: null });
    const { container } = render(<MonthGrid grid={{ ...grid, calendar: 'ad' }} label="AD" testId="mg" minYears={2} />);
    expect(container.querySelector('thead th:nth-child(2)')!.textContent).toBe('Jan');
    expect(screen.getByTestId('mg-average').textContent).toContain('+1.6%');
    expect(screen.getByTestId('mg-average').textContent).toContain('Needs 2 years');
    expect(screen.getByTestId('mg-rose').textContent).toContain('2 of 2');
  });

  it('moves the chosen month with the arrow keys and focus follows', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(...args: unknown[]) => void>();
    render(<MonthGrid grid={grid} label="Pick" selected={2} onSelect={onSelect} testId="mg" />);
    await user.click(screen.getByTestId('mg-month-2'));
    expect(onSelect).toHaveBeenLastCalledWith(2);
    screen.getByTestId('mg-month-2').focus();
    await user.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith(3);
    expect(document.activeElement).toBe(screen.getByTestId('mg-month-3'));
    await user.keyboard('{End}');
    expect(onSelect).toHaveBeenLastCalledWith(12);
    expect(screen.getByTestId('mg-month-2').getAttribute('aria-pressed')).toBe('true');
  });

  it('has no serious accessibility violations, with the key and with a pickable head', async () => {
    const { container } = render(<MonthGrid grid={grid} label="NEPSE by month" legend onSelect={() => {}} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('ReturnsHeatTable', () => {
  const columns: HeatColumn[] = [{ key: '1m', label: '1M' }, { key: '1y', label: '1Y' }];
  const rows: HeatRow[] = [
    { id: 'bank', name: 'Banking', sub: '20 companies', cells: [heatCell(4.04), heatCell(-12.3)] },
    { id: 'hydro', name: 'Hydropower', cells: [heatCell(0), heatCell(null)] },
  ];
  const Harness = ({ onSelect }: { onSelect?: (id: string) => void }) => {
    const [sort, setSort] = useState({ key: '1m', dir: 'desc' as 'asc' | 'desc' });
    return (
      <ReturnsHeatTable caption="Sector returns" columns={columns} rows={rows} average={{ id: 'avg', name: 'Average', cells: [heatCell(2), heatCell(-5)] }} headName="Sector" sortKey={sort.key} sortDir={sort.dir} onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))} onSelect={onSelect} selected="bank" testId="rht" />
    );
  };

  it('shares the cell scale and prints every figure with its sign', () => {
    expect(heatCell(4.04)).toEqual({ text: '+4.0%', tone: 'gain', strength: 18 });
    expect(heatCell(-12.3)).toEqual({ text: '−12.3%', tone: 'loss', strength: 36 });
    expect(heatCell(0.01)).toMatchObject({ text: '0.0%', tone: 'flat' });
    expect(heatCell(undefined)).toEqual({ text: null });
    const { container } = render(<Harness />);
    expect(container.querySelector('caption')!.textContent).toBe('Sector returns');
    expect(container.querySelectorAll('tbody tr')[1]!.textContent).toContain('Banking');
    expect(container.querySelectorAll('tbody tr')[1]!.textContent).toContain('+4.0%');
    expect(container.querySelectorAll('tbody tr')[1]!.textContent).toContain('−12.3%');
    expect(container.querySelectorAll('tbody tr')[2]!.textContent).toContain('No data');
  });

  it('sorts from the column heads with aria-sort and a reversing press', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    const heads = () => [...container.querySelectorAll('thead th')].map((t) => t.getAttribute('aria-sort'));
    expect(heads()).toEqual([null, 'descending', 'none']);
    await user.click(screen.getByTestId('rht-sort-1m'));
    expect(heads()).toEqual([null, 'ascending', 'none']);
    await user.click(screen.getByTestId('rht-sort-1y'));
    expect(heads()).toEqual([null, 'none', 'descending']);
  });

  it('selects a subject from its name button (keyboard) and from the row (pointer)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(...args: unknown[]) => void>();
    render(<Harness onSelect={onSelect} />);
    expect(screen.getByTestId('rht-pick-bank').getAttribute('aria-pressed')).toBe('true');
    screen.getByTestId('rht-pick-hydro').focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith('hydro');
    fireEvent.click(screen.getByTestId('rht-row-bank'));
    expect(onSelect).toHaveBeenLastCalledWith('bank');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('has no serious accessibility violations', async () => {
    const { container } = render(<Harness onSelect={() => {}} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('Histogram', () => {
  const counts = [0, 3, 8, 5, 1];
  const bucketLabels = ['0 to 1', '1 to 2', '2 to 3', '3 to 4', '4 to 5'];
  const kept = [false, true, true, true, false];

  it('draws exact heights, no stub for an empty bucket, and marks the kept range by fill', () => {
    const { container } = render(<Histogram counts={counts} kept={kept} label="Price to book" bucketLabels={bucketLabels} testId="h" />);
    const cols = [...container.querySelectorAll('.pu-hist-col')];
    expect(cols.map((c) => c.querySelector('i')?.style.height ?? null)).toEqual([null, '37.5%', '100%', '62.5%', '12.5%']);
    expect(cols.map((c) => c.getAttribute('data-kept'))).toEqual(['false', 'true', 'true', 'true', 'false']);
    expect([...container.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent))).toEqual([
      ['0 to 1', '0', 'Outside range'],
      ['1 to 2', '3', 'In range'],
      ['2 to 3', '8', 'In range'],
      ['3 to 4', '5', 'In range'],
      ['4 to 5', '1', 'Outside range'],
    ]);
  });

  it('moves a cursor with the keyboard and speaks the bucket, its count and whether the range keeps it', async () => {
    const user = userEvent.setup();
    const { container } = render(<Histogram counts={counts} kept={kept} label="Price to book" bucketLabels={bucketLabels} countWord={(n) => `${n} stocks`} />);
    await user.tab();
    expect(live(container)).toBe('4 to 5: 1 stocks, Outside range');
    await user.keyboard('{Home}{ArrowRight}');
    expect(live(container)).toBe('1 to 2: 3 stocks, In range');
    expect(container.querySelector('.pu-hist-tip')!.textContent).toContain('1 to 2');
    await user.keyboard('{Escape}');
    expect(container.querySelector('.pu-hist-tip')).toBeNull();
  });

  it('falls back to numbered buckets, treats every bucket as kept, and handles no buckets', () => {
    const { container, rerender } = render(<Histogram counts={[1, 2]} label="Spread" />);
    expect(container.querySelector('tbody th')!.textContent).toBe('Bucket 1');
    expect(container.querySelectorAll('thead th')).toHaveLength(2);
    expect([...container.querySelectorAll('.pu-hist-col')].every((c) => c.getAttribute('data-kept') === 'true')).toBe(true);
    rerender(<Histogram counts={[]} label="Spread" />);
    expect(container.textContent).toContain('No data');
  });

  it('prints axis ticks at bucket edges and has no serious violations', async () => {
    const { container } = render(<Histogram counts={counts} kept={kept} label="Price to book" bucketLabels={bucketLabels} ticks={[{ at: 0, label: '0' }, { at: 5, label: '5' }]} />);
    expect([...container.querySelectorAll('.pu-hist-axis span')].map((s) => s.getAttribute('data-edge'))).toEqual(['start', 'end']);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('CorrelationMatrix', () => {
  const names = ['Banking', 'Hydropower', 'Insurance'];
  const values = [[1, 0.82, -0.3], [0.82, 1, null], [-0.3, null, 1]];

  it('is a square table with a caption, signed figures, a blank diagonal and words for a missing pair', () => {
    const { container } = render(<CorrelationMatrix names={names} values={values} caption="Sector correlation" testId="cm" />);
    expect(container.querySelector('caption')!.textContent).toBe('Sector correlation');
    const rows = [...container.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));
    expect(rows).toEqual([['', '0.82', '−0.30'], ['0.82', '', 'n/aNot enough history'], ['−0.30', 'n/aNot enough history', '']]);
    expect(container.querySelectorAll('td[aria-hidden="true"]')).toHaveLength(3);
  });

  it('chooses a subject from the heads, uncontrolled, and fades the rest', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(<CorrelationMatrix names={names} values={values} caption="c" onSelectedChange={onSelect} testId="cm" />);
    expect(container.querySelector('[data-dim]')).toBeNull();
    await user.click(screen.getByTestId('cm-row-0'));
    expect(onSelect).toHaveBeenCalledWith(0);
    expect(screen.getByTestId('cm-row-0').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelectorAll('td[data-dim]').length).toBe(2);
    await user.click(screen.getByTestId('cm-col-2'));
    expect(screen.getByTestId('cm-col-2').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('cm-row-0').getAttribute('aria-pressed')).toBe('false');
  });

  it('is controlled when selected is given, and has no serious violations', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(<CorrelationMatrix names={names} values={values} caption="c" selected={1} onSelectedChange={onSelect} testId="cm" />);
    await user.click(screen.getByTestId('cm-row-2'));
    expect(onSelect).toHaveBeenCalledWith(2);
    expect(screen.getByTestId('cm-row-1').getAttribute('aria-pressed')).toBe('true');
    expect(await seriousViolations(container)).toEqual([]);
  });
});
