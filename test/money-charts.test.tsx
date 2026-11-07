import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CashFlowChart,
  ChartA11yShell,
  ChartDataTable,
  filterByRange,
  money,
  NetWorthChart,
  RangeSelector,
  rangeStart,
  WaterfallChart,
  waterfallRows,
  type ChartRange,
} from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const npr = (units: number) => money(BigInt(units) * 100n, 'NPR');
const live = (c: HTMLElement) => c.querySelector('[role="status"]')!.textContent;
const plot = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="group"][tabindex="0"]')!;
const cells = (c: HTMLElement) => [...c.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((x) => x.textContent?.replaceAll(' ', ' ')));

describe('ChartA11yShell', () => {
  it('wraps any renderer: focus stop, keyboard cursor, live region, summary and hidden table', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ChartA11yShell
        label="Custom"
        roleDescription="custom chart"
        count={3}
        speak={(i) => `Point ${i + 1}`}
        summary="Three points"
        table={<ChartDataTable caption="Custom" head={['N', 'V']} rows={[0, 1, 2].map((i) => ({ key: String(i), head: `P${i}`, cells: [String(i * 10)] }))} />}
        testId="s"
      >
        {({ index, plotProps }) => (
          <div {...plotProps()} data-index={String(index)}>
            <canvas aria-hidden="true" />
          </div>
        )}
      </ChartA11yShell>,
    );
    const p = plot(container);
    expect(p.getAttribute('aria-roledescription')).toBe('custom chart');
    expect(p.getAttribute('aria-describedby')?.split(' ')).toHaveLength(2);
    expect(live(container)).toBe('');
    await user.tab();
    expect(live(container)).toBe('Point 3');
    await user.keyboard('{Home}');
    expect(live(container)).toBe('Point 1');
    expect(p.dataset.index).toBe('0');
    await user.keyboard('{End}{ArrowLeft}');
    expect(live(container)).toBe('Point 2');
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
    expect(container.textContent).toContain('Three points');
    expect(cells(container)).toEqual([['P0', '0'], ['P1', '10'], ['P2', '20']]);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('is inert when not interactive: no tab stop, no live region, still a table', () => {
    const { container } = render(
      <ChartA11yShell label="Quiet" roleDescription="chart" count={2} speak={() => ''} interactive={false} table={<ChartDataTable caption="Quiet" head={['A']} rows={[]} />}>
        {({ plotProps }) => <div {...plotProps()} />}
      </ChartA11yShell>,
    );
    expect(container.querySelector('[tabindex]')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
  });
});

describe('WaterfallChart', () => {
  const steps = [
    { key: 'open', label: 'Opening', amount: npr(1000), total: true },
    { key: 'rev', label: 'Revenue', amount: npr(500) },
    { key: 'tax', label: 'Tax', amount: npr(-200) },
    { key: 'close', label: 'Closing', amount: npr(0), total: true },
  ];

  it('sums running totals exactly in bigint, past the float range', () => {
    const huge = money(9_007_199_254_740_993n, 'NPR');
    const rows = waterfallRows([{ key: 'a', label: 'A', amount: huge }, { key: 'b', label: 'B', amount: money(1n, 'NPR') }, { key: 't', label: 'T', amount: money(0n, 'NPR'), total: true }]);
    expect(rows.map((r) => r.to)).toEqual([9_007_199_254_740_993n, 9_007_199_254_740_994n, 9_007_199_254_740_994n]);
  });

  it('prints the data table with signed changes, running totals and a direction word', () => {
    const { container } = render(<WaterfallChart label="Bridge" steps={steps} testId="w" />);
    expect(cells(container)).toEqual([
      ['Opening', 'NPR 1,000.00', 'NPR 1,000.00', 'Total'],
      ['Revenue', '+NPR 500.00', 'NPR 1,500.00', 'Increase'],
      ['Tax', '−NPR 200.00', 'NPR 1,300.00', 'Decrease'],
      ['Closing', 'NPR 1,300.00', 'NPR 1,300.00', 'Total'],
    ]);
    expect(container.querySelector('table caption')?.textContent).toBe('Bridge');
  });

  it('speaks a summary and each step with its direction word, not a colour', async () => {
    const user = userEvent.setup();
    const { container } = render(<WaterfallChart label="Bridge" steps={steps.slice(1)} testId="w" />);
    expect(container.textContent).toContain('Waterfall of 3 steps');
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(live(container)).toMatch(/^Tax: Decrease .*200.*, running total .*300/);
    await user.keyboard('{ArrowLeft}');
    expect(live(container)).toMatch(/^Revenue: Increase .*500/);
    expect(screen.getByTestId('w-tip').textContent).toContain('▲');
    expect(container.querySelector('[data-testid="w-tax"] .pu-mc-bar-hatch')).not.toBeNull();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('shows an empty message, and refuses mixed currencies', () => {
    const { container } = render(<WaterfallChart label="Bridge" steps={[]} />);
    expect(container.textContent).toBe('No data');
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<WaterfallChart label="x" steps={[{ key: 'a', label: 'A', amount: npr(1) }, { key: 'b', label: 'B', amount: money(1n, 'USD') }]} />)).toThrow(TypeError);
    quiet.mockRestore();
  });
});

describe('CashFlowChart', () => {
  const periods = [
    { key: 'p1', label: 'Mangsir', inflow: npr(900), outflow: npr(400) },
    { key: 'p2', label: 'Poush', inflow: npr(300), outflow: npr(700) },
  ];

  it('computes net as in minus out, with a Surplus or Deficit word in the table', () => {
    const { container } = render(<CashFlowChart label="Cash flow" periods={periods} />);
    expect(cells(container)).toEqual([
      ['Mangsir', 'NPR 900.00', 'NPR 400.00', '+NPR 500.00', 'Surplus'],
      ['Poush', 'NPR 300.00', 'NPR 700.00', '−NPR 400.00', 'Deficit'],
    ]);
  });

  it('moves a keyboard cursor and speaks in, out and net', async () => {
    const user = userEvent.setup();
    const { container } = render(<CashFlowChart label="Cash flow" periods={periods} testId="c" />);
    expect(container.textContent).toMatch(/Cash flow over 2 periods/);
    await user.tab();
    expect(live(container)).toMatch(/^Poush: Money in .*300.*Money out .*700.*Net .*400.*, Deficit$/);
    await user.keyboard('{Home}');
    expect(live(container)).toMatch(/^Mangsir: .*Surplus$/);
    expect(screen.getByTestId('c-tip').textContent).toContain('Surplus');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('reads a pointer position', () => {
    const { container } = render(<CashFlowChart label="Cash flow" periods={periods} testId="c" />);
    const p = plot(container);
    p.getBoundingClientRect = () => ({ left: 0, top: 0, right: 646, bottom: 200, width: 646, height: 200, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerMove(p, { clientX: 500, clientY: 40 });
    expect(within(screen.getByTestId('c-tip')).getByText('Poush')).toBeTruthy();
    fireEvent.pointerLeave(p);
    expect(screen.queryByTestId('c-tip')).toBeNull();
  });
});

describe('NetWorthChart', () => {
  const points = [
    { key: 'a', label: 'Jan', assets: npr(1000), liabilities: npr(400) },
    { key: 'b', label: 'Feb', assets: npr(1100), liabilities: npr(1300) },
    { key: 'c', label: 'Mar', assets: npr(1500), liabilities: npr(500) },
  ];

  it('lists assets, liabilities and a signed net in the table', () => {
    const { container } = render(<NetWorthChart label="Net worth" points={points} />);
    expect(cells(container)).toEqual([
      ['Jan', 'NPR 1,000.00', 'NPR 400.00', '+NPR 600.00'],
      ['Feb', 'NPR 1,100.00', 'NPR 1,300.00', '−NPR 200.00'],
      ['Mar', 'NPR 1,500.00', 'NPR 500.00', '+NPR 1,000.00'],
    ]);
  });

  it('summarises the change, speaks a negative net with the word minus, and is axe clean', async () => {
    const user = userEvent.setup();
    const { container } = render(<NetWorthChart label="Net worth" points={points} testId="n" />);
    expect(container.textContent).toMatch(/Rising change/);
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(live(container)).toMatch(/^Feb: Assets .*Liabilities .*Net worth minus .*200/);
    expect(container.querySelector('.pu-mc-area.liabilities')).not.toBeNull();
    expect(container.querySelector('.pu-mc-bar-hatch')).not.toBeNull();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('draws one point as a block', () => {
    const { container } = render(<NetWorthChart label="Net worth" points={points.slice(0, 1)} />);
    expect(container.querySelectorAll('rect.pu-mc-area').length).toBe(2);
  });
});

describe('RangeSelector', () => {
  it('is a labelled group of six options, each with a spoken name, and picks with click and arrows', async () => {
    const user = userEvent.setup();
    const seen: ChartRange[] = [];
    const { container } = render(<RangeSelector value="1M" onChange={(r) => seen.push(r)} testId="r" />);
    const group = screen.getByRole('group', { name: 'Chart range' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['1D1 day', '1W1 week', '1M1 month', 'YTDYear to date', '1Y1 year', 'AllAll time']);
    expect(within(group).getByRole('button', { name: '1 month' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(within(group).getByRole('button', { name: 'Year to date' }));
    expect(seen).toEqual(['YTD']);
    within(group).getByRole('button', { name: '1 month' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(seen.at(-1)).toBe('YTD');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('computes range starts in UTC with month-end clamping', () => {
    expect(rangeStart('1D', '2026-03-01')).toBe('2026-02-28');
    expect(rangeStart('1W', '2026-03-05')).toBe('2026-02-26');
    expect(rangeStart('1M', '2026-03-31')).toBe('2026-02-28');
    expect(rangeStart('1M', '2026-01-15')).toBe('2025-12-15');
    expect(rangeStart('YTD', '2026-11-07')).toBe('2026-01-01');
    expect(rangeStart('1Y', '2024-02-29')).toBe('2023-02-28');
    expect(rangeStart('All', '2026-11-07')).toBeNull();
    expect(rangeStart('1M', 'not a date')).toBeNull();
  });

  it('cuts points to the range ending at the latest date', () => {
    const pts = ['2025-10-01', '2026-01-10', '2026-10-20', '2026-11-05', '2026-11-07'].map((date) => ({ date }));
    const dates = (r: ChartRange) => filterByRange(pts, (p) => p.date, r).map((p) => p.date);
    expect(dates('All')).toHaveLength(5);
    expect(dates('1W')).toEqual(['2026-11-05', '2026-11-07']);
    expect(dates('YTD')).toEqual(['2026-01-10', '2026-10-20', '2026-11-05', '2026-11-07']);
    expect(dates('1Y')).toEqual(['2026-01-10', '2026-10-20', '2026-11-05', '2026-11-07']);
    expect(filterByRange(pts, (p) => p.date, '1D', '2026-11-05').map((p) => p.date)).toEqual(['2026-11-05']);
  });
});
