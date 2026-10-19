import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { compactRs } from '../src/compact/compact.ts';
import { Cell, DataListRow, DataRow, DataRows, DataTable, Delta, Figure, GroupedCell, ListSectionHeader, Live, LiveFigure, PageHeader, PageLayout, RowList, StatGrid, StatTile, Tile, ValueRow, type SortDir } from '../src/index.ts';
import type { LinkComponent } from '../src/internal/link.tsx';
import { seriousViolations } from './axe.ts';

const RouterLink: LinkComponent = ({ children, ...rest }) => (
  <a data-router="yes" {...rest}>
    {children}
  </a>
);

type Key = 'sym' | 'ltp' | 'vol';
const COLS = [
  { key: 'sym' as const, label: 'Symbol', sortable: true },
  { key: 'ltp' as const, label: 'Price', num: true, sortable: true },
  { key: 'vol' as const, label: 'Volume', num: true, wide: true },
];

function TableHarness() {
  const [sort, setSort] = useState<{ key: Key; dir: SortDir }>({ key: 'sym', dir: 'asc' });
  return (
    <DataTable caption="Prices" columns={COLS} sort={sort} onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))} testId="t">
      <DataListRow>
        <Cell sym header>
          NABIL
        </Cell>
        <Cell num>
          <Figure value={512.3} />
        </Cell>
        <Cell num wide>
          <Figure value={1200} kind="int" />
        </Cell>
      </DataListRow>
    </DataTable>
  );
}

