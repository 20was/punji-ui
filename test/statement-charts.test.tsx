import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { balanceRows, BalanceHistoryChart, earningsRows, EarningsChart, incomeStatementFlow, money, SankeyChart, sankeyModel } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const npr = (units: number) => money(BigInt(units) * 100n, 'NPR');
const flat = (t: string | null | undefined) => (t ?? '').replaceAll('\u00a0', ' ');
const live = (c: HTMLElement) => flat(c.querySelector('[role="status"]')!.textContent);
const text = (c: Element) => flat(c.textContent);
const tables = (c: HTMLElement) => [...c.querySelectorAll('table')].map((t) => [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((x) => x.textContent?.replaceAll('\u00a0', ' '))));
const m = (minor: bigint) => money(minor, 'NPR');
const heightOf = (id: string) => Number(screen.getByTestId(`s-${id}`).querySelector('rect.pu-sk-node')!.getAttribute('height'));
const widthOf = (px: number) => vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(px);

const statement = () =>
  incomeStatementFlow({
    revenue: [{ label: 'Sales', amount: npr(700) }, { label: 'Services', amount: npr(300) }],
    costOfRevenue: npr(400),
    operatingExpenses: [{ label: 'Staff', amount: npr(250) }, { label: 'Rent', amount: npr(100) }],
    tax: npr(50),
  });

describe('incomeStatementFlow and sankeyModel', () => {
  it('balances every node in bigint, past the float range', () => {
    const big = 9_007_199_254_740_993n;
    const flow = incomeStatementFlow({
      revenue: [{ label: 'A', amount: m(big) }, { label: 'B', amount: m(big + 2n) }],
      costOfRevenue: m(big),
      operatingExpenses: [{ label: 'Opex', amount: m(1n) }],
      tax: m(1n),
    });
    const model = sankeyModel(flow.nodes, flow.links, flow.base)!;
    const revenue = model.nodes.find((n) => n.node.id === 'revenue')!;
    expect(revenue.inSum).toBe(2n * big + 2n);
    expect(revenue.outSum).toBe(revenue.inSum);
    expect(flow.net).toBe(big);
    const net = model.nodes.find((n) => n.node.id === 'net-income')!;
    expect(net.value).toBe(big);
    expect(model.base.node.id).toBe('revenue');
  });

  it('sends a shortfall through a Net loss node that pays the costs revenue could not', () => {
    const flow = incomeStatementFlow({ revenue: [{ label: 'Sales', amount: npr(100) }], costOfRevenue: npr(70), operatingExpenses: [{ label: 'Staff', amount: npr(60) }], tax: npr(10) });
    expect(flow.net).toBe(-4000n);
    expect(flow.nodes.map((n) => n.id)).toEqual(['revenue', 'cost-of-revenue', 'expense-1', 'tax', 'net-loss']);
    expect(flow.links.map((l) => `${l.source}>${l.target}:${l.amount.minor}`)).toEqual(['revenue>cost-of-revenue:7000', 'revenue>expense-1:3000', 'net-loss>expense-1:3000', 'net-loss>tax:1000']);
    const model = sankeyModel(flow.nodes, flow.links, flow.base)!;
    expect(model.nodes.map((n) => n.value - (n.inSum > n.outSum ? n.inSum : n.outSum))).toEqual(model.nodes.map(() => 0n));
    expect(model.nodes.find((n) => n.node.id === 'revenue')!.outSum).toBe(10_000n);
    expect(model.nodes.find((n) => n.node.id === 'expense-1')!.inSum).toBe(6000n);
    expect(model.nodes.find((n) => n.node.id === 'net-loss')!.value).toBe(4000n);
  });

  it('refuses a cycle, a duplicate id, an unknown node, mixed currencies and a negative size', () => {
    const n = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    expect(() => sankeyModel(n, [{ source: 'a', target: 'b', amount: npr(1) }, { source: 'b', target: 'a', amount: npr(1) }])).toThrow(RangeError);
    expect(() => sankeyModel([...n, { id: 'a', label: 'again' }], [{ source: 'a', target: 'b', amount: npr(1) }])).toThrow(RangeError);
    expect(() => sankeyModel(n, [{ source: 'a', target: 'zzz', amount: npr(1) }])).toThrow(RangeError);
    expect(() => sankeyModel(n, [{ source: 'a', target: 'b', amount: npr(-1) }])).toThrow(RangeError);
    expect(() => sankeyModel(n, [{ source: 'a', target: 'b', amount: npr(1) }, { source: 'a', target: 'b', amount: money(1n, 'USD') }])).toThrow(TypeError);
  });
});

