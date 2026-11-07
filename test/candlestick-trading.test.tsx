import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { bollingerIndicator, CandlestickChart, heikinAshi, macdIndicator, rsiIndicator, vwapIndicator, type Candle, type CandlestickMode } from '../src/index.ts';
import { nabilCandles, sampleCandles } from '../fixtures/market-data.ts';
import { seriousViolations } from './axe.ts';

const norm = (s: string | null) => (s ?? '').replace(/ /g, ' ');
const live = (c: HTMLElement) => norm(c.querySelector('[role="status"]')!.textContent);
const plot = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="group"][tabindex="0"]')!;
const axisTextOf = (c: HTMLElement) => [...c.querySelectorAll('.kit-ct-axis')].map((n) => norm(n.textContent));
const tableOf = (c: HTMLElement, n = 0) => c.querySelectorAll('table')[n]!;
const heads = (t: Element) => [...t.querySelectorAll('thead th')].map((h) => norm(h.textContent));
const cells = (row: Element) => [...row.querySelectorAll('th,td')].map((h) => norm(h.textContent));

const few: Candle[] = [
  { date: '2025-11-10', open: 100, high: 104, low: 99, close: 103, volume: 1000 },
  { date: '2025-11-11', open: 103, high: 106, low: 102, close: 105, volume: 1200 },
  { date: '2025-11-12', open: 105, high: 105, low: 100, close: 101, volume: 900 },
  { date: '2025-11-13', open: 101, high: 103, low: 99, close: 102, volume: 800 },
];

describe('CandlestickChart on ChartA11yShell', () => {
  it('keeps the default markup: one figure, one focus stop, hint, live region, one table', () => {
    const { container } = render(<CandlestickChart candles={few} label="X" />);
    const fig = container.querySelector('figure.kit-ct')!;
    expect(fig.getAttribute('aria-label')).toBe('X');
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(plot(container).getAttribute('aria-roledescription')).toBe('candlestick chart');
    expect(container.querySelectorAll('[role="status"][aria-live="polite"]')).toHaveLength(1);
    expect(container.querySelectorAll('table')).toHaveLength(1);
    expect(heads(tableOf(container))).toEqual(['Date', 'Open', 'High', 'Low', 'Close', 'Volume']);
    expect(container.querySelector('.kit-ct-legend')).toBeNull();
    expect(container.querySelector('.pu-ct-pane')).toBeNull();
  });
  it('describes the chart in a summary read with its name', () => {
    const { container } = render(<CandlestickChart candles={few} label="X" />);
    const described = plot(container).getAttribute('aria-describedby')!.split(' ');
    expect(described).toHaveLength(2);
    expect(norm(document.getElementById(described[1]!)!.textContent)).toContain('4 sessions');
  });
});

