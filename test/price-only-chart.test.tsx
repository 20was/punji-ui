import { fireEvent, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { BreadthChart, PriceOnlyChart, kagiType, lineBreakType, pointFigureType, rangeBarsType, renkoType, type PriceBar, type PriceOnlyType } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const norm = (s: string | null) => (s ?? '').replace(/[\u00a0\u202f]/g, ' '); // Intl uses no-break spaces
const live = (c: HTMLElement) => norm(c.querySelector('[role="status"]')!.textContent);
const plot = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="group"][tabindex="0"]')!;
const heads = (c: HTMLElement) => [...c.querySelectorAll('thead th')].map((h) => norm(h.textContent));
const rows = (c: HTMLElement) => [...c.querySelectorAll('tbody tr')].map((r) => [...r.querySelectorAll('th,td')].map((h) => norm(h.textContent)));

/** A deterministic wavy series of decimal-string bars. */
function wave(n: number, step = 3): PriceBar[] {
  return Array.from({ length: n }, (_, i) => {
    const close = 100 + 14 * Math.sin(i / 4) + i * 0.3;
    const day = new Date(Date.UTC(2025, 0, 1 + i));
    return { date: day.toISOString().slice(0, 10), open: (close - 1).toFixed(2), high: (close + step).toFixed(2), low: (close - step).toFixed(2), close: close.toFixed(2) };
  });
}

const TYPES: [string, PriceOnlyType, string, string][] = [
  ['renko', renkoType({ box: '2' }), 'Renko chart', 'Up brick'],
  ['kagi', kagiType({ reversal: '3' }), 'Kagi chart', 'Up line'],
  ['point-figure', pointFigureType({ box: '2', reversal: 3 }), 'point and figure chart', 'X column, rising'],
  ['line-break', lineBreakType(), 'line break chart', 'Up line'],
  ['range-bars', rangeBarsType({ range: '2' }), 'range bar chart', 'Up bar'],
];