describe('Rows', () => {
  it('a ValueRow is a link (plain or your link component), a button, or static', async () => {
    const onClick = vi.fn<() => void>();
    render(
      <GroupedCell label="Holdings">
        <RowList label="Holdings">
          <ValueRow symbol="NABIL" name="Nabil Bank" figure="Rs 512.30" href="/stock/NABIL" chevron />
          <ValueRow symbol="ADBL" figure="Rs 290.00" href="/stock/ADBL" linkComponent={RouterLink} />
          <ValueRow symbol="HDL" href="https://example.com" linkComponent={RouterLink} />
          <ValueRow title="Add a holding" onClick={onClick} />
          <ValueRow title="Static" lead={<Tile text="NABIL" />} />
        </RowList>
      </GroupedCell>,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('link', { name: /NABIL/ }).getAttribute('href')).toBe('/stock/NABIL');
    expect(screen.getByRole('link', { name: /ADBL/ }).getAttribute('data-router')).toBe('yes');
    expect(screen.getByRole('link', { name: /HDL/ }).getAttribute('data-router')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Add a holding' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByText('NABI').getAttribute('aria-hidden')).toBe('true');
  });

  it('DataRows are a description list of label and value', () => {
    expect(renderToStaticMarkup(<DataRows label="Facts"><DataRow label="Sector" value="Banks" total /></DataRows>)).toBe('<dl class="kit-rows" aria-label="Facts"><div class="kit-data-row total"><dt>Sector</dt><dd>Banks</dd></div></dl>');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <GroupedCell label="Holdings">
        <RowList>
          <ValueRow symbol="NABIL" figure="Rs 512.30" note="+1.2%" href="/x" chevron />
          <ValueRow title="Static" />
        </RowList>
        <DataRows label="Facts">
          <DataRow label="Sector" value="Banks" />
        </DataRows>
      </GroupedCell>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('Stats', () => {
  it('a grid of label, value and note, with its column count as a property', () => {
    const html = renderToStaticMarkup(
      <StatGrid cols={3} label="Today">
        <StatTile label="Value" value="Rs 1,200.00" note="as of 3 pm" />
      </StatGrid>,
    );
    expect(html).toContain('style="--kit-cols:3"');
    expect(html).toContain('<dt>Value</dt><dd><span class="v">Rs 1,200.00</span><span class="n">as of 3 pm</span></dd>');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <StatGrid label="Today">
        <StatTile label="Value" value="1" />
      </StatGrid>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('Figure and Delta', () => {
  it('a figure prints through formatFigure; a missing one is a dash', () => {
    expect(renderToStaticMarkup(<Figure value={842610} kind="rs" />)).toBe('<span class="kit-fig">Rs 8,42,610.00</span>');
    expect(renderToStaticMarkup(<Figure value={null} />)).toBe('<span class="kit-fig">-</span>');
  });

  it('a change is sign, arrow, colour and a spoken word; a 0.00% move is flat', () => {
    const up = renderToStaticMarkup(<Delta value={1.234} />);
    expect(up).toContain('kit-up');
    expect(up).toContain('▲ ');
    expect(up).toContain('+1.23%');
    expect(up).toContain('<span class="kit-sr"> up</span>');
    const down = renderToStaticMarkup(<Delta value={-1500} kind="rs" words={{ up: 'बढ्यो', down: 'घट्यो', flat: 'उस्तै' }} />);
    expect(down).toContain('−Rs 1,500.00');
    expect(down).toContain('घट्यो');
    const flat = renderToStaticMarkup(<Delta value={0.004} />);
    expect(flat).toContain('kit-flat');
    expect(flat).not.toContain('▲');
  });
});

describe('Live and LiveFigure', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a new value of the same figure tweens and tints, then lands exactly on it', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    let now = 0;
    const frames: ((t: number) => void)[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => (frames.push(cb), frames.length));
    const { rerender } = render(<LiveFigure value={100} testId="lf" />);
    rerender(<LiveFigure value={110} testId="lf" />);
    const el = screen.getByTestId('lf');
    expect(el.className).toContain('kit-live-up');
    expect(el.querySelector('.kit-sr')?.textContent).toBe('110.00');
    for (let i = 0; i < 40 && frames.length; i++) {
      now += 50;
      act(() => frames.shift()!(now));
    }
    expect(el.textContent).toBe('110.00');
  });

  it('under reduced motion, or for another figure (a new id), it simply shows the new value', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { rerender } = render(<Live value={1} testId="l">{(n) => String(n)}</Live>);
    rerender(<Live value={2} testId="l">{(n) => String(n)}</Live>);
    expect(screen.getByTestId('l').className).toBe('kit-live');
    expect(screen.getByTestId('l').textContent).toBe('2');
  });
});

describe('compactRs', () => {
  const UNITS = { lakh: 'L', crore: 'Cr', arba: 'Arba' };
  it('is exact below a crore, then crore and arba to two places, with the exact amount beside it', () => {
    expect(compactRs(9_999_999, UNITS)).toEqual({ short: 'Rs 99,99,999', full: 'Rs 99,99,999', compact: false });
    expect(compactRs(12_400_000, UNITS)).toEqual({ short: 'Rs 1.24 Cr', full: 'Rs 1,24,00,000', compact: true });
    expect(compactRs(-2_050_000_000, UNITS).short).toBe('−Rs 2.05 Arba');
    expect(compactRs(250_000, UNITS, 1e5).short).toBe('Rs 2.50 L');
    expect(compactRs(null, UNITS)).toEqual({ short: '-', full: '-', compact: false });
  });
});

describe('DataTable', () => {
  it('a named, focusable scroll region with a caption; sortable heads say their order', async () => {
    render(<TableHarness />);
    const region = screen.getByRole('region', { name: 'Prices' });
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('table', { name: 'Prices' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: /Symbol/ }).getAttribute('aria-sort')).toBe('ascending');
    await userEvent.click(screen.getByTestId('sort-ltp'));
    expect(screen.getByRole('columnheader', { name: /Price/ }).getAttribute('aria-sort')).toBe('ascending');
    await userEvent.click(screen.getByTestId('sort-ltp'));
    expect(screen.getByRole('columnheader', { name: /Price/ }).getAttribute('aria-sort')).toBe('descending');
    expect(screen.getByRole('rowheader', { name: 'NABIL' }).className).toBe('sym');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<TableHarness />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('PageLayout and PageHeader', () => {
  it('a main landmark, a title, a back link (plain or your link component), actions and a meta line', () => {
    render(
      <PageLayout>
        <PageHeader title="Holdings" backTo="/" linkComponent={RouterLink} backLabel="Back to home" meta="12 holdings" actions={<button type="button">Add</button>} />
        <ListSectionHeader title="Banks" detail="4" />
      </PageLayout>,
    );
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Holdings' })).toBeTruthy();
    const back = screen.getByRole('link', { name: 'Back to home' });
    expect(back.getAttribute('href')).toBe('/');
    expect(back.getAttribute('data-router')).toBe('yes');
    expect(renderToStaticMarkup(<PageHeader title="Root" />)).toContain('class="kit-header no-back"');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <PageLayout>
        <PageHeader title="Holdings" backTo="/" meta="12 holdings" />
        <ListSectionHeader title="Banks" detail="4" />
      </PageLayout>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});