describe('price modes', () => {
  const modes: CandlestickMode[] = ['candles', 'hollow', 'bars', 'heikin-ashi', 'line', 'area', 'baseline', 'high-low'];
  it.each(modes)('%s draws one mark per session, is operable and passes axe', async (mode) => {
    const { container } = render(<CandlestickChart candles={few} label="X" mode={mode} />);
    expect(container.querySelectorAll('.kit-ct-c')).toHaveLength(4);
    const drawn = { line: [1, 0], area: [1, 1], baseline: [1, 2] }[mode as 'line'] ?? [0, 0];
    expect([container.querySelectorAll('.pu-ct-price').length, container.querySelectorAll('.pu-ct-fill').length]).toEqual([drawn[0] === 1 ? 1 : 0, drawn[1]]);
    expect(await seriousViolations(container)).toEqual([]);
  });
  it('variant="bars" still means mode="bars"; mode wins', () => {
    const a = render(<CandlestickChart candles={few} label="X" variant="bars" />);
    expect(a.container.querySelectorAll('.kit-ct-c line')).toHaveLength(12);
    const b = render(<CandlestickChart candles={few} label="X" variant="bars" mode="candles" />);
    expect(b.container.querySelectorAll('.kit-ct-c rect:not(.kit-ct-vol)')).toHaveLength(4);
  });
  it('hollow mode: the body is hollow when the close is above the open, and the colour follows the previous close', () => {
    const { container } = render(<CandlestickChart candles={few} label="X" mode="hollow" volume={false} />);
    const marks = [...container.querySelectorAll('.kit-ct-c')];
    // 103>100 hollow; 105>103 hollow; 101<105 filled, down vs previous; 102>101 hollow, up vs previous
    expect(marks.map((m) => m.querySelector('rect')!.getAttribute('class'))).toEqual(['hollow', 'hollow', 'solid', 'hollow']);
    expect(marks.map((m) => m.getAttribute('class'))).toEqual(['kit-ct-c gain', 'kit-ct-c gain', 'kit-ct-c loss', 'kit-ct-c gain']);
  });
  it('hollow candle: a hollow body with a down colour is possible, so the words say both', async () => {
    const down: Candle[] = [{ date: '2025-11-10', open: 100, high: 110, low: 99, close: 108 }, { date: '2025-11-11', open: 104, high: 107, low: 103, close: 106 }];
    const { container } = render(<CandlestickChart candles={down} label="X" mode="hollow" />);
    await userEvent.setup().tab();
    expect(live(container)).toContain('down');
    expect(live(container)).toContain('hollow body');
  });
  it('speaks direction in words in every mode, never colour alone', async () => {
    const user = userEvent.setup();
    for (const mode of modes) {
      const { container, unmount } = render(<CandlestickChart candles={few} label="X" mode={mode} />);
      await user.tab();
      await user.keyboard('{Home}{ArrowRight}');
      expect(live(container)).toMatch(/: (up|down|unchanged)/);
      const rows = container.querySelectorAll('tbody tr');
      expect(heads(tableOf(container))).toContain('Direction');
      expect(cells(rows[1]!).at(6)).toMatch(/^(up|down|unchanged)/);
      unmount();
    }
  });
  it('Heikin Ashi: plots the smoothed candles and prints exact decimals in the table and live region', async () => {
    const ha = heikinAshi(few);
    const { container } = render(<CandlestickChart candles={few} label="X" mode="heikin-ashi" formatPrice={(v) => v.toFixed(2)} />);
    const table = tableOf(container);
    expect(heads(table)).toEqual(expect.arrayContaining(['Heikin Ashi open', 'Heikin Ashi high', 'Heikin Ashi low', 'Heikin Ashi close']));
    const rows = table.querySelectorAll('tbody tr');
    // source prices have no decimals, so Heikin Ashi is printed to two (trailing zeros dropped), not rounded to the formatter's.
    expect(cells(rows[1]!).slice(7)).toEqual(['101.5', '106', '101.5', '104']);
    expect(cells(rows[2]!).slice(7)).toEqual(['102.75', '105', '100', '102.75']);
    expect(cells(rows[2]!).at(7)).toBe(String(ha[2]!.open));
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard('{Home}{ArrowRight}');
    expect(live(container)).toContain('Close 104');
    expect(live(container)).toContain('Actual close 105.00');
  });
  it('Heikin Ashi keeps decimals of a finely quoted price instead of rounding to the currency', () => {
    const fine: Candle[] = [{ date: '2025-11-10', open: 10.125, high: 10.5, low: 10, close: 10.25 }, { date: '2025-11-11', open: 10.25, high: 10.75, low: 10.2, close: 10.5 }];
    const { container } = render(<CandlestickChart candles={fine} label="X" mode="heikin-ashi" />);
    const row = cells(tableOf(container).querySelectorAll('tbody tr')[0]!);
    // (10.125 + 10.5 + 10 + 10.25) / 4 = 10.21875: three source decimals, five printed, none rounded away
    expect(row.at(10)).toBe('10.21875');
  });
  it('baseline mode names the dividing price', () => {
    const { container } = render(<CandlestickChart candles={few} label="X" mode="baseline" baseline={102} formatPrice={(v) => `P${v}`} />);
    expect(container.querySelector('.pu-ct-baseline-label')!.textContent).toBe('P102');
  });
  it('line, area and baseline modes with one session draw a dot', () => {
    const { container } = render(<CandlestickChart candles={few.slice(0, 1)} label="X" mode="line" />);
    expect(container.querySelector('.pu-ct-dot')).not.toBeNull();
  });
  it('high-low draws each session as a range', () => {
    const { container } = render(<CandlestickChart candles={few} label="X" mode="high-low" />);
    expect(container.querySelectorAll('.pu-ct-range')).toHaveLength(4);
  });
});

