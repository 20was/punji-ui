import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { smileGrid, VolatilitySmile, type SmileCurve } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const flat = (t: string | null | undefined) => (t ?? '').replaceAll(' ', ' ');
const live = () => flat(screen.getByRole('status').textContent);

const curves: SmileCurve[] = [
  { key: 'nov', label: '28 Nov', points: [{ x: '21500', iv: '24.50' }, { x: '22000', iv: '19.25' }, { x: '22500', iv: '21.10' }] },
  { key: 'dec', label: '26 Dec', points: [{ x: '21500', iv: '23.00' }, { x: '22500', iv: '20.00' }, { x: '23000', iv: '22.75' }] },
  { key: 'jan', label: '30 Jan', points: [{ x: '22000', iv: '21.00' }] },
];

describe('smileGrid', () => {
  it('lines every expiry up on the union of strikes, ascending, with exact scaled IVs', () => {
    const grid = smileGrid(curves);
    expect(grid.columns).toEqual([21500n, 22000n, 22500n, 23000n]);
    expect(grid.ivScale).toBe(2);
    expect(grid.rows[0]!.cells.map((c) => c.iv)).toEqual([2450n, 1925n, 2110n, null]);
    expect(grid.rows[1]!.cells.map((c) => c.iv)).toEqual([2300n, null, 2000n, 2275n]);
    expect(grid.min).toBe(1925n);
    expect(grid.max).toBe(2450n);
  });

  it('shades by where an IV sits between the lowest and highest: band 1 low to 4 high, 0 for no quote', () => {
    const grid = smileGrid(curves);
    expect(grid.rows[0]!.cells.map((c) => c.band)).toEqual([4, 1, 2, 0]);
    expect(smileGrid([{ key: 'a', label: 'A', points: [{ x: '1', iv: '20' }, { x: '2', iv: '20' }] }]).rows[0]!.cells.map((c) => c.band)).toEqual([2, 2]);
  });

  it('reads decimals exactly, including fractional strikes and deltas', () => {
    const grid = smileGrid([{ key: 'd', label: 'D', points: [{ x: '0.25', iv: '18.125' }, { x: '0.5', iv: '16' }] }]);
    expect(grid.xScale).toBe(2);
    expect(grid.ivScale).toBe(3);
    expect(grid.columns).toEqual([25n, 50n]);
    expect(grid.rows[0]!.cells.map((c) => c.iv)).toEqual([18125n, 16000n]);
  });

  it('rejects a malformed number, a negative IV and a repeated x within a curve', () => {
    expect(() => smileGrid([{ key: 'a', label: 'A', points: [{ x: '1e3', iv: '20' }] }])).toThrow(RangeError);
    expect(() => smileGrid([{ key: 'a', label: 'A', points: [{ x: '10', iv: '-1' }] }])).toThrow(/volatility/);
    expect(() => smileGrid([{ key: 'a', label: 'A', points: [{ x: '10', iv: '1' }, { x: '10.0', iv: '2' }] }])).toThrow(/two quotes/);
  });
});

