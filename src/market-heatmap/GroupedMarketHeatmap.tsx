'use client';

/**
 * The grouped heat map (MarketHeatmap with `group` paths): sector, industry, stock as nested treemap cells. Each group
 * has a header strip with its name and size-weighted change; reading order is group, then its stocks. Drilling into a
 * group (click, Enter) shows its children one level down, with breadcrumbs; Escape or Backspace goes up. A stock tile is
 * a real link when it has an `href`. Stocks too small to read fold into a "+N more" tile that opens them.
 * Below `listBelow` px the map becomes a sorted list: a header and a legible tile do not both fit on a phone, and a list
 * prints every symbol, change and size at touch-target height, so nothing is a colour alone or a speck.
 */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

import { useMeasuredWidth } from '../internal/chartFrame.tsx';
import { AppLink } from '../internal/link.tsx';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';
import { arrow, defaultSize, EN, heatLegend, signed, spokenChange, type HeatmapItem, type HeatmapLabels } from './common.ts';
import { buildHeatTree, headerHeight, layoutLevel, pathKey, resolvePath, type HeatCell, type HeatNode } from './groups.ts';
import type { LinkComponent } from '../internal/link.tsx';
import { heatStep } from './treemap.ts';

type Node = HeatNode<HeatmapItem>;

export interface GroupedHeatmapLabels extends HeatmapLabels {
  /** Grouped map: the top level of the breadcrumb. Default "All". */
  all: string;
  /** Grouped map: the breadcrumb's name. */
  levelNav: string;
  /** Grouped map: the name of the "+N more" tile. */
  more: (count: number) => string;
  /** Grouped map: what the "+N more" tile does, spoken. */
  showMore: (count: number, names: string) => string;
  /** Grouped map: what a group's header does, spoken. */
  openGroup: (name: string) => string;
  /** Grouped map: the keyboard hint. */
  groupHint: string;
  /** Grouped map: the table's group column and subtotal word. */
  group: string;
  total: string;
  /** Grouped map: share of the whole, as in "weight 31%". */
  weight: string;
  stocks: (count: number) => string;
}

const GROUPED_EN: GroupedHeatmapLabels = {
  ...EN,
  all: 'All', levelNav: 'Heat map level', more: (n) => `+${n} more`, showMore: (n, names) => `Show ${n} more: ${names}`, openGroup: (n) => `Open ${n}`,
  groupHint: 'Arrow keys move between tiles, Enter opens a group or follows a link, Escape or Backspace goes up one level.',
  group: 'Group', total: 'Total', weight: 'weight', stocks: (n) => (n === 1 ? '1 stock' : `${n} stocks`),
};

export interface GroupedMarketHeatmapProps {
  /** What to draw. Each item's `group` is its sector, then industry (then deeper); an item with no group sits at the top level. Items without a positive size are listed under the map and in the table but not drawn. */
  items: readonly HeatmapItem[];
  /** Names the map ("NEPSE by sector"). */
  label: string;
  /** What area means, printed in the legend and table head ("Market cap"). */
  sizeLabel?: string;
  /** Format a size for the table and spoken name. Default: grouped number. */
  formatSize?: (size: number) => string;
  /** Percent beyond which a tile has the deepest colour. Default 3. */
  scaleMax?: number;
  /** Width over height of the map. Default 1.5. */
  aspect?: number;
  /** Per-instance override of which hue means up: 'green-up' or 'red-up'. Default: follow the theme. */
  convention?: 'green-up' | 'red-up';
  /** Stocks without an `href` become buttons that call this with the item's id. */
  onSelect?: (id: string) => void;
  /** Overrides for the legend, table, breadcrumb and tile words. */
  labels?: Partial<GroupedHeatmapLabels>;
  /** The drilled-in level as names from the top (`['Banking']`, or `['Banking', 'Commercial banks']`); `[]` is the top. A path that does not exist stops where it leaves the tree. Controlled with `onPathChange`. */
  path?: readonly string[];
  /** The starting level when uncontrolled. Default the top. */
  defaultPath?: readonly string[];
  /** Called with the new level when the reader drills in or out. */
  onPathChange?: (path: string[]) => void;
  /** The router link adapter for tiles with an `href`. Default: the nearest `LinkProvider`, else a plain `<a>`. */
  linkComponent?: LinkComponent;
  /** Stocks under this share of their group fold into one "+N more" tile (two or more). Default 0.012. */
  collapseBelow?: number;
  /** Below this container width in px the map is a sorted list instead of a treemap (a phone cannot print a header and a legible tile). Default 560. */
  listBelow?: number;
  /** Sets `data-testid` on the figure. */
  testId?: string;
}