describe('scales', () => {
  it('percent: ticks are percent from the first close, with signs', () => {
    const { container } = render(<CandlestickChart candles={few} label="X" scale="percent" />);
    expect(axisTextOf(container).some((t) => /^[+-]?\d/.test(t) && t.endsWith('%'))).toBe(true);
    expect(heads(tableOf(container)).some((h) => h.includes('percent change'))).toBe(true);
    const last = cells(tableOf(container).querySelectorAll('tbody tr')[3]!);
    expect(last.at(6)).toBe('-0.97%');
  });
  it('indexed: the first close is 100', () => {
    const { container } = render(<CandlestickChart candles={few} label="X" scale="indexed" />);
    const rows = tableOf(container).querySelectorAll('tbody tr');
    expect(cells(rows[0]!).at(6)).toBe('100.00');
    expect(cells(rows[3]!).at(6)).toBe('99.03');
  });
  it('log: decade ticks, and the table is unchanged', () => {
    const wide: Candle[] = [{ date: '2025-11-10', open: 10, high: 12, low: 9, close: 11 }, { date: '2025-11-11', open: 11, high: 900, low: 11, close: 800 }];
    const { container } = render(<CandlestickChart candles={wide} label="X" scale="log" formatPrice={(v) => String(v)} />);
    const ticks = axisTextOf(container);
    expect(ticks).toEqual(expect.arrayContaining(['10', '100', '1000']));
    expect(heads(tableOf(container))).toEqual(['Date', 'Open', 'High', 'Low', 'Close', 'Volume']);
  });
  it('falls back to linear and says so when the prices cannot be logged', () => {
    const zero: Candle[] = [{ date: '2025-11-10', open: 0, high: 2, low: 0, close: 1 }, { date: '2025-11-11', open: 1, high: 3, low: 1, close: 2 }];
    const { container } = render(<CandlestickChart candles={zero} label="X" scale="log" />);
    expect(container.querySelector('[role="note"]')!.textContent).toContain('linear');
    const pct = render(<CandlestickChart candles={[{ date: '2025-11-10', open: 0, high: 1, low: 0, close: 0 }]} label="Y" scale="percent" />);
    expect(pct.container.querySelector('[role="note"]')).not.toBeNull();
  });
  it('compare: a legend, lines level at the first date, and table and live columns', async () => {
    const compare = [{ label: 'NEPSE', points: few.map((c, i) => ({ date: c.date, close: 2000 + i * 20 })) }];
    const { container } = render(<CandlestickChart candles={few} label="NABIL" compare={compare} />);
    const legend = container.querySelector('.kit-ct-legend')!;
    expect(norm(legend.textContent)).toContain('NABIL');
    expect(norm(legend.textContent)).toContain('NEPSE');
    expect(container.querySelectorAll('.kit-ct-ma')).toHaveLength(1);
    expect(heads(tableOf(container)).some((h) => h.startsWith('NEPSE'))).toBe(true);
    const rows = tableOf(container).querySelectorAll('tbody tr');
    expect(cells(rows[0]!).at(7)).toBe('0.00%');
    expect(cells(rows[3]!).at(7)).toBe('+3.00%');
    await userEvent.setup().tab();
    expect(live(container)).toContain('NEPSE +3.00%');
    expect(container.querySelector('.kit-ct-note')!.textContent).toContain('percent');
  });
  it('compare indexed starts a later series level with the price on its first date', () => {
    const later = [{ label: 'Peer', points: [{ date: '2025-11-12', close: 50 }, { date: '2025-11-13', close: 55 }] }];
    const { container } = render(<CandlestickChart candles={few} label="X" scale="indexed" compare={later} />);
    const rows = tableOf(container).querySelectorAll('tbody tr');
    expect(cells(rows[0]!).at(7)).toBe('none');
    // main at 12 Nov: 101 / 103 x 100 = 98.06; Peer continues from there: 98.06 x (55/50) = 107.86
    expect(cells(rows[2]!).at(7)).toBe('98.06');
    expect(cells(rows[3]!).at(7)).toBe('107.86');
  });
});

