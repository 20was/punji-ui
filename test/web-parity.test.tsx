import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Button, Card, CompanySearch, DataRow, DataRows, ListFilter, OrderBook, OrderBookDepth, StatusPill, compactRs } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const LABELS = {
  buyQty: 'Buy quantity',
  bid: 'Bid',
  ask: 'Ask',
  sellQty: 'Sell quantity',
  caption: 'Order book for NABIL',
  buyTotal: (pct: string, qty: string) => `Buy ${pct} · ${qty}`,
  sellTotal: (pct: string, qty: string) => `Sell ${pct} · ${qty}`,
};
const SYMBOLS = [
  { symbol: 'NABIL', name: 'Nabil Bank', sector: 'Banks' },
  { symbol: 'NICA', name: 'NIC Asia Bank', sector: 'Banks' },
];

describe('Card eyebrow and size', () => {
  it('draws the eyebrow above the title and marks the large size', async () => {
    const { container } = render(
      <Card title="Banks" eyebrow="Selected sector" size="lg">
        <p>Body</p>
      </Card>,
    );
    const eyebrow = container.querySelector('.kit-card-t > p.kit-card-eyebrow');
    expect(eyebrow?.textContent).toBe('Selected sector');
    expect(eyebrow?.nextElementSibling?.tagName).toBe('H2');
    expect(container.querySelector('section.kit-card')?.classList.contains('kit-card-lg')).toBe(true);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('adds nothing without them', () => {
    const { container } = render(<Card title="Banks">x</Card>);
    expect(container.querySelector('.kit-card-eyebrow')).toBeNull();
    expect(container.querySelector('.kit-card-lg')).toBeNull();
  });
});

describe('ListFilter name and selectOnFocus', () => {
  it('names the input for a plain GET form', () => {
    render(<ListFilter value="" onChange={() => {}} label="Search" clear="Clear" testId="lf" name="q" />);
    expect(screen.getByRole('searchbox').getAttribute('name')).toBe('q');
  });

  it('selects what is there on focus only when asked', async () => {
    render(
      <>
        <ListFilter value="NABIL" onChange={() => {}} label="Select" clear="Clear" testId="lf" selectOnFocus />
        <ListFilter value="NICA" onChange={() => {}} label="Plain" clear="Clear" testId="lf" />
      </>,
    );
    const on = screen.getByRole('searchbox', { name: 'Select' }) as HTMLInputElement;
    const off = screen.getByRole('searchbox', { name: 'Plain' }) as HTMLInputElement;
    await userEvent.click(on);
    expect([on.selectionStart, on.selectionEnd]).toEqual([0, 5]);
    await userEvent.click(off);
    expect(off.selectionStart).toBe(off.selectionEnd);
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<ListFilter value="a" onChange={() => {}} label="Search" clear="Clear" testId="lf" name="q" selectOnFocus />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('DataRow bar and note', () => {
  it('puts the bar and note as full-width dd rows and flags the row', async () => {
    const { container } = render(
      <DataRows label="Facts">
        <DataRow label="52-week" value="547.00" bar={<span data-testid="bar" />} note="sits 71% of the way up" />
        <DataRow label="Plain" value="1" />
      </DataRows>,
    );
    const [first, second] = Array.from(container.querySelectorAll('.kit-data-row'));
    expect(first?.classList.contains('has-bar')).toBe(true);
    expect(first?.querySelector('dd.kit-data-bar [data-testid="bar"]')).not.toBeNull();
    expect(first?.querySelector('dd.kit-data-note')?.textContent).toBe('sits 71% of the way up');
    expect(second?.classList.contains('has-bar')).toBe(false);
    expect(second?.querySelectorAll('dd')).toHaveLength(1);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('a note alone also flags the row', () => {
    const { container } = render(
      <DataRows>
        <DataRow label="a" value="b" note="n" />
      </DataRows>,
    );
    expect(container.querySelector('.kit-data-row.has-bar')).not.toBeNull();
    expect(container.querySelector('.kit-data-bar')).toBeNull();
  });
});

describe('StatusPill info tone', () => {
  it('renders the info tone class', async () => {
    const { container } = render(<StatusPill tone="info">Catching up</StatusPill>);
    expect(container.querySelector('.kit-pill.info')?.textContent).toBe('Catching up');
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('Button external links', () => {
  it('opens an absolute URL in a new tab with rel noopener noreferrer, never via the link component', () => {
    render(
      <Button href="https://example.com/x" variant="secondary" linkComponent={({ children, ...r }) => <a data-router="yes" {...r}>{children}</a>}>
        Away
      </Button>,
    );
    const a = screen.getByRole('link', { name: 'Away' });
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('data-router')).toBeNull();
  });

  it('keeps an in-app path in the same tab', () => {
    render(<Button href="/docs">Docs</Button>);
    const a = screen.getByRole('link', { name: 'Docs' });
    expect(a.getAttribute('target')).toBeNull();
    expect(a.getAttribute('rel')).toBeNull();
  });
});

describe('CompanySearch clearOnOpen', () => {
  it('empties the field after a pick by default and with clearOnOpen', async () => {
    render(<CompanySearch options={SYMBOLS} label="Add" placeholder="Symbol" testId="cs" optionTestId="cs-opt" onOpen={() => {}} none={(q) => q} clearOnOpen />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.type(input, 'nab');
    await userEvent.keyboard('{Enter}');
    expect(input.value).toBe('');
  });

  it('keeps the typed query in a finder when clearOnOpen is false', async () => {
    const opened: string[] = [];
    render(<CompanySearch options={SYMBOLS} label="Find" placeholder="Symbol" testId="cs" optionTestId="cs-opt" onOpen={(s) => opened.push(s)} none={(q) => q} clearOnOpen={false} />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await userEvent.type(input, 'nab');
    await userEvent.keyboard('{Enter}');
    expect(opened).toEqual(['NABIL']);
    expect(input.value).toBe('nab');
  });

  it('a picker always closes on a pick', async () => {
    const { container } = render(<CompanySearch options={SYMBOLS} label="Pick" placeholder="Symbol" testId="cs" optionTestId="cs-opt" value="NABIL" onOpen={() => {}} none={(q) => q} clearOnOpen={false} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.keyboard('nic{Enter}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('compactRs prefix', () => {
  const units = { lakh: 'L', crore: 'Cr', arba: 'Arba' };
  it('defaults to Rs', () => {
    expect(compactRs(12_400_000, units).short).toBe('Rs 1.24 Cr');
  });
  it('takes the reader-language mark', () => {
    const r = compactRs(-12_400_000, { lakh: 'लाख', crore: 'करोड', arba: 'अर्ब' }, 1e7, 'रु.');
    expect(r.short).toBe('−रु. 1.24 करोड');
    expect(r.full).toBe('−रु. 1,24,00,000');
    expect(compactRs(5000, units, 1e7, 'रु.').short).toBe('रु. 5,000');
  });
});

describe('OrderBookDepth (the web depth view) beside OrderBook (the plain table)', () => {
  const bids = [{ price: 546.9, quantity: 1840 }, { price: 546.5, quantity: 920 }];
  const asks = [{ price: 547, quantity: 1210 }];

  it('prints each level, the bar widths against the largest quantity, and the totals', async () => {
    const { container } = render(<OrderBookDepth bids={bids} asks={asks} labels={LABELS} testId="ob" />);
    expect(screen.getByRole('table', { name: 'Order book for NABIL' })).not.toBeNull();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Buy quantity', 'Bid', 'Ask', 'Sell quantity']);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(Array.from(rows[0]!.children).map((c) => c.textContent)).toEqual(['1,840', '546.90', '547.00', '1,210']);
    expect(Array.from(rows[1]!.children).map((c) => c.textContent)).toEqual(['920', '546.50', '', '']);
    expect((rows[0]!.querySelector('.kit-ob-bar.b') as HTMLElement).style.width).toBe('100%');
    expect((rows[0]!.querySelector('.kit-ob-bar.s') as HTMLElement).style.width).toBe('65.8%');
    expect(container.querySelector('.kit-ob-tot p')?.textContent).toBe('Buy 69.5% · 2,760Sell 30.5% · 1,210');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('uses published totals, limits levels and draws no totals for an empty book', () => {
    const { container, rerender } = render(<OrderBookDepth bids={bids} asks={asks} levels={1} totals={{ buy: 50, sell: 50 }} labels={LABELS} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.querySelector('.kit-ob-tot p')?.textContent).toBe('Buy 50.0% · 50Sell 50.0% · 50');
    rerender(<OrderBookDepth bids={[]} asks={[]} labels={LABELS} />);
    expect(container.querySelector('.kit-ob-tot')).toBeNull();
  });

  it('leaves the existing OrderBook table unchanged', () => {
    render(
      <OrderBook caption="Book" bids={[{ price: 1, quantity: 2 }]} asks={[]} labels={{ bidQuantity: 'BQ', bid: 'B', ask: 'A', askQuantity: 'AQ' }} formatPrice={(n) => `p${n}`} formatQuantity={(n) => `q${n}`} />,
    );
    expect(screen.getByRole('table', { name: 'Book' })).not.toBeNull();
    expect(screen.getByText('p1')).not.toBeNull();
  });
});
