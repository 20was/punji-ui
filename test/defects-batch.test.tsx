import { existsSync, readFileSync } from 'node:fs';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { CurrencyInput, NumberField, PerformanceChart, PriceChart, aggregateByPeriod, rebase, rebaseOnto } from '../src/index.ts';

describe('Tabs count contrast', () => {
  it('does not fade the count with opacity (axe contrast)', () => {
    const css = readFileSync('src/styles/tabs.css', 'utf8');
    const rule = css.split('\n').find((l) => l.includes('.count {')) ?? '';
    expect(rule).not.toBe('');
    expect(rule).not.toMatch(/opacity/);
  });
});

function Parsed(props: { integer?: boolean; grouping?: 'south-asian' | 'western' | 'none' }) {
  const [v, setV] = useState('');
  const [r, setR] = useState('none');
  return (
    <>
      <NumberField
        label="Amount"
        value={v}
        onChange={setV}
        onValueChange={(x) => setR(x.state === 'valid' ? `valid:${x.value}` : x.state === 'invalid' ? `invalid:${x.reason}` : x.state)}
        {...props}
      />
      <output data-testid="r">{r}</output>
    </>
  );
}

const typed = async (text: string, props: Parameters<typeof Parsed>[0] = {}) => {
  render(<Parsed {...props} />);
  const input = screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement;
  await userEvent.type(input, text);
  return { shown: input.value, result: screen.getByTestId('r').textContent };
};

describe('NumberField parsing', () => {
  it('keeps the typed text and parses south-asian grouping to a plain decimal', async () => {
    expect(await typed('12,34,567.5')).toEqual({ shown: '12,34,567.5', result: 'valid:1234567.5' });
  });
  it('parses Devanagari digits', async () => {
    expect(await typed('१,२०,०००')).toEqual({ shown: '१,२०,०००', result: 'valid:120000' });
  });
  it('reports precision problems without rounding', async () => {
    expect((await typed('1.234')).result).toBe('invalid:precision');
  });
  it('refuses a fraction with integer', async () => {
    expect((await typed('1.5', { integer: true })).result).toBe('invalid:precision');
  });
  it('honours the grouping option', async () => {
    expect((await typed('12,34,567', { grouping: 'western' })).result).toBe('invalid:grouping');
  });
  it('reports partial input', async () => {
    expect((await typed('-')).result).toBe('partial');
  });
});

describe('ValueRow chevron layout', () => {
  it('keeps the chevron in its own column beside the figure, not a new grid row', () => {
    const css = readFileSync('src/styles/rows.css', 'utf8');
    expect(css).toMatch(/\.side > \.kit-chev \{[^}]*grid-column: 2[^}]*grid-row: 1 \/ span 2/);
    expect(css).toMatch(/\.side:has\(> \.kit-chev\) \{[^}]*grid-template-columns/);
  });
});

describe('site props generator', () => {
  it.skipIf(!existsSync('site/src/generated/api.json'))('never emits a self-referential type alias', () => {
    const api = JSON.parse(readFileSync('site/src/generated/api.json', 'utf8')) as Record<string, { kind: string; definition?: string }>;
    const aliases = Object.entries(api).filter(([, e]) => e.kind === 'type' && e.definition !== undefined);
    expect(aliases.length).toBeGreaterThan(0);
    for (const [name, e] of aliases) expect(e.definition).not.toBe(name);
  });
});

describe('PriceChart on the shared chart frame', () => {
  const points = [{ label: 'Mon', value: 10 }, { label: 'Tue', value: null }, { label: 'Wed', value: 20 }];
  it('reads observations by keyboard, announces them and shows gaps as unavailable', async () => {
    render(<PriceChart label="Balance" points={points} formatValue={(v) => `NPR ${v}`} />);
    const plot = screen.getByRole('group', { name: 'Balance' });
    act(() => plot.focus());
    expect(screen.getByRole('status').textContent).toBe('Wed: NPR 20');
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('status').textContent).toBe('Tue: Unavailable');
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('status').textContent).toBe('Mon: NPR 10');
    expect(plot.querySelector('.pu-chart-cursor')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('status').textContent).toBe('');
  });
  it('reads the nearest observation under the pointer', () => {
    render(<PriceChart label="Balance" points={points} formatValue={(v) => `NPR ${v}`} />);
    const plot = screen.getByRole('group', { name: 'Balance' });
    plot.getBoundingClientRect = () => ({ left: 0, top: 0, right: 480, bottom: 130, width: 480, height: 130, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerMove(plot, { clientX: 470 });
    expect(screen.getByRole('status').textContent).toBe('Wed: NPR 20');
    fireEvent.pointerLeave(plot);
    expect(screen.getByRole('status').textContent).toBe('');
  });
});

