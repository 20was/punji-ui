/**
 * The grouped heat map's pure side: a sector, industry, stock tree from items with a `group` path, the size-weighted
 * change of every group, and the layout of one level of it (squarified, with a header strip per group and tiny tiles
 * collapsed into one "+N more" tile). No DOM, no state: the same items, path and options give the same cells.
 */
import { squarify } from './treemap.ts';

/** What the tree needs of an item (`HeatmapItem` satisfies it). */
export interface GroupItem {
  id: string;
  size: number | null;
  change: number | null;
  /** Sector, then industry, then deeper: the item's place in the tree. Missing or empty puts it at the top level. */
  group?: readonly string[];
}

export interface HeatNode<T extends GroupItem = GroupItem> {
  /** Path joined with a unit separator: unique per node. */
  key: string;
  /** The group's name (the item's id for a stock). */
  name: string;
  path: readonly string[];
  /** Total size of every stock below, or the stock's own. */
  size: number;
  /** Size-weighted change of the stocks below that have one, or the stock's own; null when none has. */
  change: number | null;
  /** The stock, for a leaf node. */
  item?: T;
  /** Child groups and stocks, largest first (ties by first appearance). Empty for a stock. */
  children: HeatNode<T>[];
  /** Every stock below, largest first. A stock lists itself. */
  leaves: HeatNode<T>[];
}

export interface HeatTree<T extends GroupItem = GroupItem> {
  root: HeatNode<T>;
  /** Items with no positive size: not placed. */
  unsized: T[];
}

const SEP = '\u001f';
export const pathKey = (path: readonly string[]) => path.join(SEP);

const weighted = (nodes: readonly HeatNode[]): number | null => {
  let w = 0;
  let sum = 0;
  for (const n of nodes) {
    if (n.change === null || !Number.isFinite(n.change)) continue;
    w += n.size;
    sum += n.size * n.change;
  }
  return w > 0 ? sum / w : null;
};

/** Builds the tree. A group's size is the sum of its stocks; its change is the size-weighted mean of theirs. */
export function buildHeatTree<T extends GroupItem>(items: readonly T[]): HeatTree<T> {
  const root: HeatNode<T> = { key: '', name: '', path: [], size: 0, change: null, children: [], leaves: [] };
  const unsized: T[] = [];
  const order = new Map<string, number>();
  const groups = new Map<string, HeatNode<T>>([['', root]]);
  items.forEach((item, index) => {
    if (!(typeof item.size === 'number' && Number.isFinite(item.size) && item.size > 0)) {
      unsized.push(item);
      return;
    }
    const path = (item.group ?? []).filter((g) => g.length > 0);
    let parent = root;
    path.forEach((name, depth) => {
      const p = path.slice(0, depth + 1);
      const key = pathKey(p);
      let node = groups.get(key);
      if (!node) {
        node = { key, name, path: p, size: 0, change: null, children: [], leaves: [] };
        groups.set(key, node);
        order.set(key, index);
        parent.children.push(node);
      }
      parent = node;
    });
    const key = `${pathKey(path)}${SEP}${SEP}${item.id}`;
    const leaf: HeatNode<T> = { key, name: item.id, path: [...path, item.id], size: item.size, change: item.change, item, children: [], leaves: [] };
    leaf.leaves = [leaf];
    order.set(key, index);
    parent.children.push(leaf);
  });
  const finish = (node: HeatNode<T>): void => {
    if (node.item) return;
    node.children.forEach(finish);
    node.children = node.children.toSorted((a, b) => b.size - a.size || order.get(a.key)! - order.get(b.key)!);
    node.leaves = node.children.flatMap((c) => c.leaves).toSorted((a, b) => b.size - a.size || order.get(a.key)! - order.get(b.key)!);
    node.size = node.children.reduce((s, c) => s + c.size / 2, 0) * 2;
    node.change = weighted(node.leaves);
  };
  finish(root);
  return { root, unsized };
}

/** The deepest node the path reaches (a path that leaves the tree stops where it leaves). Also returns the part that held. */
export function resolvePath<T extends GroupItem>(tree: HeatTree<T>, path: readonly string[]): { node: HeatNode<T>; path: string[] } {
  let node = tree.root;
  const held: string[] = [];
  for (const name of path) {
    const next = node.children.find((c) => !c.item && c.name === name);
    if (!next) break;
    node = next;
    held.push(name);
  }
  return { node, path: held };
}

export interface HeatCell<T extends GroupItem = GroupItem> {
  /** A group (header and the stocks below it), a stock, or the "+N more" tile. */
  kind: 'group' | 'stock' | 'more';
  key: string;
  node: HeatNode<T>;
  /** Layout units: the map is `width` wide. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** For "more": the stocks it stands for. */
  hidden?: HeatNode<T>[];
  /** For "more": their combined size and size-weighted change. */
  size?: number;
  change?: number | null;
  /** For a stock or "more" inside a group: the group's key. Empty at the top of the view. */
  parentKey: string;
}