const W = 100;
const NONE: ReadonlySet<string> = new Set();
const changeText = (c: number | null) => (c === null ? '—' : `${arrow(c)} ${signed(c)}`);
const groupPath = (n: Node) => n.path.slice(0, n.item ? -1 : undefined);
const sizeClass = (wp: number, hp: number) => (wp < 7 || hp < 10 ? 'xs' : wp < 13 || hp < 16 ? 'sm' : 'md');

/**
 * Sector, industry, stock as nested treemap cells, with drill-in. Its own module so the flat `MarketHeatmap` stays small.
 * @stability beta
 */
export function GroupedMarketHeatmap({
  items, label, sizeLabel = 'Size', formatSize = defaultSize, scaleMax = 3, aspect = 1.5, convention, onSelect, labels, testId,
  path: pathProp, defaultPath, onPathChange, linkComponent, collapseBelow, listBelow = 560,
}: GroupedMarketHeatmapProps) {
  const words = { ...GROUPED_EN, ...labels };
  const hintId = useId();
  const H = W / aspect;
  const tree = useMemo(() => buildHeatTree(items), [items]);
  const [rawPath, setRawPath] = useControllableState<readonly string[]>({ value: pathProp, defaultValue: defaultPath ?? [], onChange: onPathChange as ((p: readonly string[]) => void) | undefined, name: 'MarketHeatmap path' });
  const { node: view, path } = useMemo(() => resolvePath(tree, rawPath), [tree, rawPath]);
  const viewKey = pathKey(path);
  const [open, setOpen] = useState<{ at: string; keys: ReadonlySet<string> }>({ at: '', keys: new Set() });
  const expanded = open.at === viewKey ? open.keys : NONE;
  const { ref, width } = useMeasuredWidth(0);
  const list = width < listBelow;
  const [active, setActive] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const pending = useRef<'first' | string | null>(null);

  const cells = useMemo(() => layoutLevel(view, { width: W, height: H, collapseBelow, expanded }), [view, H, collapseBelow, expanded]);
  const step = (n: { change: number | null }) => heatStep(n.change, scaleMax) ?? 'none';
  const weightOf = (n: Node) => (tree.root.size > 0 ? Math.round((n.size / tree.root.size) * 1000) / 10 : 0);

  const goTo = (next: readonly string[], focus: 'first' | string) => {
    pending.current = focus;
    setRawPath([...next]);
  };
  const drill = (n: Node) => goTo(n.path, 'first');
  const up = (to: number) => goTo(path.slice(0, to), pathKey(path.slice(0, to + 1)));
  const expand = (key: string, focusKey: string) => {
    pending.current = focusKey;
    setOpen({ at: viewKey, keys: new Set([...expanded, key]) });
  };

  // The roving focus: every interactive cell in reading order. One has tabindex 0.
  const interactive = (c: HeatCell<HeatmapItem>) => c.kind !== 'stock' || Boolean(c.node.item?.href) || Boolean(onSelect);
  const order = cells.filter(interactive).map((c) => c.key);
  const current = active !== null && order.includes(active) ? active : (order[0] ?? null);
  const tab = (key: string) => (key === current ? 0 : -1);

  useEffect(() => {
    const want = pending.current;
    if (want === null || !root.current) return;
    pending.current = null;
    const els = root.current.querySelectorAll<HTMLElement>('[data-roving]');
    const el = want === 'first' ? els[0] : [...els].find((e) => e.dataset.roving === want) ?? els[0];
    el?.focus();
  });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape' || e.key === 'Backspace') {
      if (path.length === 0) return;
      e.preventDefault();
      up(path.length - 1);
      return;
    }
    const els = [...(root.current?.querySelectorAll<HTMLElement>('[data-roving]') ?? [])];
    const at = els.indexOf((e.target as HTMLElement).closest<HTMLElement>('[data-roving]') as HTMLElement);
    if (at < 0 || els.length === 0) return;
    const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? Math.min(els.length - 1, at + 1) : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? Math.max(0, at - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    els[next]!.focus();
  };

  const stockSpoken = (n: Node) => {
    const item = n.item!;
    const g = groupPath(n);
    return `${item.label}${item.name ? `, ${item.name}` : ''}${g.length ? `, ${g.join(', ')}` : ''}, ${sizeLabel} ${formatSize(item.size!)}, ${spokenChange(item.change, words)}`;
  };
  const groupSpoken = (n: Node) => `${n.name}, ${sizeLabel} ${formatSize(n.size)}, ${words.weight} ${weightOf(n)}%, ${spokenChange(n.change, words)}, ${words.stocks(n.leaves.length)}`;

  const tileBody = (n: Node): ReactNode => {
    const item = n.item!;
    return (
      <>
        <b className="pu-heat-sym">{item.label}</b>
        <span className="pu-heat-chg" aria-hidden="true">{item.change === null ? '' : changeText(item.change)}</span>
        <span className="kit-sr">{stockSpoken(n).slice(item.label.length)}</span>
      </>
    );
  };
  const stockEl = (n: Node, rovingKey: string, cls?: string): ReactNode => {
    const item = n.item!;
    const spoken = stockSpoken(n);
    if (item.href) return <AppLink href={item.href} linkComponent={linkComponent} data-roving={rovingKey} tabIndex={tab(rovingKey)} className={cls}>{tileBody(n)}</AppLink>;
    if (onSelect) return <button type="button" data-roving={rovingKey} tabIndex={tab(rovingKey)} className={cls} onClick={() => onSelect(item.id)}>{tileBody(n)}</button>;
    return <div role="group" aria-label={spoken} className={cls}>{tileBody(n)}</div>;
  };

  const moreName = (c: HeatCell<HeatmapItem>) => words.showMore(c.hidden!.length, c.hidden!.map((h) => h.item!.label).join(', '));

  const crumbs = (
    <nav className="pu-heat-crumbs" aria-label={words.levelNav}>
      <ol>
        {[words.all, ...path].map((name, i, all) => (
          <li key={i}>
            {i === all.length - 1 ? <span aria-current="location">{name}</span> : <button type="button" onClick={() => up(i)}>{name}</button>}
          </li>
        ))}
      </ol>
    </nav>
  );

  const pos = (c: HeatCell<HeatmapItem>): CSSProperties => ({ left: `${(c.x / W) * 100}%`, top: `${(c.y / H) * 100}%`, width: `${(c.width / W) * 100}%`, height: `${(c.height / H) * 100}%` });

  const mapEls: ReactNode[] = cells.map((c) => {
    if (c.kind === 'group') {
      const hh = headerHeight(c);
      const n = c.node;
      return (
        <li key={c.key} className="pu-heat-group" style={pos(c)} data-step={step(n)} data-header={hh > 0 ? 'on' : 'off'}>
          <button
            type="button"
            className="pu-heat-ghead"
            data-roving={c.key}
            tabIndex={tab(c.key)}
            style={hh > 0 ? { height: `${(hh / c.height) * 100}%` } : undefined}
            onClick={() => drill(n)}
            title={words.openGroup(n.name)}
          >
            <b>{n.name}</b>
            <span aria-hidden="true">{n.change === null ? '' : changeText(n.change)}</span>
            <span className="kit-sr">{groupSpoken(n).slice(n.name.length)}. {words.openGroup(n.name)}</span>
          </button>
        </li>
      );
    }
    if (c.kind === 'more') {
      const text = c.change === null || c.change === undefined ? '' : changeText(c.change);
      return (
        <li key={c.key} className="pu-heat-tile pu-heat-more" style={pos(c)} data-step={step({ change: c.change ?? null })} data-size={sizeClass((c.width / W) * 100, (c.height / H) * 100)}>
          <button type="button" data-roving={c.key} tabIndex={tab(c.key)} onClick={() => expand(c.parentKey, c.key)} title={moreName(c)}>
            <b className="pu-heat-sym">{words.more(c.hidden!.length)}</b>
            <span className="pu-heat-chg" aria-hidden="true">{text}</span>
            <span className="kit-sr">: {c.hidden!.map((h) => h.item!.label).join(', ')}, {spokenChange(c.change ?? null, words)}</span>
          </button>
        </li>
      );
    }
    const n = c.node;
    return (
      <li key={c.key} className="pu-heat-tile" style={pos(c)} data-step={step(n)} data-size={sizeClass((c.width / W) * 100, (c.height / H) * 100)} title={stockSpoken(n)}>
        {stockEl(n, c.key)}
      </li>
    );
  });

  // The list for a phone: the level's children, largest first, a real row each.
  const rows = (nodes: readonly Node[]) =>
    nodes.map((n) => (
      <li key={n.key} className="pu-heat-row" data-step={step(n)}>
        {n.item ? (
          stockEl(n, n.key, 'pu-heat-row-main')
        ) : (
          <button type="button" className="pu-heat-row-main" data-roving={n.key} tabIndex={tab(n.key)} onClick={() => drill(n)} title={words.openGroup(n.name)}>
            <b className="pu-heat-sym">{n.name}</b>
            <span className="pu-heat-row-sub">{words.stocks(n.leaves.length)}, {sizeLabel} {formatSize(n.size)}</span>
            <span className="pu-heat-chg" aria-hidden="true">{changeText(n.change)}</span>
            <span className="kit-sr">, {words.weight} {weightOf(n)}%, {spokenChange(n.change, words)}. {words.openGroup(n.name)}</span>
          </button>
        )}
      </li>
    ));
  const listEls = rows(view.children);

  const tableRows: ReactNode[] = [];
  const walk = (n: Node) => {
    if (!n.item && n !== tree.root) {
      tableRows.push(
        <tr key={`t:${n.key}`} className="pu-heat-subtotal">
          <th scope="row">{n.path.join(' › ')} <span className="sub">{words.total}</span></th>
          <td>—</td>
          <td className="num">{formatSize(n.size)}</td>
          <td className="num">{n.change === null ? '—' : signed(n.change)} <span className="sub">{words.weight} {weightOf(n)}%</span></td>
        </tr>,
      );
    }
    for (const c of n.children) {
      if (c.item) {
        tableRows.push(
          <tr key={c.key}>
            <th scope="row">{c.item.label}{c.item.name && <span className="sub">{c.item.name}</span>}</th>
            <td>{groupPath(c).join(' › ')}</td>
            <td className="num">{formatSize(c.item.size!)}</td>
            <td className="num">{c.item.change === null ? '—' : signed(c.item.change)}</td>
          </tr>,
        );
      } else walk(c);
    }
  };
  walk(tree.root);
  for (const i of tree.unsized) {
    tableRows.push(
      <tr key={`u:${i.id}`}>
        <th scope="row">{i.label}{i.name && <span className="sub">{i.name}</span>}</th>
        <td>{(i.group ?? []).join(' › ')}</td>
        <td className="num">{words.noSize}</td>
        <td className="num">{i.change === null ? '—' : signed(i.change)}</td>
      </tr>,
    );
  }

  const top = tree.root.children.filter((c) => !c.item);
  const summary = top.length > 0 ? top.map((g) => `${g.name} ${g.change === null ? words.noChange.toLowerCase() : signed(g.change)} (${words.weight} ${weightOf(g)}%)`).join('; ') : '';
  const legend = heatLegend(words, scaleMax);

  return (
    <figure className="pu-heat pu-heat-grouped" data-convention={convention} data-testid={testId} data-mode={list ? 'list' : 'map'}>
      <figcaption className="pu-heat-title">{label}</figcaption>
      {crumbs}
      <div ref={ref} className="pu-heat-measure">
        {view.children.length === 0 ? (
          <p className="pu-heat-empty" role="status">{words.noSize}</p>
        ) : (
          // The keys are handled for the whole region; each focusable child is a real button or link.
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <div
            ref={root}
            role="group"
            aria-label={`${label}: ${words.all}${path.length ? ` › ${path.join(' › ')}` : ''}`}
            aria-describedby={hintId}
            onKeyDown={onKeyDown}
            onFocus={(e) => setActive((e.target as HTMLElement).closest<HTMLElement>('[data-roving]')?.dataset.roving ?? null)}
            key={viewKey}
            className="pu-heat-level"
          >
            {list ? <ul className="pu-heat-list" aria-label={label}>{listEls}</ul> : <ul className="pu-heat-map" aria-label={label} style={{ aspectRatio: String(aspect) }}>{mapEls}</ul>}
          </div>
        )}
      </div>
      <p className="kit-sr" id={hintId}>{words.groupHint}{summary ? ` ${summary}.` : ''}</p>
      {tree.unsized.length > 0 && <p className="pu-heat-skipped" role="status">{words.notSized(tree.unsized.length)}: {tree.unsized.map((i) => i.id).join(', ')}</p>}
      <ul className="pu-heat-legend" aria-label={words.legend}>
        {legend.map((l) => <li key={l.step}><i data-step={l.step} aria-hidden="true" />{l.text}</li>)}
      </ul>
      <p className="pu-heat-size-note">{words.areaNote(sizeLabel)}</p>
      <details className="pu-heat-data">
        <summary>{words.dataSummary}</summary>
        {/* A scrollable region must be focusable so the keyboard can scroll it. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div className="kit-tablebox bare" role="region" aria-label={`${label}: ${words.dataSummary}`} tabIndex={0}>
          <table className="kit-table">
            <caption className="kit-sr">{label}</caption>
            <thead><tr><th scope="col">{words.symbol}</th><th scope="col">{words.group}</th><th scope="col" className="num">{sizeLabel}</th><th scope="col" className="num">{words.change}</th></tr></thead>
            <tbody>{tableRows}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
