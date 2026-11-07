import { cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LinkProvider, MarketHeatmap, type HeatmapItem, type LinkProps } from '../src/index.ts';
import { buildHeatTree, collapseSmall, layoutLevel, resolvePath } from '../src/market-heatmap/groups.ts';
import { seriousViolations } from './axe.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const widthOf = (px: number) => vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(px);
const it$ = (id: string, group: string[], size: number | null, change: number | null, href?: string): HeatmapItem => ({ id, label: id, name: `${id} Ltd`, group, size, change, href });

const ITEMS: HeatmapItem[] = [
  it$('NABIL', ['Banking', 'Commercial banks'], 500, 1.2, '/s/NABIL'),
  it$('NICA', ['Banking', 'Commercial banks'], 300, -0.8, '/s/NICA'),
  it$('NIFRA', ['Banking', 'Development banks'], 100, 0.4, '/s/NIFRA'),
  it$('NHPC', ['Hydropower', 'Generation'], 400, -2.6, '/s/NHPC'),
  it$('UPPER', ['Hydropower', 'Generation'], 200, 3.4, '/s/UPPER'),
  it$('NOSIZE', ['Hydropower', 'Generation'], null, 1),
  it$('LOOSE', [], 150, 0),
];

describe('groups: tree', () => {
  const tree = buildHeatTree(ITEMS);
  it('sums sizes up the tree and weights the change by size', () => {
    const banking = tree.root.children.find((c) => c.name === 'Banking')!;
    expect(banking.size).toBe(900);
    expect(banking.change).toBeCloseTo((500 * 1.2 + 300 * -0.8 + 100 * 0.4) / 900, 10);
    expect(tree.root.size).toBe(1650);
    expect(tree.unsized.map((i) => i.id)).toEqual(['NOSIZE']);
  });
  it('orders children by size, ties by first appearance, and keeps loose stocks at the top', () => {
    expect(tree.root.children.map((c) => c.name)).toEqual(['Banking', 'Hydropower', 'LOOSE']);
    const tie = buildHeatTree([it$('B', ['G'], 5, 0), it$('A', ['G'], 5, 0)]);
    expect(tie.root.children[0]!.leaves.map((l) => l.name)).toEqual(['B', 'A']);
  });
  it('has a null change for a group with no change data', () => {
    expect(buildHeatTree([it$('X', ['G'], 5, null)]).root.children[0]!.change).toBeNull();
  });
  it('resolves a path, stopping where it leaves the tree', () => {
    expect(resolvePath(tree, ['Banking', 'Development banks']).path).toEqual(['Banking', 'Development banks']);
    expect(resolvePath(tree, ['Banking', 'Nope']).path).toEqual(['Banking']);
    expect(resolvePath(tree, ['Nope']).node).toBe(tree.root);
  });
});

describe('groups: layout', () => {
  const tree = buildHeatTree(ITEMS);
  it('tiles the map: group areas follow size and fill the bounds', () => {
    const groups = layoutLevel(tree.root, { width: 100, height: 60 }).filter((c) => c.kind === 'group' || c.node.item?.id === 'LOOSE');
    const area = groups.reduce((s, c) => s + c.width * c.height, 0);
    expect(area).toBeCloseTo(6000, 6);
    const banking = groups.find((c) => c.node.name === 'Banking')!;
    expect(banking.width * banking.height).toBeCloseTo((900 / 1650) * 6000, 6);
  });
  it('lays a group\'s stocks below its header strip', () => {
    const cells = layoutLevel(tree.root, { width: 100, height: 60, header: 4 });
    const g = cells.find((c) => c.kind === 'group' && c.node.name === 'Hydropower')!;
    const stocks = cells.filter((c) => c.parentKey === g.key);
    expect(stocks.length).toBe(2);
    for (const s of stocks) {
      expect(s.y).toBeGreaterThanOrEqual(g.y + 4 - 1e-9);
      expect(s.y + s.height).toBeLessThanOrEqual(g.y + g.height + 1e-9);
    }
  });
  it('folds two or more tiny stocks into one "+N more" tile of their combined size', () => {
    const many = [it$('BIG', ['G'], 1000, 1), ...Array.from({ length: 5 }, (_, i) => it$(`S${i}`, ['G'], 2, i % 2 ? -1 : 1))];
    const t = buildHeatTree(many);
    const cells = layoutLevel(t.root, { width: 100, height: 60 });
    const more = cells.find((c) => c.kind === 'more')!;
    expect(more.hidden!.length).toBe(5);
    expect(more.size).toBe(10);
    expect(cells.filter((c) => c.kind === 'stock').map((c) => c.node.name)).toEqual(['BIG']);
    const full = layoutLevel(t.root, { width: 100, height: 60, expanded: new Set([t.root.children[0]!.key]) });
    expect(full.filter((c) => c.kind === 'stock').length).toBe(6);
    expect(full.some((c) => c.kind === 'more')).toBe(false);
  });
  it('does not fold a single small stock', () => {
    const leaves = buildHeatTree([it$('BIG', ['G'], 1000, 1), it$('TINY', ['G'], 1, 1)]).root.children[0]!.leaves;
    expect(collapseSmall(leaves, 1001, 0.012).hidden).toEqual([]);
  });
  it('draws a group too small for a header without one', () => {
    const t = buildHeatTree([it$('A', ['Big'], 1000, 1), it$('B', ['Small'], 1, 1)]);
    const cells = layoutLevel(t.root, { width: 100, height: 60 });
    const small = cells.find((c) => c.kind === 'group' && c.node.name === 'Small')!;
    expect(small.width < 12 || small.height < 7).toBe(true);
  });
});