export interface HeatLayoutOptions {
  width: number;
  height: number;
  /** Height of a group's header strip in layout units. Default 3.4. */
  header?: number;
  /** A group is drawn without a header strip (name for assistive technology only) below this width or height. Defaults 12 and 7. */
  minGroupWidth?: number;
  minGroupHeight?: number;
  /** Stocks below this share of their parent collapse into one "+N more" tile (only when two or more would). Default 0.012. */
  collapseBelow?: number;
  /** Keys of groups (or "" for the view itself) shown in full, with no "+N more". */
  expanded?: ReadonlySet<string>;
}

/** Collapses small tiles: returns the stocks to draw and the stocks folded into one tile (empty when nothing folds). */
export function collapseSmall<T extends GroupItem>(leaves: readonly HeatNode<T>[], total: number, below: number): { shown: HeatNode<T>[]; hidden: HeatNode<T>[] } {
  const small = leaves.filter((l) => total > 0 && l.size / total < below);
  if (small.length < 2) return { shown: [...leaves], hidden: [] };
  const drop = new Set(small);
  return { shown: leaves.filter((l) => !drop.has(l)), hidden: small };
}

const MORE = 'more';

/** One level of the map: the children of `node`, laid out in `width` by `height`. Groups come with the stocks inside them. */
export function layoutLevel<T extends GroupItem>(node: HeatNode<T>, options: HeatLayoutOptions): HeatCell<T>[] {
  const { width, height } = options;
  const header = options.header ?? 3.4;
  const minW = options.minGroupWidth ?? 12;
  const minH = options.minGroupHeight ?? 7;
  const below = options.collapseBelow ?? 0.012;
  const expanded = options.expanded ?? new Set<string>();
  const cells: HeatCell<T>[] = [];

  /** Lays `parts` (stocks, "+N more") in a box and pushes their cells. */
  const fill = (leaves: readonly HeatNode<T>[], total: number, box: { x: number; y: number; width: number; height: number }, parentKey: string, scopeKey: string) => {
    const { shown, hidden } = expanded.has(scopeKey) ? { shown: [...leaves], hidden: [] as HeatNode<T>[] } : collapseSmall(leaves, total, below);
    const moreSize = hidden.reduce((s, h) => s + h.size, 0);
    const items = shown.map((l) => ({ id: l.key, size: l.size }));
    const moreId = `${scopeKey}${SEP}${MORE}`;
    if (hidden.length > 0) items.push({ id: moreId, size: moreSize });
    const layout = squarify(items, box);
    const byKey = new Map(shown.map((l) => [l.key, l]));
    for (const r of layout.rects) {
      if (r.id === moreId && hidden.length > 0) {
        cells.push({ kind: 'more', key: moreId, node: hidden[0]!, x: r.x, y: r.y, width: r.width, height: r.height, hidden, size: moreSize, change: weighted(hidden), parentKey });
      } else {
        const leaf = byKey.get(r.id)!;
        cells.push({ kind: 'stock', key: leaf.key, node: leaf, x: r.x, y: r.y, width: r.width, height: r.height, parentKey });
      }
    }
  };

  const top = squarify(node.children.map((c) => ({ id: c.key, size: c.size })), { width, height });
  const byKey = new Map(node.children.map((c) => [c.key, c]));
  // Stocks sitting directly at this level share one collapse pool; groups collapse inside their own box.
  const looseLeaves = node.children.filter((c) => c.item);
  const groupsHere = node.children.filter((c) => !c.item);
  if (groupsHere.length === 0) {
    fill(looseLeaves, node.size, { x: 0, y: 0, width, height }, '', '');
    return cells;
  }
  for (const r of top.rects) {
    const child = byKey.get(r.id)!;
    if (child.item) {
      cells.push({ kind: 'stock', key: child.key, node: child, x: r.x, y: r.y, width: r.width, height: r.height, parentKey: '' });
      continue;
    }
    cells.push({ kind: 'group', key: child.key, node: child, x: r.x, y: r.y, width: r.width, height: r.height, parentKey: '' });
    const strip = r.width >= minW && r.height >= minH ? header : 0;
    fill(child.leaves, child.size, { x: r.x, y: r.y + strip, width: r.width, height: r.height - strip }, child.key, child.key);
  }
  return cells;
}

/** The group header strip's height for a cell, in layout units (0 when too small to print). */
export function headerHeight(cell: { width: number; height: number }, options: Pick<HeatLayoutOptions, 'header' | 'minGroupWidth' | 'minGroupHeight'> = {}): number {
  return cell.width >= (options.minGroupWidth ?? 12) && cell.height >= (options.minGroupHeight ?? 7) ? (options.header ?? 3.4) : 0;
}