describe('VolatilitySmile', () => {
  it('prints the IV grid as a real table with every value, in order, and "no quote" for a gap', () => {
    render(<VolatilitySmile label="NIFTY smile" curves={curves} />);
    const region = screen.getByRole('region', { name: /NIFTY smile/ });
    expect(region.tabIndex).toBe(0);
    const table = within(region).getByRole('table');
    expect([...table.querySelectorAll('thead th')].map((h) => flat(h.textContent))).toEqual(['Expiry', '21,500', '22,000', '22,500', '23,000']);
    const rows = [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => flat(c.textContent)));
    expect(rows[0]).toEqual(['28 Nov', '24.50%', '19.25%', '21.10%', 'no quote']);
    expect(rows[1]).toEqual(['26 Dec', '23.00%', 'no quote', '20.00%', '22.75%']);
    expect(rows[2]).toEqual(['30 Jan', 'no quote', '21.00%', 'no quote', 'no quote']);
    expect(table.querySelectorAll('tbody th[scope="row"]').length).toBe(3);
    expect(table.querySelectorAll('thead th[scope="col"]').length).toBe(5);
    // The shade only repeats the number.
    expect(table.querySelectorAll('td[data-band="4"]').length).toBe(1);
    expect(table.querySelectorAll('td[data-empty]').length).toBe(5);
  });

  it('tells the expiries apart by marker shape and dash as well as hue, and names each line', () => {
    const { container } = render(<VolatilitySmile label="Smile" curves={curves} testId="s" />);
    const dashes = [...container.querySelectorAll('.pu-vs-c .pu-vs-curve')].map((p) => p.getAttribute('stroke-dasharray'));
    expect(dashes).toEqual([null, '7 4', '2 3']);
    const shapes = ['circle', 'rect', 'path'].map((tag) => container.querySelectorAll(`.pu-vs-c ${tag}.pu-vs-mark`).length);
    expect(shapes[0]).toBeGreaterThan(0);
    expect(shapes[1]).toBeGreaterThan(0);
    expect(shapes[2]).toBeGreaterThan(0);
    expect([...container.querySelectorAll('.pu-vs-end')].map((t) => t.textContent)).toEqual(['28 Nov', '26 Dec', '30 Jan']);
    expect(container.querySelector('.pu-vs-legend')?.textContent).toContain('28 Nov');
  });

  it('moves a keyboard cursor through the strikes and speaks every expiry exactly', () => {
    render(<VolatilitySmile label="Smile" curves={curves} />);
    const plot = screen.getByRole('group', { name: 'Smile' });
    expect(plot.getAttribute('aria-roledescription')).toBe('volatility smile chart');
    act(() => plot.focus());
    expect(live()).toBe('Strike 23,000: 28 Nov no quote, 26 Dec 22.75 percent, 30 Jan no quote');
    fireEvent.keyDown(plot, { key: 'Home' });
    expect(live()).toBe('Strike 21,500: 28 Nov 24.50 percent, 26 Dec 23.00 percent, 30 Jan no quote');
    fireEvent.keyDown(plot, { key: 'ArrowRight' });
    expect(live()).toContain('Strike 22,000: 28 Nov 19.25 percent');
    fireEvent.keyDown(plot, { key: 'Escape' });
    expect(live()).toBe('');
  });

  it('describes the whole chart in its summary', () => {
    render(<VolatilitySmile label="Smile" curves={curves} />);
    const plot = screen.getByRole('group', { name: 'Smile' });
    const summary = document.getElementById(plot.getAttribute('aria-describedby')!.split(' ')[1]!)!;
    expect(flat(summary.textContent)).toBe('Smile: implied volatility for 3 expiries across 4 strike values, from 19.25 percent to 24.50 percent. Each strike is listed with every expiry\'s value.');
  });

  it('draws a reference rule at the spot and names it', () => {
    const { container } = render(<VolatilitySmile label="Smile" curves={curves} reference={{ x: '22140', label: 'Spot' }} />);
    expect(container.querySelector('.pu-vs-ref text')?.textContent).toBe('Spot');
    expect(() => render(<VolatilitySmile label="Bad" curves={curves} reference={{ x: 'abc', label: 'Spot' }} />)).toThrow(RangeError);
  });

  it('works by delta or moneyness and renames the axis and the table', () => {
    const delta: SmileCurve[] = [{ key: 'a', label: '1M', points: [{ x: '0.10', iv: '25.5' }, { x: '0.50', iv: '18' }, { x: '0.90', iv: '22.25' }] }];
    render(<VolatilitySmile label="By delta" curves={delta} xKind="delta" />);
    const table = screen.getByRole('table');
    expect(flat(table.querySelector('caption')!.textContent)).toBe('By delta, implied volatility by expiry and delta');
    expect([...table.querySelectorAll('thead th')].map((h) => flat(h.textContent))).toEqual(['Expiry', '0.10', '0.50', '0.90']);
    expect(flat(table.querySelector('tbody')!.textContent)).toContain('25.50%');
    expect(flat(table.querySelector('tbody')!.textContent)).toContain('22.25%');
  });

  it('keeps a hidden data table when the visible grid is turned off', () => {
    render(<VolatilitySmile label="No grid" curves={curves} grid={false} />);
    expect(screen.queryByRole('region')).toBeNull();
    const table = screen.getByRole('table', { name: /No grid/ });
    expect(flat(table.textContent)).toContain('24.50%');
    expect(table.closest('.kit-sr')).not.toBeNull();
  });

  it('prints an empty state', () => {
    render(<VolatilitySmile label="Empty" curves={[]} />);
    expect(screen.getByText('No data')).toBeTruthy();
  });

  it('replaces words through labels', () => {
    render(<VolatilitySmile label="Smile" curves={curves} labels={{ noQuote: 'ko bhaau chhaina', expiry: 'Miti', strike: 'Strike (NPR)' }} />);
    expect(screen.getAllByText('ko bhaau chhaina').length).toBe(5);
    expect(screen.getByText('Miti')).toBeTruthy();
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<VolatilitySmile label="Axe" curves={curves} reference={{ x: '22140', label: 'Spot' }} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
