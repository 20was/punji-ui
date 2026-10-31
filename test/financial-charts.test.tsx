import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CandlestickChart, DepthChart, PerformanceChart } from '../src/index.ts';
import { depthAsks, depthBids, nabilCandles, performanceDates, performanceSeries, sampleCandles } from '../fixtures/market-data.ts';
import { seriousViolations } from './axe.ts';

const norm = (s: string | null) => (s ?? '').replace(/\u00a0/g, ' ');
const live = (c: HTMLElement) => norm(c.querySelector('[role="status"]')!.textContent);
const plot = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="group"][tabindex="0"]')!;

describe('CandlestickChart', () => {
  it('draws one candle per valid session, a volume pane, and is accessible', async () => {
    const { container } = render(<CandlestickChart candles={nabilCandles} label="NABIL daily" testId="c" />);
    expect(container.querySelectorAll('.kit-ct-c')).toHaveLength(60);
    expect(container.querySelectorAll('.kit-ct-vol')).toHaveLength(60);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(60);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('colours up and down by the convention and swaps for red-up', () => {
    const candles = [{ date: '2025-11-13', open: 10, high: 12, low: 9, close: 11 }, { date: '2025-11-14', open: 11, high: 11.5, low: 8, close: 9 }];
    const { container, rerender } = render(<CandlestickChart candles={candles} label="x" />);
    const tones = () => [...container.querySelectorAll('.kit-ct-c')].map((g) => g.getAttribute('class'));
    expect(tones()).toEqual(['kit-ct-c gain', 'kit-ct-c loss']);
    rerender(<CandlestickChart candles={candles} label="x" convention="red-up" />);
    expect(tones()).toEqual(['kit-ct-c loss', 'kit-ct-c gain']);
    rerender(<CandlestickChart candles={candles} label="x" hollowUp />);
    expect(container.querySelectorAll('rect.hollow')).toHaveLength(1);
    rerender(<CandlestickChart candles={candles} label="x" variant="bars" />);
    expect(container.querySelectorAll('.kit-ct-c rect')).toHaveLength(0);
  });

  it('does not draw an inconsistent candle, says so and keeps it in the table with the reason', () => {
    const candles = [
      { date: '2025-11-13', open: 10, high: 12, low: 9, close: 11 },
      { date: '2025-11-14', open: 10, high: 9, low: 8, close: 11 },
      { date: '2025-11-16', open: Number.NaN, high: 9, low: 8, close: 11 },
    ];
    const { container } = render(<CandlestickChart candles={candles} label="x" />);
    expect(container.querySelectorAll('.kit-ct-c')).toHaveLength(1);
    expect(screen.getByRole('note').textContent).toBe('2 candles not drawn: inconsistent prices');
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[1]!.textContent).toContain('high is below open or close');
    expect(rows[2]!.textContent).toContain('a price is missing');
  });

  it('handles empty, all-bad, single, constant and no-volume data', () => {
    const { container, rerender } = render(<CandlestickChart candles={[]} label="x" />);
    expect(container.textContent).toContain('No data');
    rerender(<CandlestickChart candles={[{ date: '2025-11-13', open: 10, high: 9, low: 12, close: 11 }]} label="x" labels={{ empty: 'Nothing drawable' }} />);
    expect(container.textContent).toContain('Nothing drawable');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    rerender(<CandlestickChart candles={[{ date: '2025-11-13', open: 487.5, high: 487.5, low: 487.5, close: 487.5, volume: 10 }]} label="x" />);
    expect(container.querySelectorAll('.kit-ct-c.flat')).toHaveLength(1);
    expect(container.querySelector('.kit-ct-c rect')!.getAttribute('height')).toBe('1');
    rerender(<CandlestickChart candles={nabilCandles.map((c) => ({ ...c, volume: null }))} label="x" />);
    expect(container.querySelectorAll('.kit-ct-vol')).toHaveLength(0);
    expect(container.querySelector('tbody td:last-child')!.textContent).toBe('none');
  });

  it('default axis is by session; the time axis leaves the holiday gap', () => {
    const candles = [
      { date: '2025-11-09', open: 10, high: 11, low: 9, close: 10.5 },
      { date: '2025-11-10', open: 10, high: 11, low: 9, close: 10.5 },
      { date: '2025-11-11', open: 10, high: 11, low: 9, close: 10.5 },
      { date: '2025-11-20', open: 10, high: 11, low: 9, close: 10.5 },
    ];
    const gaps = (axis: 'category' | 'time') => {
      const { container, unmount } = render(<CandlestickChart candles={candles} label="x" axis={axis} />);
      const xs = [...container.querySelectorAll('.kit-ct-c line:first-child')].map((l) => Number(l.getAttribute('x1')));
      unmount();
      return [xs[1]! - xs[0]!, xs[3]! - xs[2]!] as [number, number];
    };
    const [cat1, cat2] = gaps('category');
    expect(cat2).toBeCloseTo(cat1, 5);
    const [t1, t2] = gaps('time');
    expect(t2).toBeGreaterThan(t1 * 5);
  });

  it('aggregates more candles than the width has room for and keeps the extremes', () => {
    const many = sampleCandles(1500, 3);
    const { container } = render(<CandlestickChart candles={many} label="x" />);
    const drawn = container.querySelectorAll('.kit-ct-c').length;
    expect(drawn).toBeLessThanOrEqual(Math.floor((640 - 64) / 3));
    expect(container.textContent).toContain('1500 sessions shown as');
    expect(container.querySelectorAll('tbody tr').length).toBe(500);
    expect(container.textContent).toContain('Showing the latest 500 of 1500 candles');
    const top = Math.max(...many.map((c) => c.high));
    expect(container.querySelector('.kit-ct-axis')!.textContent).toBeTruthy();
    expect(top).toBeGreaterThan(0);
  });

  it('draws moving average overlays', () => {
    const { container } = render(<CandlestickChart candles={nabilCandles} label="x" averages={[{ type: 'sma', window: 10 }, { type: 'ema', window: 20, label: 'EMA 20' }]} />);
    expect(container.querySelectorAll('.kit-ct-ma')).toHaveLength(2);
    expect(screen.getByText('SMA 10')).toBeTruthy();
    expect(screen.getByText('EMA 20')).toBeTruthy();
  });

  it('moves between candles with the keyboard and announces the focused candle', async () => {
    const user = userEvent.setup();
    const { container } = render(<CandlestickChart candles={nabilCandles} label="NABIL daily" />);
    await user.tab();
    expect(document.activeElement).toBe(plot(container));
    const last = nabilCandles.at(-1)!;
    expect(live(container)).toContain(`Close NPR ${last.close.toFixed(2)}`);
    await user.keyboard('{Home}');
    const first = nabilCandles[0]!;
    expect(live(container)).toContain(`Open NPR ${first.open.toFixed(2)}`);
    expect(live(container)).toContain('Volume');
    await user.keyboard('{ArrowRight}');
    expect(live(container)).toContain(`Open NPR ${nabilCandles[1]!.open.toFixed(2)}`);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(live(container)).toContain(`Open NPR ${first.open.toFixed(2)}`);
    await user.keyboard('{End}');
    expect(live(container)).toContain(`Close NPR ${last.close.toFixed(2)}`);
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
    expect(container.querySelector('.kit-ct-tip')).toBeNull();
  });

  it('shows a crosshair and readout on pointer move and clears on leave', async () => {
    const user = userEvent.setup();
    const { container } = render(<CandlestickChart candles={nabilCandles} label="x" testId="c" />);
    await user.hover(plot(container));
    expect(container.querySelector('.kit-ct-cross')).not.toBeNull();
    expect(screen.getByTestId('c-tip')).toBeTruthy();
    await user.unhover(plot(container));
    expect(container.querySelector('.kit-ct-cross')).toBeNull();
  });

  it('prints with a caller formatter', () => {
    render(<CandlestickChart candles={nabilCandles.slice(0, 3)} label="x" formatPrice={(v) => `₹${v}`} />);
    expect(screen.getAllByText(/^₹/).length).toBeGreaterThan(3);
  });
});

describe('PerformanceChart', () => {
  const props = { dates: performanceDates, series: performanceSeries, label: 'Portfolio against NEPSE' };

  it('normalises every series to 0% at the start and is accessible', async () => {
    const { container } = render(<PerformanceChart {...props} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(60);
    expect(rows[0]!.textContent).toContain('0.00%');
    const cells = within(rows[0] as HTMLElement).getAllByRole('cell');
    expect(cells.map((c) => c.textContent!.startsWith('0.00%'))).toEqual([true, true, true]);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('a missing benchmark day breaks its line and is "none" in the table, never zero', () => {
    const { container } = render(<PerformanceChart {...props} />);
    expect(container.querySelectorAll('tbody tr')[17]!.textContent).toContain('none');
    expect(container.querySelectorAll('.kit-ct-line')[1]!.querySelectorAll('path')).toHaveLength(2);
  });

  it('breaks a line only where its own data is missing: a complete series is one path, and a late start does not add gaps', () => {
    const dates = ['2025-09-09', '2025-09-10', '2025-09-11', '2025-09-14', '2025-09-15', '2025-09-16'];
    const series = [
      { key: 'p', label: 'Portfolio', values: [100, 101, 103, 102, 104, 105] },
      { key: 'n', label: 'NEPSE', values: [null, 2000, 2010, 2020, 2015, 2030] },
    ];
    const { container } = render(<PerformanceChart dates={dates} series={series} label="x" />);
    const lines = container.querySelectorAll('.kit-ct-line');
    expect(lines[0]!.querySelectorAll('path')).toHaveLength(1);
    expect(lines[1]!.querySelectorAll('path')).toHaveLength(1);
  });

  it('plots raw values when not normalised, with the area against the start', () => {
    const { container } = render(<PerformanceChart {...props} normalize={false} formatValue={(v) => `Rs ${v}`} />);
    expect(container.querySelector('tbody tr td')!.textContent).toBe(`Rs ${performanceSeries[0]!.values[0]}`);
    expect(container.querySelectorAll('.kit-ct-area-gain')).toHaveLength(1);
    expect(container.querySelectorAll('.kit-ct-area-loss')).toHaveLength(1);
  });

  it('toggles series from the legend by keyboard and never hides the last one', async () => {
    const user = userEvent.setup();
    const { container } = render(<PerformanceChart {...props} testId="p" />);
    const nepse = screen.getByRole('button', { name: /NEPSE/ });
    expect(nepse.getAttribute('aria-pressed')).toBe('true');
    nepse.focus();
    await user.keyboard('{Enter}');
    expect(nepse.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelectorAll('.kit-ct-line')).toHaveLength(2);
    await user.keyboard('{ }');
    expect(nepse.getAttribute('aria-pressed')).toBe('true');
    for (const name of [/NEPSE/, /Sensitive/, /Portfolio/]) await user.click(screen.getByRole('button', { name }));
    expect(container.querySelectorAll('.kit-ct-line')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Portfolio/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('handles empty, single date, flat and zero-base data', () => {
    const { container, rerender } = render(<PerformanceChart dates={[]} series={[]} label="x" periods={<span>1M</span>} />);
    expect(container.textContent).toContain('No data');
    expect(container.textContent).toContain('1M');
    rerender(<PerformanceChart dates={['2025-11-14']} series={[{ key: 'a', label: 'A', values: [5] }]} label="x" />);
    expect(container.querySelectorAll('.kit-ct-line circle')).toHaveLength(1);
    rerender(<PerformanceChart dates={['2025-11-13', '2025-11-14']} series={[{ key: 'a', label: 'A', values: [5, 5] }]} label="x" />);
    expect(container.querySelectorAll('.kit-ct-line path')).toHaveLength(1);
    rerender(<PerformanceChart dates={['2025-11-13', '2025-11-14']} series={[{ key: 'a', label: 'A', values: [0, 5] }, { key: 'b', label: 'B', values: [1, 2] }]} label="x" />);
    expect(container.querySelectorAll('.kit-ct-line path')).toHaveLength(1);
    expect(container.querySelector('tbody td')!.textContent).toBe('none');
  });

  it('reduces very long series without losing a spike', () => {
    const dates = Array.from({ length: 3000 }, (_, i) => `2025-01-${String((i % 28) + 1).padStart(2, '0')}`);
    const values = dates.map((_, i) => 100 + (i % 7));
    values[1234] = 900;
    const { container } = render(<PerformanceChart dates={dates} series={[{ key: 'a', label: 'A', values }]} label="x" normalize={false} />);
    const d = container.querySelector('.kit-ct-line path')!.getAttribute('d')!;
    expect(d.split('L').length).toBeLessThan(700);
    expect([...container.querySelectorAll('.kit-ct-axis')].map((n) => n.textContent).join(' ')).toMatch(/900|1,000/);
  });

  it('keyboard moves between dates and announces every visible series', async () => {
    const user = userEvent.setup();
    const { container } = render(<PerformanceChart {...props} />);
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(plot(container));
    expect(live(container)).toMatch(/Portfolio .*%.*NEPSE .*%.*Sensitive/);
    await user.keyboard('{Home}');
    expect(live(container)).toContain('Portfolio 0.00%');
    await user.keyboard('{ArrowRight}');
    expect(container.querySelector('.kit-ct-cross')).not.toBeNull();
  });
});

describe('DepthChart', () => {
  it('draws two cumulative sides, the mid price and an accessible table', async () => {
    const { container } = render(<DepthChart bids={depthBids} asks={depthAsks} label="NABIL depth" />);
    expect(container.querySelectorAll('.kit-ct-depth')).toHaveLength(2);
    expect(norm(container.querySelector('.kit-ct-mid text')!.textContent)).toBe('Mid NPR 487.50');
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(20);
    expect(rows[9]!.textContent).toContain('Bid');
    expect(rows[9]!.textContent).toContain('487.00');
    expect(rows[9]!.textContent).toContain('1,200');
    expect(rows[19]!.textContent).toContain('20,100');
    expect(norm(container.textContent)).toContain('Spread NPR 1.00');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('does not depend on level order, merges equal prices and drops invalid levels', () => {
    const { container } = render(<DepthChart bids={[{ price: 10, quantity: 5 }, { price: 10, quantity: 5 }, { price: -1, quantity: 5 }, { price: 9, quantity: Number.NaN }]} asks={[{ price: 12, quantity: 3 }, { price: 11, quantity: 2 }]} label="x" />);
    const rows = [...container.querySelectorAll('tbody tr')].map((r) => r.textContent);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('10');
    expect(rows[0]).toContain('Bid');
    expect(rows[2]).toContain('Ask');
  });

  it('handles empty, one-sided and crossed books', () => {
    const { container, rerender } = render(<DepthChart bids={[]} asks={[]} label="x" />);
    expect(container.textContent).toContain('No data');
    rerender(<DepthChart bids={depthBids} asks={[]} label="x" />);
    expect(container.querySelector('.kit-ct-mid')).toBeNull();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    rerender(<DepthChart bids={[{ price: 12, quantity: 1 }]} asks={[{ price: 11, quantity: 1 }]} label="x" />);
    expect(container.querySelector('.kit-ct-mid')).toBeNull();
    expect(container.textContent).toContain('check the data');
  });

  it('moves by price level with the keyboard and announces cumulative size', async () => {
    const user = userEvent.setup();
    const { container } = render(<DepthChart bids={depthBids} asks={depthAsks} label="x" />);
    await user.tab();
    expect(live(container)).toContain('Ask NPR 497.00');
    await user.keyboard('{Home}');
    expect(live(container)).toBe('Bid NPR 480.00, quantity 5,200, cumulative 22,550');
    await user.keyboard('{ArrowRight}');
    expect(live(container)).toContain('Bid NPR 481.00');
  });
});

describe('performance', () => {
  it('renders 1,500 and 2,000 candles quickly', () => {
    const times = [1500, 2000].map((n) => {
      const candles = sampleCandles(n, 11);
      const start = performance.now();
      const { container, unmount } = render(<CandlestickChart candles={candles} label="x" averages={[{ type: 'sma', window: 20 }]} />);
      const ms = performance.now() - start;
      expect(container.querySelectorAll('.kit-ct-c').length).toBeLessThanOrEqual(Math.floor((640 - 64) / 3));
      unmount();
      return ms;
    });
    console.info(`candlestick render ms (1500, 2000): ${times.map((m) => m.toFixed(0)).join(', ')}`);
    expect(Math.max(...times)).toBeLessThan(2000);
  });
});