const NavLink = ({ href, children, ...rest }: LinkProps) => <a data-router="yes" href={`/app${href}`} {...rest}>{children}</a>;

const show = (extra: Partial<React.ComponentProps<typeof MarketHeatmap>> = {}) => {
  widthOf(900);
  return render(
    <LinkProvider component={NavLink}>
      <MarketHeatmap items={ITEMS} label="NEPSE by sector" sizeLabel="Market cap" testId="hm" {...extra} />
    </LinkProvider>,
  );
};

describe('MarketHeatmap grouped', () => {

  it('stays flat when no item has a group', () => {
    widthOf(900);
    const { container } = render(<MarketHeatmap items={ITEMS.map((i) => ({ ...i, group: undefined }))} label="flat" />);
    expect(container.querySelector('.pu-heat-grouped')).toBeNull();
    expect(container.querySelector('nav')).toBeNull();
  });

  it('draws a header per group with its weighted change, and prints the change in every tile', () => {
    const { container } = show();
    const heads = [...container.querySelectorAll('.pu-heat-ghead')].map((h) => h.textContent);
    expect(heads[0]).toMatch(/^Banking.*\+0\.\d\d%/);
    expect(heads[1]).toMatch(/^Hydropower.*[−+]\d\.\d\d%/);
    const tile = container.querySelector('.pu-heat-tile')!;
    expect(tile.textContent).toMatch(/[▲▼■]/);
    expect(tile.querySelector('.pu-heat-chg')!.textContent).toMatch(/%/);
  });

  it('renders stocks with an href as real links through LinkProvider', () => {
    const { container } = show();
    const link = container.querySelector('a[href="/app/s/NHPC"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.dataset.router).toBe('yes');
    expect(link.textContent).toContain('NHPC');
  });

  it('colours by step on the diverging scale and never by colour alone', () => {
    const { container } = show({ path: ['Hydropower'] });
    const up = [...container.querySelectorAll('.pu-heat-tile')].find((t) => t.textContent?.includes('UPPER'))!;
    const down = [...container.querySelectorAll('.pu-heat-tile')].find((t) => t.textContent?.includes('NHPC'))!;
    expect(up.getAttribute('data-step')).toBe('3');
    expect(down.getAttribute('data-step')).toBe('-3');
    expect(up.textContent).toContain('▲');
    expect(down.textContent).toContain('−2.60%');
  });

  it('drills in with Enter on a header, shows breadcrumbs, and Escape goes back up and refocuses the group', async () => {
    const user = userEvent.setup();
    const onPathChange = vi.fn<(path: string[]) => void>();
    const { container } = show({ onPathChange });
    const nav = screen.getByRole('navigation', { name: 'Heat map level' });
    expect(within(nav).getByText('All').getAttribute('aria-current')).toBe('location');
    const banking = container.querySelector<HTMLElement>('.pu-heat-ghead')!;
    banking.focus();
    await user.keyboard('{Enter}');
    expect(onPathChange).toHaveBeenLastCalledWith(['Banking']);
    expect(within(nav).getByText('Banking').getAttribute('aria-current')).toBe('location');
    expect(within(nav).getByRole('button', { name: 'All' })).toBeTruthy();
    // One level down the industries are the groups, with their stocks.
    const heads = [...container.querySelectorAll('.pu-heat-ghead')].map((h) => h.textContent);
    expect(heads.some((h) => h?.startsWith('Commercial banks'))).toBe(true);
    expect(document.activeElement).toBe(container.querySelector('[data-roving]'));
    await user.keyboard('{Escape}');
    expect(onPathChange).toHaveBeenLastCalledWith([]);
    expect(within(nav).getByText('All').getAttribute('aria-current')).toBe('location');
    expect((document.activeElement as HTMLElement).textContent).toMatch(/^Banking/);
  });

  it('drills by click, and a breadcrumb button goes back up', async () => {
    const user = userEvent.setup();
    const { container } = show({ defaultPath: ['Banking'] });
    await user.click([...container.querySelectorAll('.pu-heat-ghead')].find((h) => h.textContent?.startsWith('Development'))! as HTMLElement);
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByText('Development banks')).toBeTruthy();
    expect(container.querySelector('a[href="/app/s/NIFRA"]')).not.toBeNull();
    await user.click(within(nav).getByRole('button', { name: 'Banking' }));
    expect(within(nav).getByText('Banking').getAttribute('aria-current')).toBe('location');
  });

  it('is controlled by path', () => {
    const { rerender, container } = show({ path: ['Hydropower'] });
    expect(container.querySelector('a[href="/app/s/UPPER"]')).not.toBeNull();
    expect(container.querySelector('a[href="/app/s/NABIL"]')).toBeNull();
    rerender(
      <LinkProvider component={NavLink}>
        <MarketHeatmap items={ITEMS} label="NEPSE by sector" path={[]} />
      </LinkProvider>,
    );
    expect(container.querySelector('a[href="/app/s/NABIL"]')).not.toBeNull();
  });

  it('moves between tiles with the arrow keys (one tab stop)', async () => {
    const user = userEvent.setup();
    const { container } = show({ path: ['Banking', 'Commercial banks'] });
    const stops = [...container.querySelectorAll<HTMLElement>('[data-roving]')];
    expect(stops.filter((s) => s.tabIndex === 0).length).toBe(1);
    stops[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(stops[1]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(stops.at(-1));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(stops[0]);
    expect(stops.filter((s) => s.tabIndex === 0)[0]).toBe(stops[0]);
  });

  it('folds tiny stocks into "+N more" that opens them', async () => {
    const user = userEvent.setup();
    const many = [it$('BIG', ['G', 'H'], 1000, 1, '/s/BIG'), ...Array.from({ length: 4 }, (_, i) => it$(`S${i}`, ['G', 'H'], 3, 0.5, `/s/S${i}`))];
    const { container } = show({ items: many, defaultPath: ['G'] });
    const more = screen.getByRole('button', { name: /\+4 more.*S0, S1, S2, S3/ });
    expect(more.textContent).toContain('+4 more');
    expect(container.querySelector('a[href="/app/s/S0"]')).toBeNull();
    await user.click(more);
    expect(container.querySelector('a[href="/app/s/S0"]')).not.toBeNull();
    expect(screen.queryByText('+4 more')).toBeNull();
  });

  it('is a sorted list on a narrow container, with the same navigation', async () => {
    widthOf(390);
    const user = userEvent.setup();
    const { container } = render(
      <LinkProvider component={NavLink}>
        <MarketHeatmap items={ITEMS} label="NEPSE by sector" sizeLabel="Market cap" />
      </LinkProvider>,
    );
    expect(container.querySelector('.pu-heat-map')).toBeNull();
    const rows = [...container.querySelectorAll('.pu-heat-row')];
    expect(rows[0]!.textContent).toContain('Banking');
    expect(rows[0]!.textContent).toMatch(/\+0\.\d\d%/);
    await user.click(within(rows[1] as HTMLElement).getByRole('button'));
    await user.click(within(container.querySelector('.pu-heat-row') as HTMLElement).getByRole('button'));
    expect(container.querySelector('a[href="/app/s/NHPC"]')).not.toBeNull();
    expect(container.querySelector('a[href="/app/s/NHPC"]')!.textContent).toMatch(/NHPC.*−2\.60%/s);
  });

  it('keeps every stock, subtotal and unsized stock in the data table', () => {
    const { container } = show();
    const rows = [...container.querySelectorAll('table tbody tr')].map((r) => r.textContent!.replaceAll(' ', ' '));
    expect(rows.some((r) => r.startsWith('Banking › Commercial banks') && r.includes('Total'))).toBe(true);
    expect(rows.some((r) => r.startsWith('NOSIZE') && r.includes('No size'))).toBe(true);
    expect(rows.filter((r) => r.includes(' Ltd')).length).toBe(7);
    expect(container.querySelector('.pu-heat-skipped')!.textContent).toContain('NOSIZE');
  });

  it('describes the groups and the keyboard for a screen reader', () => {
    show();
    const hint = screen.getByText(/Arrow keys move between tiles/);
    expect(hint.textContent).toMatch(/Banking \+0\.\d\d% \(weight 54\.5%\)/);
  });

  it('has no serious axe violations (map and list, drilled)', async () => {
    const a = show({ path: ['Banking'] });
    expect(await seriousViolations(a.container)).toEqual([]);
    cleanup();
    widthOf(390);
    const b = render(<MarketHeatmap items={ITEMS} label="m" />);
    expect(await seriousViolations(b.container)).toEqual([]);
  });
});
