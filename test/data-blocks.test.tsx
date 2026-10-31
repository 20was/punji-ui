import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  Breakdown, BreakdownRow, ColumnChart, ColumnLegend, DataTable, DataListRow, Cell, DivergingBar, FigureChip, HeadlineFigure, MeterBar, MetricRow, MetricTile,
  MoneyDisplay, NetBar, NetBarHead, Pagination, Sparkline, SplitBar, columnScaleTop, labelledColumns, reduceSeries, pageOfIndex, paginate, tablePagination, usePagination,
} from '../src/index.ts';
import { seriousViolations } from './axe.ts';

class NoopObserver { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal('ResizeObserver', NoopObserver);

const divergingWidths = (v: number, m: number) => {
  const { container } = render(<DivergingBar value={v} max={m} />);
  return [...container.querySelectorAll('i')].map((i) => (i as HTMLElement).style.width);
};
const pts = (c: Element) => (c.querySelector('polyline') as SVGPolylineElement).getAttribute('points')!.split(' ').map((p) => p.split(',').map(Number) as [number, number]);
const tone = (values: number[], t?: 'chart') => render(<Sparkline values={values} tone={t} />).container.querySelector('svg')!.getAttribute('class');
const rs = (v: number) => `Rs ${v.toLocaleString('en-IN')}`;
const col = (key: string, values: (number | null | undefined)[], short?: string) => ({ key, label: key, values, ...(short ? { short } : {}) });
const heights = (c: Element) => [...c.querySelectorAll('.kit-col-up')].map((e) => (e as HTMLElement).style.height);
const Harness = ({ total = 12, size = 5, start = 1 }: { total?: number; size?: number; start?: number }) => {
  const pager = usePagination({ total, defaultPageSize: size, defaultPage: start });
  return (
    <>
      <Pagination page={pager.page} total={pager.total} pageSize={pager.pageSize} onPageChange={pager.setPage} label="Holdings pages" testId="p" />
      <ul>{Array.from({ length: pager.endIndex - pager.startIndex }, (_, i) => <li key={i}>row {pager.startIndex + i + 1}</li>)}</ul>
    </>
  );
};
const tableRange = () => document.querySelector('.kit-table-range')!.textContent;

describe('HeadlineFigure and FigureChip', () => {
  it('prints label, action, currency, figure, aside, line and chips; skips what is absent (a 0 label still prints)', async () => {
    const { container } = render(
      <HeadlineFigure label="Worth now" labelAction={<button type="button">Hide amounts</button>} currency="Rs" value="12,48,000" aside={<span>+Rs 8,240</span>} line="Across 14 holdings." testId="hf" valueTestId="hf-v">
        <FigureChip tone="up">+Rs 8,240 (+0.7%) today</FigureChip>
        <FigureChip tone="down" srLabel="Loss">-Rs 1,200 this week</FigureChip>
        <FigureChip tone="flat">Unchanged since Sunday</FigureChip>
      </HeadlineFigure>,
    );
    expect(screen.getByTestId('hf-v').textContent).toBe('Rs 12,48,000');
    expect(screen.getByText('Across 14 holdings.').tagName).toBe('P');
    expect(container.querySelectorAll('.kit-figchip')).toHaveLength(3);
    expect(container.querySelector('.kit-figchip.down .kit-sr')?.textContent).toBe('Loss: ');
    expect(screen.getByRole('button', { name: 'Hide amounts' })).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('leaves out empty parts and keeps a numeric zero label', () => {
    const { container, rerender } = render(<HeadlineFigure value="0" size="lg" />);
    expect(container.querySelector('.kit-headfig.lg')).toBeTruthy();
    expect(container.querySelector('.kit-headfig-k')).toBeNull();
    expect(container.querySelector('.kit-headfig-chips')).toBeNull();
    rerender(<HeadlineFigure value="5" label={0} />);
    expect(container.querySelector('.kit-headfig-k')?.textContent).toBe('0');
  });
});

describe('SplitBar, DivergingBar, NetBar', () => {
  it('SplitBar draws only parts above zero and labels every labelled part; the bar is decorative', async () => {
    const { container } = render(
      <SplitBar testId="sb" parts={[
        { key: 'u', value: 141, tone: 'gain', label: '141 up' },
        { key: 'f', value: 0, tone: 'neutral', label: '0 unchanged' },
        { key: 'd', value: 96, tone: 'loss', label: '96 down' },
      ]} />,
    );
    const bar = container.querySelector('.kit-split-bar') as HTMLElement;
    expect(bar.getAttribute('aria-hidden')).toBe('true');
    expect([...bar.querySelectorAll('i')].map((i) => (i as HTMLElement).style.flexGrow)).toEqual(['141', '96']);
    expect(container.querySelector('.kit-split-l')?.textContent).toBe('141 up0 unchanged96 down');
    expect(container.querySelector('.kit-split-t.neutral')?.textContent).toBe('0 unchanged');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('SplitBar ignores negative and non-finite parts, takes a name as an img, and warns when it means nothing', () => {
    const { container, rerender } = render(<SplitBar label="Done 3 of 4" parts={[{ key: 'a', value: 3, tone: 'chart' }, { key: 'b', value: Number.NaN, tone: 'loss' }, { key: 'c', value: -2, tone: 'loss' }, { key: 'd', value: 1, tone: 'neutral' }]} />);
    expect(screen.getByRole('img', { name: 'Done 3 of 4' })).toBeTruthy();
    expect(container.querySelectorAll('.kit-split-bar i')).toHaveLength(2);
    expect(container.querySelector('.kit-split-l')).toBeNull();
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    rerender(<SplitBar parts={[{ key: 'a', value: 1, tone: 'gain' }]} />);
    expect(err).toHaveBeenCalledWith(expect.stringContaining('colour alone'));
    err.mockRestore();
  });

  it('DivergingBar grows right for a rise and left for a fall on the shared scale, never NaN', () => {
    expect(divergingWidths(6, 12)).toEqual(['50%']);
    expect(divergingWidths(-12, 12)).toEqual(['100%']);
    expect(divergingWidths(0, 12)).toEqual([]);
    expect(divergingWidths(40, 12)).toEqual(['100%']);
    expect(divergingWidths(1, 0)).toEqual(['2%']);
    expect(divergingWidths(Number.NaN, 12)).toEqual([]);
    expect(divergingWidths(5, Number.POSITIVE_INFINITY)).toEqual(['2%']);
  });

  it('NetBar prints the signed figure, a centre line, and speaks the parts it nets; hover shows them', async () => {
    const { container } = render(
      <div>
        <NetBarHead left="Net sold" right="Net bought" />
        <NetBar value={-25} max={50} text="−25.00" testId="nb" tip={{ title: 'NABIL', rows: [{ label: 'Bought', value: '10', tone: 'gain' }, { label: 'Sold', value: '35', tone: 'loss' }] }} />
      </div>,
    );
    const net = screen.getByTestId('nb');
    expect(net.className).toContain('down');
    expect(net.querySelector('.kit-netbar-t')?.getAttribute('aria-hidden')).toBe('true');
    expect((net.querySelector('.kit-netbar-l i') as HTMLElement).style.width).toBe('max(3px, 50%)');
    expect(net.textContent).toContain('−25.00');
    expect(net.querySelector('.kit-sr')?.textContent).toBe('Bought 10, Sold 35');
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.pointerMove(net, { clientX: 40, clientY: 40, pointerType: 'mouse' });
    expect(within(screen.getByRole('tooltip')).getByText('NABIL')).toBeTruthy();
    fireEvent.pointerLeave(net);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.pointerMove(net, { clientX: 40, clientY: 40, pointerType: 'touch' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(container.querySelectorAll('.kit-netbar-h [aria-hidden="true"]')).toHaveLength(2);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('NetBar is flat at zero with a bad scale', () => {
    const { container } = render(<NetBar value={0} max={Number.NaN} text="0" />);
    expect(container.querySelector('.kit-netbar.flat')).toBeTruthy();
    expect(container.querySelector('.kit-netbar-t i')).toBeNull();
  });
});

describe('Sparkline', () => {

  it('is decorative by default, an img with a label, straight segments through every real point', async () => {
    const { container, rerender } = render(<Sparkline values={[510, 514, 509, 521, 530]} width={88} height={28} testId="sp" />);
    const svg = screen.getByTestId('sp');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(pts(container)).toHaveLength(5);
    expect(svg.getAttribute('class')).toBe('kit-spark gain');
    rerender(<Sparkline values={[510, 514, 509, 521, 530]} label="NABIL, up 3.9 percent in 30 days" />);
    expect(screen.getByRole('img', { name: 'NABIL, up 3.9 percent in 30 days' })).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('tone follows first and last unless set; flat and single-valued series are a level line, not NaN', () => {
    expect(tone([5, 4, 3])).toContain('loss');
    expect(tone([5, 9, 5])).toContain('flat');
    expect(tone([1, 2], 'chart')).toContain('chart');
    const { container } = render(<Sparkline values={[7, 7, 7]} height={28} />);
    expect(new Set(pts(container).map((p) => p[1]))).toEqual(new Set([14]));
  });

  it('fewer than two real values draw the dashed rule; nulls and non-finite values are dropped, not zeroed', () => {
    for (const v of [undefined, null, [], [4], [Number.NaN, 3], [null, undefined, 2]] as const) {
      const { container, unmount } = render(<Sparkline values={v as never} testId="none" />);
      expect(container.querySelector('.kit-spark-none')).toBeTruthy();
      expect(container.querySelector('svg')).toBeNull();
      unmount();
    }
    const { container } = render(<Sparkline values={[1, null, Number.NaN, 3, Number.POSITIVE_INFINITY, 2]} />);
    expect(pts(container)).toHaveLength(3);
    const named = render(<Sparkline values={[]} label="No closes yet" />);
    expect(named.getByRole('img', { name: 'No closes yet' })).toBeTruthy();
  });

  it('survives opposite finite extremes, and fluid fills its container with a kept aspect', () => {
    const { container } = render(<Sparkline values={[-Number.MAX_VALUE, Number.MAX_VALUE, 0]} />);
    expect(pts(container).flat().every(Number.isFinite)).toBe(true);
    const f = render(<Sparkline values={[1, 2]} width={400} height={90} fluid />).container.querySelector('svg')!;
    expect(f.getAttribute('class')).toContain('fluid');
    expect(f.getAttribute('width')).toBeNull();
    expect(f.style.aspectRatio).toContain('400');
  });

  it('long series are reduced by extremes: first, last and the spike survive', () => {
    const long = Array.from({ length: 2000 }, (_, i) => 100 + (i % 7));
    long[1234] = 900;
    const out = reduceSeries(long, 120);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out[0]).toBe(long[0]);
    expect(out.at(-1)).toBe(long.at(-1));
    expect(out).toContain(900);
    expect(reduceSeries([1, 2, 3], 120)).toEqual([1, 2, 3]);
    const { container } = render(<Sparkline values={long} />);
    expect(pts(container).length).toBeLessThanOrEqual(120);
  });
});

describe('ColumnChart', () => {
  const SERIES = [
    { key: 'cash', label: 'Cash dividend', tone: 'chart' as const },
    { key: 'bonus', label: 'Bonus shares', tone: 'series2' as const },
  ];

  it('stacks parts per column, prints totals, labels the scale, and gives a data table with every figure', async () => {
    const { container } = render(
      <ColumnChart label="Dividends received" series={SERIES} format={rs} testId="cc" minSlots={3}
        columns={[col('2080/81', [12000, 4000]), col('2081/82', [18000, 0]), col('2082/83', [9000, 9000])]} />,
    );
    expect(screen.getByRole('figure', { name: 'Dividends received' })).toBeTruthy();
    expect(container.querySelector('.kit-col-frame')?.getAttribute('aria-hidden')).toBe('true');
    const table = screen.getByRole('table', { name: 'Dividends received' });
    const rows = within(table).getAllByRole('row').map((r) => [...r.querySelectorAll('th,td')].map((c) => c.textContent));
    expect(rows[0]).toEqual(['Period', 'Cash dividend', 'Bonus shares', 'Total']);
    expect(rows[1]).toEqual(['2080/81', 'Rs 12,000', 'Rs 4,000', 'Rs 16,000']);
    expect(rows[2]).toEqual(['2081/82', 'Rs 18,000', 'Rs 0', 'Rs 18,000']);
    // 18,000 is the tallest and the scale tops out at the next round figure.
    expect(columnScaleTop(18000)).toBe(20000);
    expect(heights(container)).toEqual(['80%', '90%', '90%']);
    expect(container.querySelectorAll('.kit-col-v')).toHaveLength(3);
    expect([...container.querySelectorAll('.kit-col-y-in span:not(.kit-col-y-w)')].map((s) => s.textContent).toSorted()).toEqual(['0', 'Rs 10,000', 'Rs 20,000'].toSorted());
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('empty: no columns or no series prints the empty words and no axes; still a named figure', async () => {
    const { container, rerender } = render(<ColumnChart label="Dividends" series={SERIES} columns={[]} />);
    expect(screen.getByText('No data')).toBeTruthy();
    expect(container.querySelector('.kit-col-frame')).toBeNull();
    rerender(<ColumnChart label="Dividends" series={[]} columns={[col('a', [1])]} labels={{ empty: 'No dividends recorded' }} />);
    expect(screen.getByText('No dividends recorded')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('single value: one column among the slots, centred, at its scale', () => {
    const { container } = render(<ColumnChart label="One year" series={SERIES.slice(0, 1)} columns={[col('2082/83', [5000])]} format={rs} minSlots={5} />);
    expect(container.querySelectorAll('.kit-col-c')).toHaveLength(1);
    expect((container.querySelector('.kit-col-c') as HTMLElement).style.gridColumnStart).toBe('3');
    expect(heights(container)).toEqual(['100%']);
    // A single series has no total column.
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Period', 'Cash dividend']);
  });

  it('all zero (or all missing): baseline and printed zeros, no scale, no NaN', async () => {
    const { container } = render(<ColumnChart label="Nothing paid" series={SERIES} format={rs} columns={[col('a', [0, 0]), col('b', [null, undefined]), col('c', [Number.NaN, 0])]} />);
    expect(heights(container)).toEqual(['0%', '0%', '0%']);
    expect(container.querySelectorAll('.kit-col-grid')).toHaveLength(0);
    expect([...container.querySelectorAll('.kit-col-y-in span:not(.kit-col-y-w)')].map((s) => s.textContent)).toEqual(['0']);
    expect([...container.querySelectorAll('.kit-col-v')].map((s) => s.textContent)).toEqual(['Rs 0', 'Rs 0', 'Rs 0']);
    expect(container.innerHTML).not.toMatch(/NaN|undefined|Infinity/);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('missing and non-finite values are "none" in the table, never 0, and draw nothing', () => {
    const { container } = render(<ColumnChart label="Gaps" series={SERIES} format={rs} labels={{ none: 'not paid' }} columns={[col('a', [100, null]), col('b', [Number.POSITIVE_INFINITY, 50])]} />);
    const cells = within(screen.getByRole('table')).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell').map((c) => c.textContent));
    expect(cells).toEqual([['Rs 100', 'not paid', 'Rs 100'], ['not paid', 'Rs 50', 'Rs 50']]);
    expect(container.querySelectorAll('.kit-col-up > i')).toHaveLength(2);
  });

  it('negative: a reversal stacks below the baseline on its own scale and the total is the net', async () => {
    const { container } = render(
      <ColumnChart label="Net income" series={SERIES} format={(v) => (v < 0 ? `-Rs ${Math.abs(v)}` : `Rs ${v}`)} columns={[col('a', [1000, 0]), col('b', [600, -400]), col('c', [-500, 0])]} />,
    );
    const ups = [...container.querySelectorAll('.kit-col-up')].map((e) => (e as HTMLElement).style.height);
    // scale: positives to 1000 (top 1000), negatives to 500 (bottom 500): span 1500.
    expect(ups.map((u) => Math.round(parseFloat(u)))).toEqual([67, 40, 0]);
    expect(container.querySelectorAll('.kit-col-dn')).toHaveLength(2);
    expect([...container.querySelectorAll('.kit-col-v')].map((v) => v.textContent)).toEqual(['Rs 1000', 'Rs 200', '-Rs 500']);
    const ticks = [...container.querySelectorAll('.kit-col-y-in span:not(.kit-col-y-w)')].map((s) => s.textContent);
    expect(ticks).toContain('-Rs 500');
    expect(ticks).toContain('0');
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell').map((c) => c.textContent));
    expect(rows[1]).toEqual(['Rs 600', '-Rs 400', 'Rs 200']);
    expect(container.innerHTML).not.toMatch(/NaN/);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('constant data: equal columns fill most of the plot on a round scale', () => {
    const { container } = render(<ColumnChart label="Flat" series={SERIES.slice(0, 1)} columns={['a', 'b', 'c'].map((k) => col(k, [7500]))} />);
    const h = heights(container);
    expect(new Set(h).size).toBe(1);
    expect(columnScaleTop(7500)).toBe(8000);
    expect(parseFloat(h[0]!)).toBeGreaterThan(90);
  });

  it('outlier: the scale stays honest, small parts keep a visible minimum, every figure is printed', async () => {
    const { container } = render(<ColumnChart label="Outlier" series={SERIES.slice(0, 1)} format={rs} columns={[col('a', [120]), col('b', [95_00_000]), col('c', [80])]} />);
    const h = heights(container).map(parseFloat);
    expect(h[1]).toBeGreaterThan(75);
    expect(h[0]).toBeLessThan(1);
    expect(h[0]).toBeGreaterThan(0);
    expect(container.querySelectorAll('.kit-col-up > i')).toHaveLength(3);
    expect([...container.querySelectorAll('.kit-col-v')].map((v) => v.textContent)).toEqual(['Rs 120', rs(9_500_000), 'Rs 80']);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('bounds its size: height is clamped, bad input falls back, and a wide record drops totals only when measured narrow', () => {
    const tall = render(<ColumnChart label="Tall" series={SERIES.slice(0, 1)} columns={[col('a', [1])]} height={5000} />).container.querySelector('.kit-col-frame') as HTMLElement;
    expect(tall.style.gridTemplateRows).toBe('502px auto');
    const small = render(<ColumnChart label="Small" series={SERIES.slice(0, 1)} columns={[col('a', [1])]} height={10} />).container.querySelector('.kit-col-frame') as HTMLElement;
    expect(small.style.gridTemplateRows).toBe('118px auto');
    const bad = render(<ColumnChart label="Bad" series={SERIES.slice(0, 1)} columns={[col('a', [1])]} height={Number.NaN} />).container.querySelector('.kit-col-frame') as HTMLElement;
    expect(bad.style.gridTemplateRows).toBe('222px auto');
  });

  it('thins labels counting back from the last, so the latest period always shows', () => {
    expect([...labelledColumns(12, 32, 64)].toSorted((a, b) => a - b)).toEqual([1, 3, 5, 7, 9, 11]);
    expect(labelledColumns(4, 100, 64).size).toBe(4);
    expect(labelledColumns(3, 0, 64).size).toBe(3);
    const { container } = render(<ColumnChart label="Years" series={SERIES.slice(0, 1)} minSlots={1} columns={Array.from({ length: 12 }, (_, i) => col(`y${i}`, [i + 1]))} />);
    // jsdom has no layout: width is 0, so every label prints and nothing overlaps by thinning.
    expect([...container.querySelectorAll('.kit-col-x span')].map((s) => s.textContent).filter(Boolean)).toHaveLength(12);
  });

  it('measured narrow: totals that would collide are dropped and labels thin, the last column always labelled', () => {
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(240);
    const { container } = render(<ColumnChart label="Narrow" series={SERIES.slice(0, 1)} format={rs} columns={Array.from({ length: 8 }, (_, i) => col(`2074/${75 + i}`, [10000 * (i + 1)], `${75 + i}`))} minSlots={1} />);
    width.mockRestore();
    expect(container.querySelectorAll('.kit-col-v')).toHaveLength(0);
    const labels = [...container.querySelectorAll('.kit-col-x span')].map((s) => s.textContent);
    expect(labels.at(-1)).toBe('82');
    expect(labels.filter(Boolean).length).toBeLessThan(8);
    expect(screen.getByRole('table').textContent).toContain('Rs 80,000');
  });

  it('prints the legend only on request and ColumnLegend alone is decorative', () => {
    const { container, rerender } = render(<ColumnChart label="L" series={SERIES} columns={[col('a', [1, 2])]} />);
    expect(container.querySelector('.kit-col-legend')).toBeNull();
    rerender(<ColumnChart label="L" series={SERIES} columns={[col('a', [1, 2])]} legend axis={false} />);
    expect(container.querySelector('.kit-col-legend')?.textContent).toBe('Cash dividendBonus shares');
    expect(container.querySelector('.kit-col-y')).toBeNull();
    const l = render(<ColumnLegend series={SERIES} />).container.querySelector('ul')!;
    expect(l.getAttribute('aria-hidden')).toBe('true');
  });

  it('columnScaleTop rounds up to a round figure and survives bad input', () => {
    expect(columnScaleTop(0)).toBe(1);
    expect(columnScaleTop(-3)).toBe(1);
    expect(columnScaleTop(Number.NaN)).toBe(1);
    expect(columnScaleTop(Number.POSITIVE_INFINITY)).toBe(1);
    expect([columnScaleTop(0.7), columnScaleTop(1.1), columnScaleTop(2.2), columnScaleTop(7), columnScaleTop(81)]).toEqual([0.8, 1.2, 2.5, 8, 100]);
  });
});

describe('Breakdown', () => {
  it('lists parts with their amounts as a description list, the total ruled off', async () => {
    const { container } = render(
      <Breakdown live testId="bd">
        <BreakdownRow label="Sale amount" note="100 shares at Rs 1,240" value="Rs 1,24,000.00" />
        <BreakdownRow label="Broker commission" value="- Rs 497.00" tone="down" />
        <BreakdownRow label="You receive" total value={<MoneyDisplay value="123503.00" currency="NPR" />} testId="bd-total" />
      </Breakdown>,
    );
    const dl = screen.getByTestId('bd');
    expect(dl.tagName).toBe('DL');
    expect(dl.getAttribute('aria-live')).toBe('polite');
    expect(dl.className).toContain('kit-inv');
    expect(container.querySelectorAll('dl > div > dt')).toHaveLength(3);
    expect(screen.getByText('100 shares at Rs 1,240').tagName).toBe('SMALL');
    expect(container.querySelector('.kit-bd-row.total dt')?.textContent).toBe('You receive');
    expect(screen.getByTestId('bd-total').textContent).toMatch(/123,503|1,23,503/);
    expect(container.querySelector('dd.down')?.textContent).toBe('- Rs 497.00');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('tint tone has no inverse class and no live region by default', () => {
    render(<Breakdown tone="tint" testId="t"><BreakdownRow label="A" value="1" /></Breakdown>);
    expect(screen.getByTestId('t').className).toBe('kit-bd');
    expect(screen.getByTestId('t').getAttribute('aria-live')).toBeNull();
  });
});

describe('Pagination and the shared pagination model', () => {

  it('says the range in a named nav, politely live, and moves through pages driven by usePagination', async () => {
    const { container } = render(<Harness />);
    expect(screen.getByRole('navigation', { name: 'Holdings pages' })).toBeTruthy();
    expect(screen.getByTestId('p-range').textContent).toBe('1–5 of 12');
    expect(screen.getByTestId('p-range').getAttribute('aria-live')).toBe('polite');
    expect(screen.getByRole('button', { name: 'Previous page' }).hasAttribute('disabled')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByTestId('p-range').textContent).toBe('6–10 of 12');
    expect(screen.getByText('row 6')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(screen.getByTestId('p-range').textContent).toBe('11–12 of 12');
    expect(screen.getByRole('button', { name: 'Page 3' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Next page' }).hasAttribute('disabled')).toBe(true);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('numbers up to four pages; past that only the range and the arrows', () => {
    render(<Harness total={100} />);
    expect(screen.queryByRole('button', { name: 'Page 1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeTruthy();
  });

  it('empty list and out-of-range page are clamped, never negative or NaN', () => {
    const { container, rerender } = render(<Pagination page={1} total={0} pageSize={5} onPageChange={() => undefined} label="x" testId="e" />);
    expect(screen.getByTestId('e-range').textContent).toBe('0 of 0');
    expect(container.querySelectorAll('button[disabled]')).toHaveLength(2);
    expect(container.querySelectorAll('button')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Page 1' })).toBeNull();
    rerender(<Pagination page={99} total={12} pageSize={5} onPageChange={() => undefined} label="x" testId="e" />);
    expect(screen.getByTestId('e-range').textContent).toBe('11–12 of 12');
    rerender(<Pagination page={Number.NaN} total={Number.NaN} pageSize={0} onPageChange={() => undefined} label="x" testId="e" />);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('takes its words from the caller (and groups large counts South Asian style)', async () => {
    const onPageChange = vi.fn<(p: number) => void>();
    render(<Pagination page={2} total={1_24_500} pageSize={500} onPageChange={onPageChange} label="पृष्ठहरू" previousLabel="अघिल्लो" nextLabel="अर्को" rangeLabel={(r, t) => `${t} मध्ये ${r}`} />);
    expect(screen.getByText('1,24,500 मध्ये 501–1,000')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'अर्को' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'अघिल्लो' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it('is one model with DataTable: the same range, clamped the same way, driven by the same state', async () => {
    const COLS = [{ key: 'symbol', label: 'Symbol' }];
    const Both = () => {
      const pager = usePagination({ total: 12, defaultPageSize: 5 });
      return (
        <>
          <DataTable caption="Holdings" columns={COLS} pagination={{ ...tablePagination(pager), testIdPrefix: 'tbl' }}>
            {Array.from({ length: pager.endIndex - pager.startIndex }, (_, i) => <DataListRow key={i}><Cell>{`S${pager.startIndex + i}`}</Cell></DataListRow>)}
          </DataTable>
          <Pagination page={pager.page} total={pager.total} pageSize={pager.pageSize} onPageChange={pager.setPage} label="Pager" testId="p" />
        </>
      );
    };
    render(<Both />);
    expect(tableRange()).toBe('1–5 of 12');
    await userEvent.click(screen.getByTestId('tbl-next'));
    expect(tableRange()).toBe('6–10 of 12');
    expect(screen.getByTestId('p-range').textContent).toBe('6–10 of 12');
    await userEvent.click(screen.getByTestId('p-next'));
    expect(tableRange()).toBe('11–12 of 12');
  });

  it('DataTable clamps an out-of-range page index the way paginate does', () => {
    render(<DataTable caption="Late" columns={[{ key: 'a', label: 'A' }]} pagination={{ pageIndex: 40, pageSize: 5, rowCount: 12, onPageChange: () => undefined }}><DataListRow><Cell>x</Cell></DataListRow></DataTable>);
    expect(document.querySelector('.kit-table-range')!.textContent).toBe('11–12 of 12');
    expect(screen.getByText('Page 3 of 3')).toBeTruthy();
  });

  it('pageOfIndex and tablePagination convert between zero-based and one-based honestly', () => {
    expect([pageOfIndex(0, 5), pageOfIndex(4, 5), pageOfIndex(5, 5), pageOfIndex(-3, 5), pageOfIndex(Number.NaN, 5), pageOfIndex(9, 0)]).toEqual([1, 1, 2, 1, 1, 10]);
    expect(paginate(12, 2, 5).startIndex).toBe(5);
    const setPage = vi.fn<(n: number) => void>();
    const t = tablePagination({ pageIndex: 1, pageSize: 5, total: 12, setPage });
    expect(t).toMatchObject({ pageIndex: 1, pageSize: 5, rowCount: 12 });
    t.onPageChange(2);
    expect(setPage).toHaveBeenCalledWith(3);
  });
});

describe('MetricTile and MetricRow', () => {
  it('shows label, figure, a decorative meter and a note, in a named group', async () => {
    const { container } = render(
      <MetricRow label="Portfolio totals" count={4} testId="mr">
        <MetricTile label="Invested" value="Rs 9,80,000" meter={<MeterBar parts={[{ value: 80, tone: 'chart' }]} max={100} />} note="14 holdings" />
        <MetricTile label="Total return" value="+Rs 2,68,000" tone="inverse" meter={<MeterBar parts={[{ value: 20, tone: 'gain' }]} max={100} />} note="27.3% on cost" testId="lead" />
        <MetricTile label="Fees paid" value="Rs 4,210" />
      </MetricRow>,
    );
    const group = screen.getByRole('group', { name: 'Portfolio totals' });
    expect(group.className).toContain('kit-metrics n4');
    expect(screen.getByTestId('lead').className).toContain('lead');
    expect(group.querySelectorAll('.kit-metric')).toHaveLength(3);
    // A tile without a meter holds the meter's space so tiles line up.
    expect(container.querySelectorAll('.kit-metric-nometer')).toHaveLength(1);
    expect(container.querySelectorAll('.kit-meter[aria-hidden="true"]')).toHaveLength(2);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('compact tiles and dense rows hold no meter space', () => {
    const { container } = render(<MetricRow dense count={3}><MetricTile compact label="A" value="1" /></MetricRow>);
    expect(container.querySelector('.kit-metrics.n3.dense')).toBeTruthy();
    expect(container.querySelector('.kit-metric.compact')).toBeTruthy();
    expect(container.querySelector('.kit-metric-nometer')).toBeNull();
    expect(container.querySelector('[role="group"]')?.getAttribute('aria-label')).toBeNull();
  });
});