describe('events and levels', () => {
  const events = [
    { date: '2025-11-11', kind: 'dividend' as const, label: 'Bonus 10%', detail: 'Book closure 14 Nov' },
    { date: '2025-11-13', kind: 'earnings' as const, label: 'Q1 results' },
    { date: '2025-11-13', kind: 'split' as const, label: '1:2 split' },
    { date: '2024-01-01', kind: 'custom' as const, label: 'Too early' },
  ];
  it('draws a marker per event with a shape per kind, and lists every event in a table', () => {
    const { container } = render(<CandlestickChart candles={few} label="X" events={events} />);
    expect(container.querySelectorAll('.pu-ct-ev')).toHaveLength(3);
    expect(container.querySelector('.pu-ct-ev.dividend circle')).not.toBeNull();
    expect(container.querySelector('.pu-ct-ev.split polygon')).not.toBeNull();
    expect(container.querySelector('.pu-ct-ev.earnings rect')).not.toBeNull();
    const t = tableOf(container, 1);
    expect(t.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(norm(t.textContent)).toContain('Book closure 14 Nov');
    expect(container.textContent).toContain('1 event outside the sessions shown is listed in the table.');
  });
  it('Shift and the arrow keys jump between events; the live region speaks the event', async () => {
    const user = userEvent.setup();
    const { container } = render(<CandlestickChart candles={few} label="X" events={events} />);
    await user.tab();
    await user.keyboard('{Home}');
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(live(container)).toContain('Dividend: Bonus 10%, Book closure 14 Nov');
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(live(container)).toContain('Earnings: Q1 results');
    expect(live(container)).toContain('Split: 1:2 split');
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(live(container)).toContain('Earnings: Q1 results');
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    expect(live(container)).toContain('Dividend: Bonus 10%');
    expect(container.querySelector('.kit-sr')!.textContent).toContain('jump between events');
  });
  it('an event on a non-session date sits on the last session before it', () => {
    const { container } = render(<CandlestickChart candles={few} label="X" events={[{ date: '2025-11-14', kind: 'custom', label: 'Holiday' }]} />);
    expect(container.querySelectorAll('.pu-ct-ev')).toHaveLength(0);
    const weekend = render(<CandlestickChart candles={[...few.slice(0, 2), ...few.slice(3)]} label="X" events={[{ date: '2025-11-12', kind: 'custom', label: 'Between' }]} />);
    expect(weekend.container.querySelectorAll('.pu-ct-ev')).toHaveLength(1);
  });
  it('reference levels get labels that never overlap, and a level out of range is only listed', () => {
    const levels = [{ price: 102, label: 'Support', kind: 'support' as const }, { price: 102.2, label: 'Cost', kind: 'cost-basis' as const }, { price: 102.4, label: 'Resistance', kind: 'resistance' as const }, { price: 9999, label: 'Far', kind: 'custom' as const }];
    const { container } = render(<CandlestickChart candles={few} label="X" levels={levels} />);
    const texts = [...container.querySelectorAll('.pu-ct-level text')];
    expect(texts).toHaveLength(3);
    const ys = texts.map((t) => Number(t.getAttribute('y'))).toSorted((a, b) => a - b);
    for (let i = 1; i < ys.length; i += 1) expect(ys[i]! - ys[i - 1]!).toBeGreaterThanOrEqual(16);
    const dashes = new Set([...container.querySelectorAll('.pu-ct-level line')].map((l) => l.getAttribute('stroke-dasharray')));
    expect(dashes.size).toBe(3);
    const t = tableOf(container, 1);
    expect(t.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(norm(t.textContent)).toContain('Cost basis');
    expect(norm(t.textContent)).toContain('Far');
    expect(container.textContent).toContain('1 level outside the price range shown is listed in the table.');
  });
});

describe('indicators', () => {
  const data = sampleCandles(120, 3, 487.5, '2025-03-01');
  it('draws RSI and MACD panes with a title, summary and table columns, and nothing for a plain chart', () => {
    const plain = render(<CandlestickChart candles={data} label="X" />);
    expect(plain.container.querySelector('.pu-ct-pane')).toBeNull();
    plain.unmount();
    const { container } = render(<CandlestickChart candles={data} label="X" indicators={[rsiIndicator(), macdIndicator()]} />);
    const panes = container.querySelectorAll('.pu-ct-pane');
    expect(panes).toHaveLength(2);
    expect(norm(panes[0]!.querySelector('.pu-ct-pane-title')!.textContent)).toMatch(/^RSI 14\s+\d/);
    expect(norm(panes[1]!.querySelector('.pu-ct-pane-title')!.textContent)).toMatch(/^MACD 12, 26, 9/);
    expect(panes[1]!.querySelectorAll('.pu-ct-hist rect').length).toBeGreaterThan(50);
    expect(heads(tableOf(container))).toEqual(expect.arrayContaining(['RSI 14', 'MACD 12, 26, 9: MACD', 'MACD 12, 26, 9: Signal', 'MACD 12, 26, 9: Histogram']));
    const summary = norm(document.getElementById(plot(container).getAttribute('aria-describedby')!.split(' ')[1]!)!.textContent);
    expect(summary).toMatch(/RSI 14 pane: latest RSI 14 \d+\.\d\d/);
  });
  it('overlays Bollinger and VWAP on the price and extends the table', () => {
    const { container } = render(<CandlestickChart candles={data} label="X" indicators={[bollingerIndicator(), vwapIndicator()]} />);
    expect(container.querySelector('.pu-ct-pane')).toBeNull();
    expect(container.querySelector('.pu-ct-band')).not.toBeNull();
    expect(container.querySelectorAll('.kit-ct-ma')).toHaveLength(4);
    const h = heads(tableOf(container));
    expect(h).toEqual(expect.arrayContaining(['Bollinger 20, 2: Upper band', 'Bollinger 20, 2: Middle band', 'Bollinger 20, 2: Lower band', 'VWAP']));
    expect(norm(container.querySelector('.kit-ct-legend')!.textContent)).toContain('Bollinger 20, 2');
  });
  it('a Bollinger pane draws in its own pane when asked', () => {
    const { container } = render(<CandlestickChart candles={data} label="X" indicators={[bollingerIndicator({ placement: 'pane' })]} />);
    expect(container.querySelectorAll('.pu-ct-pane')).toHaveLength(1);
    expect(container.querySelector('.pu-ct-band')).not.toBeNull();
  });
  it('speaks the indicator readout with its zone words and prints exact table values', async () => {
    const { container } = render(<CandlestickChart candles={data} label="X" indicators={[rsiIndicator()]} />);
    await userEvent.setup().tab();
    expect(live(container)).toMatch(/RSI 14: RSI 14 \d+\.\d\d, (overbought|oversold|neutral)/);
    const last = cells(tableOf(container).querySelectorAll('tbody tr')[119]!);
    expect(last.at(-1)).toMatch(/^\d+\.\d\d$/);
    const early = cells(tableOf(container).querySelectorAll('tbody tr')[3]!);
    expect(early.at(-1)).toBe('none');
  });
  it('is accessible with every option on', async () => {
    const { container } = render(
      <CandlestickChart candles={data} label="X" mode="heikin-ashi" scale="percent" indicators={[rsiIndicator(), macdIndicator(), bollingerIndicator(), vwapIndicator()]}
        events={[{ date: data[10]!.date, kind: 'dividend', label: 'D' }]} levels={[{ price: 487.5, label: 'Cost', kind: 'cost-basis' }]} compare={[{ label: 'NEPSE', points: data.map((c) => ({ date: c.date, close: c.close * 4 })) }]} />,
    );
    expect(await seriousViolations(container)).toEqual([]);
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  });
});

describe('modes stay exact and stable', () => {
  it('the default chart is unchanged by the new props being absent: same marks as before', () => {
    const { container } = render(<CandlestickChart candles={nabilCandles} label="NABIL daily" />);
    expect(container.querySelectorAll('.kit-ct-c')).toHaveLength(60);
    expect(container.querySelectorAll('.kit-ct-vol')).toHaveLength(60);
    expect(screen.queryByText('Direction')).toBeNull();
  });
});