describe('PriceOnlyChart', () => {
  it.each(TYPES)('%s: one figure, one focus stop, hint, summary, and a table of every element with its source dates', (_id, type, role, upWord) => {
    const { container } = render(<PriceOnlyChart label="X" bars={wave(60)} type={type} />);
    expect(container.querySelector('figure.kit-ct')!.getAttribute('aria-label')).toBe('X');
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(plot(container).getAttribute('aria-roledescription')).toBe(role);
    expect(container.querySelector('.kit-sr')!.textContent).toContain('arrow keys');
    const table = container.querySelector('table')!;
    expect(table.querySelector('caption')!.textContent).toBe('X');
    expect(heads(container).slice(0, 2)).toEqual(['Source dates', 'Direction']);
    const body = rows(container);
    expect(body.length).toBeGreaterThan(3);
    // Every row names its dates (one date or "a to b") and says its direction in words.
    for (const r of body) {
      expect(r[0]).toMatch(/^\d{4}-\d{2}-\d{2}( to \d{4}-\d{2}-\d{2})?$/);
      expect(r[1]).toMatch(/column|line|brick|bar/);
    }
    expect(body.some((r) => r[1] === upWord)).toBe(true);
    // The summary and the rule are read with the chart's name.
    expect([...container.querySelectorAll('p.kit-sr')].some((p) => (p.textContent ?? '').includes('Time is not drawn'))).toBe(true);
    expect([...container.querySelectorAll('.pu-po-note')].some((p) => (p.textContent ?? '').includes('Time is not drawn'))).toBe(true);
  });

  it('prints exact decimals in the table: 0.1 boxes do not drift', () => {
    const bars: PriceBar[] = [{ date: '2025-01-01', close: '0.10' }, { date: '2025-01-02', close: '0.40' }];
    const { container } = render(<PriceOnlyChart label="Penny" bars={bars} type={renkoType({ box: '0.1' })} />);
    expect(rows(container)).toEqual([
      ['2025-01-01 to 2025-01-02', 'Up brick', '0.10', '0.20'],
      ['2025-01-02', 'Up brick', '0.20', '0.30'],
      ['2025-01-02', 'Up brick', '0.30', '0.40'],
    ]);
  });

  it('draws up and down differently in shape, not only colour', () => {
    const { container } = render(<PriceOnlyChart label="X" bars={wave(60)} type={renkoType({ box: '8' })} />);
    expect(container.querySelectorAll('.pu-po-brick.up rect').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.pu-po-brick.down rect').length).toBeGreaterThan(0);
    const glyphs = [...container.querySelectorAll('.pu-po-brick text')].map((t) => t.textContent);
    expect(glyphs).toContain('▲');
    expect(glyphs).toContain('▼');
    const keys = [...container.querySelectorAll('.pu-po-keys li')].map((l) => l.textContent);
    expect(keys).toEqual(['Up brick, hollow', 'Down brick, solid']);
    const pf = render(<PriceOnlyChart label="PF" bars={wave(60)} type={pointFigureType({ box: '2' })} />).container;
    expect(pf.querySelectorAll('.pu-po-col.x path').length).toBeGreaterThan(0);
    expect(pf.querySelectorAll('.pu-po-col.o circle').length).toBeGreaterThan(0);
    const kagi = render(<PriceOnlyChart label="K" bars={wave(60)} type={kagiType({ reversal: '3' })} />).container;
    expect(kagi.querySelectorAll('.pu-po-kagi.yang').length).toBeGreaterThan(0);
    expect(kagi.querySelectorAll('.pu-po-kagi.yin').length).toBeGreaterThan(0);
  });

  it('moves a keyboard cursor across elements and speaks position, dates, direction and prices', async () => {
    const user = userEvent.setup();
    const { container } = render(<PriceOnlyChart label="X" bars={wave(60)} type={renkoType({ box: '2' })} />);
    const n = rows(container).length;
    await user.tab();
    expect(document.activeElement).toBe(plot(container));
    expect(live(container)).toMatch(new RegExp(`^${n} of ${n}, \\d{4}-\\d{2}-\\d{2}.*: (Up|Down) brick, Open [\\d.]+, Close [\\d.]+$`));
    await user.keyboard('{ArrowLeft}');
    expect(live(container)).toMatch(new RegExp(`^${n - 1} of ${n},`));
    await user.keyboard('{Home}');
    expect(live(container)).toMatch(new RegExp(`^1 of ${n},`));
    expect(container.querySelector('.kit-ct-tip')!.textContent).toContain('Dates');
    await user.keyboard('{End}');
    expect(live(container)).toMatch(new RegExp(`^${n} of ${n},`));
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
    expect(container.querySelector('.kit-ct-tip')).toBeNull();
  });

  it('shows the latest elements when they do not fit, says so, and the cursor still reaches the first', async () => {
    const user = userEvent.setup();
    const { container } = render(<PriceOnlyChart label="X" bars={wave(400, 5)} type={renkoType({ box: '0.5' })} />);
    const total = rows(container).length;
    const note = [...container.querySelectorAll('.pu-po-note')].map((p) => norm(p.textContent)).find((t) => t.startsWith('Showing'))!;
    const m = /^Showing (\d+) of (\d+)\./.exec(note)!;
    expect(Number(m[2])).toBe(total);
    expect(Number(m[1])).toBeLessThan(total);
    expect(container.querySelectorAll('.pu-po-brick')).toHaveLength(Number(m[1]));
    await user.tab();
    await user.keyboard('{Home}');
    expect(live(container)).toMatch(new RegExp(`^1 of ${total},`));
    expect(container.querySelector('.pu-po-lit')).not.toBeNull();
  });

  it('reads the element under the pointer', () => {
    const { container } = render(<PriceOnlyChart label="X" bars={wave(60)} type={kagiType({ reversal: '3' })} testId="po" />);
    const p = plot(container);
    p.getBoundingClientRect = () => ({ left: 0, top: 0, right: 640, bottom: 300, width: 640, height: 300, x: 0, y: 0, toJSON: () => '' });
    fireEvent.pointerMove(p, { clientX: 20, clientY: 40 });
    expect(container.querySelector('[data-testid="po-tip"]')!.textContent).toMatch(/Dates.*Start.*End.*Thickness/);
    fireEvent.pointerLeave(p);
    expect(container.querySelector('[data-testid="po-tip"]')).toBeNull();
  });

  it('says yang and yin in words, including a line that changes thickness', () => {
    const bars: PriceBar[] = ['100', '105', '102', '101', '97', '98', '110', '95'].map((close, i) => ({ date: `2025-11-0${i + 1}`, close }));
    const { container } = render(<PriceOnlyChart label="K" bars={bars} type={kagiType({ reversal: '4' })} />);
    expect(rows(container).map((r) => r[4]!)).toEqual(['Yin, thin', 'Yin, thin', 'Yin, thin, then yang, thick, from 105', 'Yang, thick, then yin, thin, from 97']);
  });

  it('takes labels for its words', () => {
    const { container } = render(<PriceOnlyChart label="X" bars={wave(60)} type={renkoType({ box: '2', labels: { up: 'Mathi', down: 'Tala' } })} labels={{ dates: 'Miti', direction: 'Disha' }} />);
    expect(heads(container).slice(0, 2)).toEqual(['Miti', 'Disha']);
    expect(rows(container).some((r) => r[1] === 'Mathi')).toBe(true);
  });

  it('prints an empty state, and the reason for bad input instead of throwing', () => {
    const flat: PriceBar[] = [{ date: '2025-01-01', close: '10' }, { date: '2025-01-02', close: '10' }];
    const a = render(<PriceOnlyChart label="Flat" bars={flat} type={renkoType({ box: '1' })} />).container;
    expect(a.textContent).toContain('Not enough price movement');
    expect(a.querySelector('[tabindex]')).toBeNull();
    const b = render(<PriceOnlyChart label="None" bars={[]} type={kagiType({ reversal: '1' })} />).container;
    expect(b.textContent).toContain('Not enough price movement');
    const c = render(<PriceOnlyChart label="Bad" bars={[{ date: '2025-01-01', close: 'abc' }]} type={renkoType({ box: '1' })} />).container;
    expect(c.textContent).toContain('Cannot draw this chart');
    expect(c.textContent).toContain('close must be a decimal string');
    const d = render(<PriceOnlyChart label="Box" bars={wave(5)} type={renkoType({ box: '0' })} />).container;
    expect(d.textContent).toContain('box must be above zero');
  });

  it('can switch off the focus stop for a parent that gives the same figures another way', () => {
    const { container } = render(<PriceOnlyChart label="X" bars={wave(60)} type={renkoType({ box: '2' })} interactive={false} />);
    expect(container.querySelector('[tabindex]')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
  });

  it.each(TYPES)('%s: has no serious axe violations', async (_id, type) => {
    const { container } = render(<PriceOnlyChart label="X" bars={wave(60)} type={type} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

const seriesOf = (seed: number) => Array.from({ length: 12 }, (_, i) => ({ date: `2025-03-${String(i + 1).padStart(2, "0")}`, close: (50 + Math.sin(i / 2 + seed) * 5 + i * 0.2).toFixed(2) }));

describe('BreadthChart', () => {
  const days = Array.from({ length: 30 }, (_, i) => ({ date: `2025-03-${String(i + 1).padStart(2, '0')}`, advances: 100 + ((i * 37) % 60), declines: 100 + ((i * 53) % 70), unchanged: 5 }));
  const group = Array.from({ length: 8 }, (_, k) => ({ id: `S${k}`, closes: seriesOf(k) }));

  it('advance-decline: line, table with net and a direction word, and a spoken summary', async () => {
    const user = userEvent.setup();
    const { container } = render(<BreadthChart mode="advance-decline" label="NEPSE A/D" days={days} />);
    expect(plot(container).getAttribute('aria-roledescription')).toBe('advance-decline line chart');
    expect(heads(container)).toEqual(['Date', 'Advances', 'Declines', 'Net', 'A/D line', 'Direction']);
    const body = rows(container);
    expect(body).toHaveLength(30);
    // Day 1: 100 advances, 100 declines: net 0, even. Day 2: 137 and 153: net -16.
    expect(body[0]).toEqual(['2025-03-01', '100', '100', '0', '0', 'Even']);
    expect(body[1]![3]).toBe('−16');
    expect(body[1]![5]).toBe('Declines led');
    expect(container.querySelector('.kit-sr:nth-of-type(2)')!.textContent).toContain('Advance-decline line over 30 days');
    await user.tab();
    expect(live(container)).toMatch(/^2025-03-30: Advances \d+, Declines \d+, Net [+−]?\d+, A\/D line [\d,−-]+, (Advances led|Declines led|Even)$/);
    await user.keyboard('{Home}');
    expect(live(container)).toMatch(/^2025-03-01: Advances 100, Declines 100, Net 0/);
    expect(container.querySelector('.pu-br-line')!.getAttribute('d')).toMatch(/^M/);
  });

  it('advance-decline: starts from a level and uses the MarketBreadth counts', () => {
    const { container } = render(<BreadthChart mode="advance-decline" label="A/D" days={[{ date: '2025-03-01', advances: 10, declines: 4 }]} start={1000} />);
    expect(rows(container)[0]).toEqual(['2025-03-01', '10', '4', '+6', '1,006', 'Advances led']);
  });

  it('percent-above-ma: shares as exact decimals with a reference line and words for the move', async () => {
    const user = userEvent.setup();
    const { container } = render(<BreadthChart mode="percent-above-ma" label="Above 5-day" constituents={group} period={5} />);
    expect(heads(container)).toEqual(['Date', 'Above', 'Of', 'Share above', 'Change', 'Direction']);
    const body = rows(container);
    expect(body).toHaveLength(12);
    expect(body[0]![3]).toBe('none');
    expect(body[3]![3]).toBe('none');
    expect(body[4]![2]).toBe('8');
    expect(body[4]![3]).toMatch(/^\d+\.\d%$/);
    expect(body[4]![5]).toBe('First day');
    expect(body.slice(5).every((r) => ['Up', 'Down', 'No change'].includes(r[5]!))).toBe(true);
    expect(container.querySelector('.pu-br-ref text')!.textContent).toBe('50%');
    await user.tab();
    expect(live(container)).toMatch(/^2025-03-12: \d+ of 8, Above 5-day average \d+\.\d%, (Up|Down|No change)$/);
  });

  it('prints an empty state or the reason, never throws', () => {
    expect(render(<BreadthChart mode="advance-decline" label="A" days={[]} />).container.textContent).toContain('No breadth data');
    expect(render(<BreadthChart mode="percent-above-ma" label="P" constituents={group} period={50} />).container.textContent).toContain('No breadth data');
    const bad = render(<BreadthChart mode="percent-above-ma" label="B" constituents={[{ id: 'Z', closes: [{ date: '2025-03-01', close: 'x' }] }]} period={2} />).container;
    expect(bad.textContent).toContain('Cannot draw this chart');
  });

  it.each([
    ['advance-decline', <BreadthChart key="a" mode="advance-decline" label="A/D" days={days} />],
    ['percent-above-ma', <BreadthChart key="p" mode="percent-above-ma" label="P" constituents={group} period={5} />],
  ] as const)('%s: has no serious axe violations', async (_m, el) => {
    const { container } = render(el);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
