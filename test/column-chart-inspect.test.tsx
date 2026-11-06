import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ColumnChart, mirrorScaleTop } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const SERIES = [
  { key: 'bought', label: 'Bought', tone: 'gain' as const },
  { key: 'sold', label: 'Sold', tone: 'loss' as const },
];
const COLUMNS = [
  { key: 'a', label: 'Mon', values: [120, 80] },
  { key: 'b', label: 'Tue', values: [60, 90] },
  { key: 'c', label: 'Wed', values: [200, 0] },
];
const fmt = (v: number) => `Rs ${v}`;
const plot = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="group"][tabindex="0"]')!;
const live = (c: HTMLElement) => c.querySelector('[role="status"]')!.textContent;

describe('ColumnChart inspection', () => {
  it('arrow keys move the cursor, announce the column and show the readout; Home, End, Escape work', async () => {
    const user = userEvent.setup();
    const { container } = render(<ColumnChart label="Flow" series={SERIES} columns={COLUMNS} format={fmt} testId="cc" />);
    expect(live(container)).toBe('');
    await user.tab();
    expect(document.activeElement).toBe(plot(container));
    // Focus starts on the latest column.
    expect(live(container)).toBe('Wed: Bought Rs 200, Sold Rs 0, Total Rs 200');
    await user.keyboard('{ArrowLeft}');
    expect(live(container)).toBe('Tue: Bought Rs 60, Sold Rs 90, Total Rs 150');
    expect(within(screen.getByTestId('cc-tip')).getByText('Tue')).toBeTruthy();
    expect(container.querySelectorAll('.kit-col-c.lit')).toHaveLength(1);
    await user.keyboard('{Home}');
    expect(live(container)).toMatch(/^Mon:/);
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(live(container)).toMatch(/^Wed:/);
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
    expect(screen.queryByTestId('cc-tip')).toBeNull();
    expect(plot(container).getAttribute('aria-describedby')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('pointer hover shows the readout of the column under it, and leaving clears it', () => {
    const { container } = render(<ColumnChart label="Flow" series={SERIES} columns={COLUMNS} format={fmt} testId="cc" minSlots={3} />);
    const p = plot(container);
    p.getBoundingClientRect = () => ({ left: 0, top: 0, right: 300, bottom: 200, width: 300, height: 200, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerMove(p, { clientX: 150, clientY: 50 });
    const tip = screen.getByTestId('cc-tip');
    expect(within(tip).getByText('Tue')).toBeTruthy();
    expect(tip.textContent).toContain('Rs 90');
    fireEvent.pointerMove(p, { clientX: 20, clientY: 50 });
    expect(within(screen.getByTestId('cc-tip')).getByText('Mon')).toBeTruthy();
    fireEvent.pointerLeave(p);
    expect(screen.queryByTestId('cc-tip')).toBeNull();
  });

  it('mirror: scale is shared and round, no totals, net is read out, series 1 above and 2 below', async () => {
    expect(mirrorScaleTop(70)).toBe(80);
    expect(mirrorScaleTop(0)).toBe(1);
    const user = userEvent.setup();
    const { container } = render(
      <ColumnChart label="Flow" series={SERIES} columns={COLUMNS} format={fmt} mirror net={{ label: 'Net', format: (v) => `${v < 0 ? '-' : '+'}Rs ${Math.abs(v)}` }} testId="cc" />,
    );
    // Max magnitude 200 is itself a round top; the axis prints it on both sides, unsigned.
    const ticks = [...container.querySelectorAll('.kit-col-y-in span:not(.kit-col-y-w)')].map((s) => s.textContent);
    expect(ticks.toSorted()).toEqual(['0', 'Rs 100', 'Rs 100', 'Rs 200', 'Rs 200'].toSorted());
    expect(container.querySelectorAll('.kit-col-v')).toHaveLength(0);
    expect(container.querySelectorAll('.kit-col-up')).toHaveLength(3);
    expect(container.querySelectorAll('.kit-col-dn')).toHaveLength(2);
    const rows = within(screen.getByRole('table', { name: 'Flow' })).getAllByRole('row').map((r) => [...r.querySelectorAll('th,td')].map((c) => c.textContent));
    expect(rows[0]).toEqual(['Period', 'Bought', 'Sold', 'Net']);
    expect(rows[1]).toEqual(['Mon', 'Rs 120', 'Rs 80', '+Rs 40']);
    expect(rows[3]).toEqual(['Wed', 'Rs 200', 'none', '+Rs 200']);
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(live(container)).toBe('Tue: Bought Rs 60, Sold Rs 90, Net -Rs 30');
  });
});