const c = (date: string, open: number, high: number, low: number, close: number, volume?: number) => ({ date, open, high, low, close, volume });

describe('aggregateByPeriod', () => {
  // Sunday to Thursday sessions, as NEPSE trades.
  const days = [
    c('2025-11-09', 10, 12, 9, 11, 100), c('2025-11-10', 11, 15, 10, 14, 50), c('2025-11-13', 14, 14, 8, 9, 25),
    c('2025-11-16', 9, 10, 9, 10, 10), c('2025-11-30', 10, 11, 7, 8), c('2025-12-01', 8, 9, 8, 9, 5),
  ];
  it('groups by week starting Sunday: first open, last close, extremes, summed volume', () => {
    const w = aggregateByPeriod(days, 'week');
    expect(w.map((b) => [b.key, b.from, b.to])).toEqual([['2025-11-09', 0, 2], ['2025-11-16', 3, 3], ['2025-11-30', 4, 5]]);
    expect(w[0]!.candle).toEqual({ date: '2025-11-13', open: 10, high: 15, low: 8, close: 9, volume: 175 });
    expect(w[2]!.candle.volume).toBe(5);
  });
  it('groups by month, quarter and year across a boundary', () => {
    expect(aggregateByPeriod(days, 'month').map((b) => b.key)).toEqual(['2025-11', '2025-12']);
    expect(aggregateByPeriod(days, 'quarter').map((b) => b.key)).toEqual(['2025-Q4']);
    expect(aggregateByPeriod(days, 'year')[0]!.candle.close).toBe(9);
  });
  it('honours weekStartsOn and skips impossible dates', () => {
    expect(aggregateByPeriod(days.slice(0, 3), 'week', { weekStartsOn: 1 }).map((b) => b.key)).toEqual(['2025-11-03', '2025-11-10']);
    expect(aggregateByPeriod([c('2025-02-30', 1, 1, 1, 1), c('nope', 1, 1, 1, 1)], 'month')).toEqual([]);
  });
  it('keeps a missing volume missing', () => {
    expect(aggregateByPeriod([c('2025-11-30', 10, 11, 7, 8)], 'month')[0]!.candle.volume).toBeNull();
  });
});

describe('late-starting series', () => {
  it('rebaseOnto continues from the reference level on the first date', () => {
    const portfolio = rebase([100, 110, 121, 133.1]);
    const late = rebaseOnto([null, null, 50, 55], portfolio);
    expect(late[0]).toBeNull();
    expect(late[2]).toBeCloseTo(21, 9);
    expect(late[3]).toBeCloseTo(33.1, 9);
  });
  it('falls back to plain rebase without a real reference value', () => {
    expect(rebaseOnto([null, 50, 55], [null, null, 1])).toEqual(rebase([null, 50, 55]));
    expect(rebaseOnto([50, 55], [0, 0])).toEqual(rebase([50, 55]));
  });
  it('PerformanceChart starts a late benchmark level with the portfolio, not at zero', () => {
    const dates = ['2025-11-09', '2025-11-10', '2025-11-13', '2025-11-16'];
    render(
      <PerformanceChart
        label="Against NEPSE"
        dates={dates}
        series={[{ key: 'p', label: 'Portfolio', values: [100, 110, 121, 133.1] }, { key: 'n', label: 'NEPSE', values: [null, null, 2000, 2200] }]}
      />,
    );
    const plot = screen.getByRole('group', { name: 'Against NEPSE' });
    act(() => plot.focus());
    fireEvent.keyDown(plot, { key: 'Home' });
    fireEvent.keyDown(plot, { key: 'ArrowRight' });
    fireEvent.keyDown(plot, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toContain('NEPSE +21.00% (2,000.00)');
  });
});

function Money() {
  const [v, setV] = useState('');
  return <CurrencyInput label="Amount" currency="NPR" locale="en-IN" value={v} onValueChange={(change) => setV(change.value)} className="mine" />;
}
describe('CurrencyInput mask alignment', () => {
  it('right-aligns the input (class + css) and still groups as you type', async () => {
    render(<Money />);
    const input = screen.getByRole('textbox', { name: /Amount/ }) as HTMLInputElement;
    expect(input.className).toContain('pu-currency-input');
    expect(input.className).toContain('mine');
    await userEvent.type(input, '1234567.5');
    expect(input.value).toBe('12,34,567.5');
    const css = readFileSync('src/styles/money.css', 'utf8');
    expect(css).toMatch(/input\.pu-currency-input \{[^}]*text-align: end/);
  });
});