describe('SankeyChart', () => {
  it('draws node heights and link widths in proportion to the exact amounts', () => {
    const flow = statement();
    const { container } = render(<SankeyChart label="Income" nodes={flow.nodes} links={flow.links} base={flow.base} testId="s" />);
    expect(heightOf('cost-of-revenue') / heightOf('revenue')).toBeCloseTo(0.4, 2);
    expect(heightOf('expense-1') / heightOf('cost-of-revenue')).toBeCloseTo(250 / 400, 2);
    const widths = [...container.querySelectorAll('path.pu-sk-link')].map((p) => Number(p.getAttribute('stroke-width')));
    expect(widths.at(-1)! / widths[0]!).toBeGreaterThan(0);
    expect(container.querySelectorAll('path.pu-sk-link')).toHaveLength(flow.links.length);
  });

  it('prints amounts, shares of revenue and the table of items and flows', () => {
    const flow = statement();
    const { container } = render(<SankeyChart label="Income" nodes={flow.nodes} links={flow.links} base={flow.base} />);
    const [items, flows] = tables(container);
    expect(items).toContainEqual(['Revenue', 'NPR 1,000.00', '100.0%', '']);
    expect(items).toContainEqual(['Cost of revenue', 'NPR 400.00', '40.0%', '']);
    expect(items).toContainEqual(['Net income', '+NPR 200.00', '20.0%', 'Profit']);
    expect(flows).toContainEqual(['Revenue', 'Income tax', 'NPR 50.00', '5.0%']);
    expect(text(container)).toContain('Revenue NPR 1,000.00 is 100 percent.');
    expect(text(container)).toMatch(/Net income Profit .*200.*20\.0% of Revenue/);
  });

  it('marks a net loss with a minus sign, a triangle and the word', async () => {
    const user = userEvent.setup();
    const flow = incomeStatementFlow({ revenue: [{ label: 'Sales', amount: npr(100) }], costOfRevenue: npr(130) });
    const { container } = render(<SankeyChart label="Loss year" nodes={flow.nodes} links={flow.links} base={flow.base} testId="l" />);
    const [items] = tables(container);
    expect(items).toContainEqual(['Net loss', '−NPR 30.00', '30.0%', 'Loss']);
    expect(text(container)).toContain('▼ Loss');
    await user.tab();
    await user.keyboard('{Home}');
    expect(live(container)).toMatch(/^Sales|^Revenue|^Net loss/);
    for (let i = 0; i < 5; i++) {
      if (live(container).startsWith('Net loss')) break;
      await user.keyboard('{ArrowRight}');
    }
    expect(live(container)).toMatch(/^Net loss: minus .*30.*30\.0% of Revenue\. Loss\. to Cost of revenue/);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('moves a keyboard cursor through the items and reads where each came from and went', async () => {
    const user = userEvent.setup();
    const flow = statement();
    const { container } = render(<SankeyChart label="Income" nodes={flow.nodes} links={flow.links} base={flow.base} testId="k" />);
    await user.tab();
    expect(live(container)).toMatch(/^Net income: /);
    await user.keyboard('{Home}');
    const first = live(container);
    expect(first).toMatch(/^(Sales|Services): .* to Revenue/);
    await user.keyboard('{End}{ArrowLeft}{ArrowLeft}');
    expect(screen.getByTestId('k-tip')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
    expect(screen.queryByTestId('k-tip')).toBeNull();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('becomes a stacked list at 390px: every item as a row with its amount and share, no svg labels', async () => {
    widthOf(358);
    const flow = statement();
    const { container } = render(<SankeyChart label="Income" nodes={flow.nodes} links={flow.links} base={flow.base} testId="n" />);
    expect(container.querySelector('svg')).toBeNull();
    const group = [...container.querySelectorAll('.pu-sk-group')].find((g) => g.querySelector('.pu-sk-head')!.textContent!.startsWith('Revenue'))!;
    expect(text(group.querySelector('.pu-sk-head')!)).toMatch(/Revenue.*NPR 1,000\.00.*100\.0%/);
    const rows = [...group.querySelectorAll('.pu-sk-row')].map((r) => r.querySelector('.pu-sk-row-name')!.textContent);
    expect(rows).toEqual(['Cost of revenue', 'Staff', 'Rent', 'Income tax', 'Net income']);
    expect(text(group)).toContain('▲ +NPR 200.00');
    expect(text(group)).toContain('Profit');
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard('{End}');
    expect(container.querySelectorAll('.pu-sk-row.on').length).toBeGreaterThan(0);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('shows an empty message, a generic budget, and honours interactive=false', () => {
    const { container, rerender } = render(<SankeyChart label="x" nodes={[]} links={[]} />);
    expect(text(container)).toBe('No data');
    rerender(
      <SankeyChart
        label="Budget"
        interactive={false}
        nodes={[{ id: 'a', label: 'Pay' }, { id: 'b', label: 'Food', tone: 'series3' }, { id: 'c', label: 'Saved', tone: 'gain' }]}
        links={[{ source: 'a', target: 'b', amount: npr(30) }, { source: 'a', target: 'c', amount: npr(70) }]}
      />,
    );
    expect(container.querySelector('[tabindex]')).toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
  });
});

describe('EarningsChart', () => {
  const periods = [
    { key: 'a', label: 'Q1', estimate: '4.10', actual: '4.38' },
    { key: 'b', label: 'Q2', estimate: '4.35', actual: '4.30' },
    { key: 'c', label: 'Q3', estimate: '4.80', actual: '4.80' },
    { key: 'd', label: 'Q4', estimate: '5.05' },
  ];

  it('computes surprise and surprise percent exactly, with beat, miss, in line and upcoming', () => {
    const { rows, scale } = earningsRows(periods);
    expect(scale).toBe(2);
    expect(rows.map((r) => [r.outcome, r.surprise, r.surprisePercent])).toEqual([['beat', 28n, '6.8'], ['miss', -5n, '-1.1'], ['inline', 0n, '0.0'], ['upcoming', null, null]]);
  });

  it('is exact past 2^53 and rounds the percent half away from zero, once', () => {
    const { rows } = earningsRows([{ key: 'x', label: 'X', estimate: '9007199254740993.01', actual: '9007199254740994.02' }, { key: 'y', label: 'Y', estimate: '0.40', actual: '0.41' }, { key: 'z', label: 'Z', estimate: '-0.40', actual: '-0.45' }]);
    expect(rows[0]!.surprise).toBe(101n);
    expect(rows[1]!.surprisePercent).toBe('2.5');
    expect(rows[2]!.surprise).toBe(-5n);
    expect(rows[2]!.surprisePercent).toBe('-12.5');
  });

  it('prints the table with signed surprise, signed percent and the word', () => {
    const { container } = render(<EarningsChart label="EPS" periods={periods} currency="NPR" />);
    expect(tables(container)[0]).toEqual([
      ['Q1', 'NPR 4.10', 'NPR 4.38', '+NPR 0.28', '+6.8%', 'Beat'],
      ['Q2', 'NPR 4.35', 'NPR 4.30', '−NPR 0.05', '−1.1%', 'Miss'],
      ['Q3', 'NPR 4.80', 'NPR 4.80', 'NPR 0.00', '+0.0%', 'In line'],
      ['Q4', 'NPR 5.05', '', '', '', 'Upcoming'],
    ]);
  });

  it('speaks a summary and each period; the upcoming one has an estimate only', async () => {
    const user = userEvent.setup();
    const { container } = render(<EarningsChart label="EPS" periods={periods} currency="NPR" testId="e" />);
    expect(text(container)).toContain('Beat 1, missed 1, in line 1.');
    expect(text(container)).toContain('Next Q4: estimate NPR 5.05');
    await user.tab();
    expect(live(container)).toBe('Q4: Upcoming, estimate NPR 5.05, not yet reported');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(live(container)).toBe('Q2: actual NPR 4.30, estimate NPR 4.35, Miss by NPR 0.05, 1.1 percent');
    expect(text(screen.getByTestId('e-tip'))).toContain('▼ Miss −NPR 0.05, −1.1%');
    expect(container.querySelector('[data-testid="e-d"] .pu-ec-act')).toBeNull();
    expect(container.querySelector('[data-testid="e-d"] .pu-ec-next')).not.toBeNull();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('draws Money as bars with a hatched miss and the estimate as a tick', async () => {
    const { container } = render(
      <EarningsChart label="Revenue" measure="Revenue" variant="bars" periods={[{ key: 'a', label: 'Q1', estimate: npr(100), actual: npr(90) }, { key: 'b', label: 'Q2', estimate: npr(100), actual: npr(120) }]} testId="b" />,
    );
    expect(container.querySelectorAll('.pu-ec-tick')).toHaveLength(2);
    expect(container.querySelector('[data-testid="b-a"] .pu-mc-bar-hatch')).not.toBeNull();
    expect(container.querySelector('[data-testid="b-b"] .pu-mc-bar-hatch')).toBeNull();
    expect(tables(container)[0]![0]).toEqual(['Q1', 'NPR 100.00', 'NPR 90.00', '−NPR 10.00', '−10.0%', 'Miss']);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('refuses mixed kinds, a malformed decimal and shows an empty message', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => earningsRows([{ key: 'a', label: 'A', estimate: '1.00', actual: npr(1) }])).toThrow(TypeError);
    expect(() => earningsRows([{ key: 'a', label: 'A', estimate: '1,5' }])).toThrow(RangeError);
    expect(() => earningsRows([{ key: 'a', label: 'A', estimate: npr(1), actual: money(1n, 'USD') }])).toThrow(TypeError);
    quiet.mockRestore();
    const { container } = render(<EarningsChart label="EPS" periods={[]} />);
    expect(text(container)).toBe('No data');
  });
});

describe('BalanceHistoryChart', () => {
  const periods = [
    { key: 'a', label: 'FY24', debt: npr(600), equity: npr(400), cash: npr(100) },
    { key: 'b', label: 'FY25', debt: npr(500), equity: npr(800), cash: npr(150) },
    { key: 'c', label: 'FY26', debt: npr(300), equity: npr(-50), cash: npr(200) },
  ];

  it('computes debt to equity exactly, past 2^53, and says n/a for equity at or below zero', () => {
    const big = 9_007_199_254_740_993n;
    const rows = balanceRows([
      { key: 'x', label: 'X', debt: money(big, 'NPR'), equity: money(big * 2n, 'NPR') },
      { key: 'y', label: 'Y', debt: money(1n, 'NPR'), equity: money(3n, 'NPR') },
      { key: 'z', label: 'Z', debt: money(1n, 'NPR'), equity: money(0n, 'NPR') },
    ]);
    expect(rows.map((r) => r.ratio)).toEqual(['0.50', '0.33', null]);
  });

  it('lists debt, equity, cash and the ratio in the table', () => {
    const { container } = render(<BalanceHistoryChart label="Balance" periods={periods} />);
    expect(tables(container)[0]).toEqual([
      ['FY24', 'NPR 600.00', 'NPR 400.00', 'NPR 100.00', '1.50'],
      ['FY25', 'NPR 500.00', 'NPR 800.00', 'NPR 150.00', '0.63'],
      ['FY26', 'NPR 300.00', '−NPR 50.00', 'NPR 200.00', 'n/a, equity is not positive'],
    ]);
  });

  it('summarises the ratio trend, moves a cursor and speaks negative equity as minus', async () => {
    const user = userEvent.setup();
    const { container } = render(<BalanceHistoryChart label="Balance" periods={periods} testId="h" />);
    expect(text(container)).toContain('Debt to equity went from 1.50 to 0.63: falling.');
    await user.tab();
    expect(live(container)).toMatch(/^FY26: Debt .*300.*Equity minus .*50.*Cash .*200.*Debt to equity n\/a/);
    await user.keyboard('{Home}');
    expect(live(container)).toMatch(/^FY24: .*Debt to equity 1\.50$/);
    expect(text(screen.getByTestId('h-tip'))).toContain('1.50');
    expect(container.querySelector('.pu-bh-cash')).not.toBeNull();
    expect(container.querySelectorAll('.pu-bh-debt')).toHaveLength(3);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('works without cash, drops the ratio line where equity is not positive, and refuses mixed currencies', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<BalanceHistoryChart label="Balance" periods={periods.map(({ cash: _cash, ...p }) => p)} />);
    expect(container.querySelector('.pu-bh-cash')).toBeNull();
    expect(tables(container)[0]![0]).toHaveLength(4);
    expect(() => render(<BalanceHistoryChart label="x" periods={[{ key: 'a', label: 'A', debt: npr(1), equity: money(1n, 'USD') }]} />)).toThrow(TypeError);
    quiet.mockRestore();
    const empty = render(<BalanceHistoryChart label="Balance" periods={[]} />);
    expect(empty.container.textContent).toBe('No data');
  });
});
