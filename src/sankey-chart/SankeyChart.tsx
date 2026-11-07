'use client';

/**
 * SankeyChart (design.punji.app/components/sankey-chart): where an amount came from and where it went, with each flow as
 * thick as its share. Built for an income statement (`incomeStatementFlow`) but generic: any `nodes` and `links` that
 * form a DAG in one currency, such as a budget ("where the money went").
 *
 * Exact: every amount is `Money` (bigint minor units). Node totals are summed in bigint, and the layout works on bigint
 * ratios (a node's height is `value / total * pixels`, the quotient taken in bigint); a number appears only as a pixel
 * coordinate. Percentages are bigint ratios rounded once, when printed. The layout follows d3-sankey's approach (node
 * depth by longest path, sinks justified to the last column, relaxation towards the weighted centre of linked nodes); the
 * code is our own, so no d3-sankey code ships.
 *
 * Never colour alone: every node prints its name, amount and share; a profit or a loss carries a sign, a triangle and the
 * word Profit or Loss; cost and loss nodes are hatched. Under a width where labels would collide the diagram becomes a
 * stacked list of the same flows (bars, amounts and shares), so nothing is ever cut or overlapped.
 *
 * Accessible alternative: ChartA11yShell (one focus stop, arrows/Home/End/Escape through the nodes, live region, spoken
 * summary, hidden tables of the nodes and of the flows).
 */
import { useId, type PointerEvent, type ReactNode } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { ChartTooltip, clamp, isNum, useMeasuredWidth } from '../internal/chartFrame.tsx';
import { percentText, ratioNumber } from '../internal/exactMath.ts';
import type { Money } from '../money/money.ts';
import { big, EmptyFigure, sharedCurrency, useMoneyText, type MoneyText } from '../money-chart/shared.tsx';

/** How a node is coloured. Direction tones carry a sign and a word as well: `gain` is a profit, `loss` a loss. */
export type SankeyTone = 'nepse' | 'chart' | 'series3' | 'gain' | 'loss' | 'rest';

export interface SankeyNode {
  /** Unique within the chart. */
  id: string;
  /** Printed and spoken. */
  label: string;
  /** Default: `nepse` for a node with nothing flowing in, `chart` for the rest. */
  tone?: SankeyTone;
}

export interface SankeyLink {
  /** A node id. */
  source: string;
  /** A node id. */
  target: string;
  /** A positive amount (its size). All links share one currency. */
  amount: Money;
}

export interface SankeyChartLabels {
  empty?: ReactNode;
  /** Table heads. */
  item?: string;
  amount?: string;
  share?: string;
  from?: string;
  to?: string;
  outcome?: string;
  /** Words for a `gain` and a `loss` node. Defaults "Profit" and "Loss". */
  profit?: string;
  loss?: string;
  /** Legend words by tone. */
  source?: string;
  total?: string;
  cost?: string;
  other?: string;
  hint?: string;
  summary?: (info: { nodes: number; links: number; base: string; baseAmount: string; outcomes: string[] }) => string;
}

export interface SankeyChartProps {
  /** The items, each with a unique `id`. Nodes with no link are left out. */
  nodes: readonly SankeyNode[];
  /** The flows between nodes: positive `Money` in one currency, forming no cycle. */
  links: readonly SankeyLink[];
  /** Names the chart and its data tables. */
  label: string;
  /** The id of the node that is 100% (such as `revenue`). Default: the node with the largest total. */
  base?: string;
  /** BCP 47 tag for the money format. Default "en-IN". */
  locale?: string;
  /** Height in CSS px of the diagram, clamped to 200..900; it grows when labels need the room. Default 380. */
  height?: number;
  /** Print the legend. Default true. */
  legend?: boolean;
  /** Pass false when a parent hides the chart and gives the same figures as a table. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: SankeyChartLabels;
  /** Becomes data-testid on the figure; each node gets `${testId}-${id}`. */
  testId?: string;
}

/* ------------------------------------------------------------------ model (exact) */

export interface SankeyModelNode {
  node: SankeyNode;
  index: number;
  tone: SankeyTone;
  /** The larger of what flows in and what flows out, in minor units. */
  value: bigint;
  inSum: bigint;
  outSum: bigint;
  /** Column: longest path from a node with nothing flowing in; nodes with nothing flowing out sit in the last column. */
  depth: number;
}

export interface SankeyModelLink {
  index: number;
  source: number;
  target: number;
  amount: bigint;
}

export interface SankeyModel {
  currency: string;
  nodes: SankeyModelNode[];
  links: SankeyModelLink[];
  columns: number[][];
  base: SankeyModelNode;
}

/**
 * Totals, columns and the 100% node for a set of nodes and links, exact. Nodes with no flow are dropped. Throws a
 * RangeError for a duplicate id, an unknown id, a negative amount or a cycle, and a TypeError for mixed currencies.
 */
export function sankeyModel(nodes: readonly SankeyNode[], links: readonly SankeyLink[], base?: string): SankeyModel | null {
  const ids = new Map<string, number>();
  nodes.forEach((n, i) => {
    if (ids.has(n.id)) throw new RangeError(`SankeyChart: duplicate node id "${n.id}"`);
    ids.set(n.id, i);
  });
  const currency = sharedCurrency(links.map((l) => l.amount));
  const used = links.filter((l) => big(l.amount) !== 0n);
  for (const l of used) {
    if (big(l.amount) < 0n) throw new RangeError('SankeyChart: link amounts are sizes; pass a positive amount');
    if (!ids.has(l.source) || !ids.has(l.target)) throw new RangeError(`SankeyChart: link ${l.source} to ${l.target} names an unknown node`);
    if (l.source === l.target) throw new RangeError('SankeyChart: a link cannot start and end at the same node');
  }
  if (used.length === 0) return null;
  const inSum = new Map<number, bigint>();
  const outSum = new Map<number, bigint>();
  const raw = used.map((l) => ({ s: ids.get(l.source)!, t: ids.get(l.target)!, a: big(l.amount) }));
  for (const l of raw) {
    outSum.set(l.s, (outSum.get(l.s) ?? 0n) + l.a);
    inSum.set(l.t, (inSum.get(l.t) ?? 0n) + l.a);
  }
  // Longest path by Kahn's algorithm; leftover nodes mean a cycle.
  const indeg = new Map<number, number>();
  for (const l of raw) indeg.set(l.t, (indeg.get(l.t) ?? 0) + 1);
  const depth = new Map<number, number>();
  const queue = [...new Set(raw.flatMap((l) => [l.s, l.t]))].filter((i) => !indeg.has(i));
  for (const i of queue) depth.set(i, 0);
  let seen = 0;
  while (queue.length) {
    const i = queue.shift()!;
    seen++;
    for (const l of raw) {
      if (l.s !== i) continue;
      depth.set(l.t, Math.max(depth.get(l.t) ?? 0, (depth.get(i) ?? 0) + 1));
      indeg.set(l.t, indeg.get(l.t)! - 1);
      if (indeg.get(l.t) === 0) queue.push(l.t);
    }
  }
  const touched = new Set(raw.flatMap((l) => [l.s, l.t]));
  if (seen !== touched.size) throw new RangeError('SankeyChart: the links form a cycle');
  const last = Math.max(...depth.values());
  const columnOf = (i: number) => ((outSum.get(i) ?? 0n) === 0n ? last : depth.get(i)!);
  // Column by column, then in the order given: the order the keyboard cursor reads.
  const order = [...touched].toSorted((a, b) => columnOf(a) - columnOf(b) || a - b);
  const model: SankeyModelNode[] = order.map((i) => {
    const node = nodes[i]!;
    const ins = inSum.get(i) ?? 0n;
    const outs = outSum.get(i) ?? 0n;
    return {
      node,
      index: i,
      tone: node.tone ?? (ins === 0n ? 'nepse' : 'chart'),
      value: ins > outs ? ins : outs,
      inSum: ins,
      outSum: outs,
      depth: columnOf(i),
    };
  });
  const at = new Map(model.map((m, k) => [m.index, k]));
  const columns: number[][] = Array.from({ length: last + 1 }, () => []);
  model.forEach((m, k) => columns[m.depth]!.push(k));
  let baseNode = model.reduce((a, b) => (b.value > a.value ? b : a));
  if (base !== undefined) {
    const chosen = model.find((m) => m.node.id === base);
    if (!chosen) throw new RangeError(`SankeyChart: base "${base}" is not a node with a flow`);
    baseNode = chosen;
  }
  return {
    currency,
    nodes: model,
    links: raw.map((l, index) => ({ index, source: at.get(l.s)!, target: at.get(l.t)!, amount: l.a })),
    columns,
    base: baseNode,
  };
}

/* ------------------------------------------------------------------ income statement helper */

export interface IncomeStatementLine {
  /** Optional stable id; default is derived from the position. */
  id?: string;
  label: string;
  /** A positive amount (a size). A zero line is left out. */
  amount: Money;
}

export interface IncomeStatementFlowInput {
  /** Revenue by source. One line draws no source column; several draw one node each. */
  revenue: readonly IncomeStatementLine[];
  /** Cost of revenue (cost of goods sold). */
  costOfRevenue?: Money;
  /** Operating expense lines (selling, research, administration ...). */
  operatingExpenses?: readonly IncomeStatementLine[];
  /** Income tax expense, as a positive amount. */
  tax?: Money;
  /** Names for the fixed nodes. */
  labels?: { revenue?: string; costOfRevenue?: string; tax?: string; netIncome?: string; netLoss?: string };
}

export interface IncomeStatementFlow {
  nodes: SankeyNode[];
  links: SankeyLink[];
  /** The id to pass as `base`: revenue is 100%. */
  base: string;
  /** Revenue less every cost, exact: positive is net income, negative a net loss. */
  net: bigint;
}

function size(m: Money): bigint {
  const v = big(m);
  if (v < 0n) throw new RangeError('incomeStatementFlow: amounts are sizes; pass a positive amount');
  return v;
}

const glyphOf = (m: SankeyModelNode) => (m.tone === 'gain' ? '▲' : m.tone === 'loss' ? '▼' : '');

/**
 * Revenue sources, revenue, and where it went: cost of revenue, each operating expense, tax, and net income. When costs
 * exceed revenue the shortfall enters as a `Net loss` node on the source side and pays the costs paid last (revenue
 * pays cost of revenue first, then each expense in order, then tax), so every node still balances in bigint.
 */
export function incomeStatementFlow(input: IncomeStatementFlowInput): IncomeStatementFlow {
  const L = { revenue: 'Revenue', costOfRevenue: 'Cost of revenue', tax: 'Income tax', netIncome: 'Net income', netLoss: 'Net loss', ...input.labels };
  const all = [...input.revenue.map((l) => l.amount), ...(input.operatingExpenses ?? []).map((l) => l.amount), ...[input.costOfRevenue, input.tax].filter((m): m is Money => !!m)];
  const currency = sharedCurrency(all);
  const mk = (minor: bigint): Money => ({ minor, currency });
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const sources = input.revenue.filter((l) => size(l.amount) > 0n);
  const revenue = sources.reduce((a, l) => a + size(l.amount), 0n);
  nodes.push({ id: 'revenue', label: L.revenue, tone: 'chart' });
  if (sources.length > 1) {
    sources.forEach((l, i) => {
      const id = l.id ?? `revenue-${i + 1}`;
      nodes.push({ id, label: l.label, tone: 'nepse' });
      links.push({ source: id, target: 'revenue', amount: mk(size(l.amount)) });
    });
  }
  const costs: { id: string; label: string; amount: bigint }[] = [];
  if (input.costOfRevenue && size(input.costOfRevenue) > 0n) costs.push({ id: 'cost-of-revenue', label: L.costOfRevenue, amount: size(input.costOfRevenue) });
  (input.operatingExpenses ?? []).forEach((l, i) => {
    if (size(l.amount) > 0n) costs.push({ id: l.id ?? `expense-${i + 1}`, label: l.label, amount: size(l.amount) });
  });
  if (input.tax && size(input.tax) > 0n) costs.push({ id: 'tax', label: L.tax, amount: size(input.tax) });
  let left = revenue;
  let shortfall = 0n;
  for (const c of costs) {
    const paid = c.amount < left ? c.amount : left;
    const gap = c.amount - paid;
    left -= paid;
    shortfall += gap;
    nodes.push({ id: c.id, label: c.label, tone: 'series3' });
    if (paid > 0n) links.push({ source: 'revenue', target: c.id, amount: mk(paid) });
    if (gap > 0n) links.push({ source: 'net-loss', target: c.id, amount: mk(gap) });
  }
  if (shortfall > 0n) nodes.push({ id: 'net-loss', label: L.netLoss, tone: 'loss' });
  if (left > 0n) {
    nodes.push({ id: 'net-income', label: L.netIncome, tone: 'gain' });
    links.push({ source: 'revenue', target: 'net-income', amount: mk(left) });
  }
  return { nodes, links, base: 'revenue', net: left - shortfall };
}

/* ------------------------------------------------------------------ layout (pixels) */

const NODE_W = 10;
const PAD = 10;
const TOP = 8;
const RIGHT = 172;
const LEFT = 2;
const MIN_STEP = 120;
const LINE_H = 13;

interface Placed {
  m: SankeyModelNode;
  k: number;
  x: number;
  /** The node's rectangle. */
  y: number;
  h: number;
  /** The label's slot (at least the label's height). */
  slot: number;
  lines: number;
}
interface PlacedLink {
  l: SankeyModelLink;
  y0: number;
  y1: number;
  w: number;
}
interface Layout {
  height: number;
  nodes: Placed[];
  links: PlacedLink[];
  step: number;
}

const linesOf = (m: SankeyModelNode) => (m.tone === 'gain' || m.tone === 'loss' ? 3 : 2);

/** Pixel layout for a width. Node and link sizes are bigint ratios of the tightest column; relaxation only moves positions. */
function layoutSankey(model: SankeyModel, width: number, wanted: number): Layout {
  const cols = model.columns.length;
  const step = (width - LEFT - NODE_W - RIGHT) / Math.max(1, cols - 1);
  let height = wanted;
  let out: Layout | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const avail = Math.floor(height) - TOP * 2;
    // The tightest column sets the pixels per unit.
    let refPx = 0;
    let refSum = 0n;
    model.columns.forEach((col, c) => {
      const px = Math.max(1, avail - (col.length - 1) * PAD);
      const sum = col.reduce((a, k) => a + model.nodes[k]!.value, 0n);
      if (c === 0 || BigInt(px) * refSum < BigInt(refPx) * sum) {
        refPx = px;
        refSum = sum;
      }
    });
    const hOf = (v: bigint) => Math.max(0, ratioNumber(v, refSum) * refPx);
    const placed: Placed[] = model.nodes.map((m, k) => {
      const h = Math.max(2, hOf(m.value));
      const lines = linesOf(m);
      return { m, k, x: LEFT + m.depth * step, y: 0, h, slot: Math.max(h, lines * LINE_H + 2), lines };
    });
    let need = 0;
    for (const col of model.columns) {
      let y = TOP;
      for (const k of col) {
        placed[k]!.y = y;
        y += placed[k]!.slot + PAD;
      }
      need = Math.max(need, y - PAD + TOP);
    }
    if (need > height + 0.5 && attempt < 7 && height < 1400) {
      height = Math.ceil(need);
      continue;
    }
    const bottom = Math.max(height, need) - TOP;
    const centre = (p: Placed) => p.y + p.slot / 2;
    const settle = (col: number[]) => {
      const list = col.map((k) => placed[k]!).toSorted((a, b) => a.y - b.y);
      let y = TOP;
      for (const p of list) {
        p.y = Math.max(p.y, y);
        y = p.y + p.slot + PAD;
      }
      let limit = bottom;
      for (const p of list.toReversed()) {
        p.y = Math.min(p.y, limit - p.slot);
        limit = p.y - PAD;
      }
      let floor = TOP;
      for (const p of list) {
        p.y = Math.max(p.y, floor);
        floor = p.y + p.slot + PAD;
      }
    };
    const pull = (p: Placed, side: 'in' | 'out') => {
      let sum = 0;
      let weight = 0;
      for (const l of model.links) {
        const other = side === 'in' ? (l.target === p.k ? l.source : -1) : l.source === p.k ? l.target : -1;
        if (other < 0) continue;
        const w = ratioNumber(l.amount, refSum);
        sum += centre(placed[other]!) * w;
        weight += w;
      }
      if (weight > 0) p.y = sum / weight - p.slot / 2;
    };
    for (let it = 0; it < 6; it++) {
      for (let c = 1; c < cols; c++) {
        for (const k of model.columns[c]!) pull(placed[k]!, 'in');
        settle(model.columns[c]!);
      }
      for (let c = cols - 2; c >= 0; c--) {
        for (const k of model.columns[c]!) pull(placed[k]!, 'out');
        settle(model.columns[c]!);
      }
    }
    // The rectangle sits in the middle of its slot.
    for (const p of placed) p.y += (p.slot - p.h) / 2;
    // Links stack along each node, ordered by the other end's height.
    const outAt = new Map<number, number>();
    const inAt = new Map<number, number>();
    const links = new Map<number, PlacedLink>();
    const widthOf = (l: SankeyModelLink) => Math.max(1, hOf(l.amount));
    const sorted = (k: number, side: 'out' | 'in') =>
      model.links.filter((l) => (side === 'out' ? l.source : l.target) === k).toSorted((a, b) => centre(placed[side === 'out' ? a.target : a.source]!) - centre(placed[side === 'out' ? b.target : b.source]!));
    for (const p of placed) {
      let cursor = p.y;
      for (const l of sorted(p.k, 'out')) {
        outAt.set(l.index, cursor + widthOf(l) / 2);
        cursor += widthOf(l);
      }
      cursor = p.y;
      for (const l of sorted(p.k, 'in')) {
        inAt.set(l.index, cursor + widthOf(l) / 2);
        cursor += widthOf(l);
      }
    }
    for (const l of model.links) links.set(l.index, { l, y0: outAt.get(l.index)!, y1: inAt.get(l.index)!, w: widthOf(l) });
    out = { height: Math.max(height, need), nodes: placed, links: model.links.map((l) => links.get(l.index)!), step };
    break;
  }
  return out!;
}

/* ------------------------------------------------------------------ component */

const trim = (text: string, px: number) => {
  const max = Math.max(4, Math.floor(px / 6.2));
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
};

/**
 * @stability beta
 */
export function SankeyChart(props: SankeyChartProps) {
  const model = props.links.length === 0 ? null : sankeyModel(props.nodes, props.links, props.base);
  if (!model) return <EmptyFigure label={props.label} testId={props.testId}>{props.labels?.empty ?? 'No data'}</EmptyFigure>;
  return <Sankey {...props} model={model} />;
}

function Sankey({ model, label, locale, height = 380, legend = true, interactive = true, labels, testId }: SankeyChartProps & { model: SankeyModel }) {
  const text = useMoneyText(model.currency, locale);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { ref, width } = useMeasuredWidth(640);
  const L = {
    item: labels?.item ?? 'Item',
    amount: labels?.amount ?? 'Amount',
    share: labels?.share ?? 'Share of',
    from: labels?.from ?? 'From',
    to: labels?.to ?? 'To',
    outcome: labels?.outcome ?? 'Result',
    profit: labels?.profit ?? 'Profit',
    loss: labels?.loss ?? 'Loss',
  };
  const baseValue = model.base.value;
  const baseName = model.base.node.label;
  const pct = (v: bigint) => `${percentText(v, baseValue)}%`;
  const wordOf = (m: SankeyModelNode) => (m.tone === 'gain' ? L.profit : m.tone === 'loss' ? L.loss : '');
  const amountOf = (m: SankeyModelNode) => (m.tone === 'gain' ? text.signed(m.value) : m.tone === 'loss' ? text.signed(-m.value) : text.plain(m.value));
  const name = (k: number) => model.nodes[k]!.node.label;
  const n = model.nodes.length;
  const wide = (width - LEFT - NODE_W - RIGHT) / Math.max(1, model.columns.length - 1) >= MIN_STEP;
  const outcomes = model.nodes.filter((m) => m.tone === 'gain' || m.tone === 'loss').map((m) => `${m.node.label} ${wordOf(m)} ${text.spoken(m.value)}, ${pct(m.value)} of ${baseName}`);
  const summary = (labels?.summary ?? ((i) => `${label}: ${i.nodes} items and ${i.links} flows. ${i.base} ${i.baseAmount} is 100 percent.${i.outcomes.length ? ` ${i.outcomes.join('. ')}.` : ''}`))({
    nodes: n,
    links: model.links.length,
    base: baseName,
    baseAmount: text.spoken(baseValue),
    outcomes,
  });
  const flowsOf = (k: number, side: 'source' | 'target') => model.links.filter((l) => l[side] === k);
  const speak = (k: number) => {
    const m = model.nodes[k]!;
    const ins = flowsOf(k, 'target').map((l) => `${name(l.source)} ${text.spoken(l.amount)}`);
    const outs = flowsOf(k, 'source').map((l) => `${name(l.target)} ${text.spoken(l.amount)}`);
    return [
      `${m.node.label}: ${m.tone === 'loss' ? 'minus ' : ''}${text.spoken(m.value)}, ${pct(m.value)} of ${baseName}`,
      wordOf(m),
      ins.length ? `from ${ins.join(', ')}` : '',
      outs.length ? `to ${outs.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('. ');
  };
  const tones = [...new Set(model.nodes.map((m) => m.tone))];
  const toneWord: Record<SankeyTone, string> = { nepse: labels?.source ?? 'Source', chart: labels?.total ?? 'Total', series3: labels?.cost ?? 'Cost', gain: `▲ ${L.profit}`, loss: `▼ ${L.loss}`, rest: labels?.other ?? 'Other' };
  return (
    <ChartA11yShell
      className="kit-ct pu-sk"
      label={label}
      roleDescription="flow chart"
      count={n}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between items, Home and End to jump to the first and last.'}
      summary={summary}
      speak={speak}
      footer={
        legend ? (
          <ul className="kit-ct-legend pu-st-legend" aria-hidden="true">
            {tones.map((t) => (
              <li key={t}>
                <i className={`pu-st-sw ${t}`} />
                {toneWord[t]}
              </li>
            ))}
          </ul>
        ) : undefined
      }
      table={
        <>
          <ChartDataTable
            caption={label}
            head={[L.item, L.amount, `${L.share} ${baseName}`, L.outcome]}
            rows={model.nodes.map((m) => ({ key: m.node.id, head: m.node.label, cells: [amountOf(m), pct(m.value), wordOf(m)] }))}
          />
          <ChartDataTable
            caption={`${label}: flows`}
            head={[L.from, L.to, L.amount, `${L.share} ${baseName}`]}
            rows={model.links.map((l) => ({ key: String(l.index), head: name(l.source), cells: [name(l.target), text.plain(l.amount), pct(l.amount)] }))}
          />
        </>
      }
    >
      {(ctx) => {
        const onPointer = (e: PointerEvent<HTMLDivElement>) => {
          const el = (e.target as Element).closest?.('[data-node]');
          const i = el ? Number(el.getAttribute('data-node')) : NaN;
          ctx.pointerTo(isNum(i) && i >= 0 && i < n ? i : null);
        };
        const idx = ctx.index;
        const touches = (l: SankeyModelLink) => idx !== null && (l.source === idx || l.target === idx);
        if (!wide) {
          return (
            <div ref={ref} className="kit-ct-area pu-sk-stack-area">
              {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
              <div className="kit-ct-plot pu-sk-stack" {...ctx.plotProps(onPointer)}>
                <StackList model={model} text={text} pct={pct} amountOf={amountOf} wordOf={wordOf} active={idx} />
              </div>
            </div>
          );
        }
        const lay = layoutSankey(model, width, clamp(isNum(height) ? height : 380, 200, 900));
        const lastCol = model.columns.length - 1;
        const tip = idx === null ? null : lay.nodes[idx]!;
        return (
          <div ref={ref} className="kit-ct-area" style={{ height: lay.height }}>
            {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
            <div className="kit-ct-plot" {...ctx.plotProps(onPointer)}>
              <svg width={width} height={lay.height} viewBox={`0 0 ${width} ${lay.height}`} aria-hidden="true" focusable="false">
                <defs>
                  <pattern id={`${uid}h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" className="pu-mc-hatch" /></pattern>
                </defs>
                <g>
                  {lay.links.map(({ l, y0, y1, w }) => {
                    const a = lay.nodes[l.source]!;
                    const b = lay.nodes[l.target]!;
                    const x0 = a.x + NODE_W;
                    const x1 = b.x;
                    const xm = (x0 + x1) / 2;
                    const t = b.m.tone === 'chart' || b.m.tone === 'rest' ? a.m.tone : b.m.tone;
                    return <path key={l.index} className={`pu-sk-link ${t}${idx === null ? '' : touches(l) ? ' on' : ' off'}`} d={`M${x0.toFixed(1)},${y0.toFixed(1)} C${xm.toFixed(1)},${y0.toFixed(1)} ${xm.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`} strokeWidth={w.toFixed(2)} />;
                  })}
                </g>
                {lay.nodes.map((p) => {
                  const hatched = p.m.tone === 'series3' || p.m.tone === 'loss';
                  const right = p.m.depth < lastCol;
                  const lw = right ? lay.step - NODE_W - 12 : RIGHT - 12;
                  const cx = p.x + NODE_W + 6;
                  const cy = p.y + p.h / 2 - (p.lines * LINE_H) / 2;
                  const signed = p.m.tone === 'gain' || p.m.tone === 'loss';
                  const amt = signed ? text.signedCompact(p.m.tone === 'loss' ? -p.m.value : p.m.value) : text.compact(p.m.value);
                  return (
                    <g key={p.m.node.id} data-node={p.k} data-testid={testId ? `${testId}-${p.m.node.id}` : undefined}>
                      <rect className={`pu-sk-node ${p.m.tone}${idx === p.k ? ' on' : ''}`} x={p.x} y={p.y} width={NODE_W} height={p.h} rx={2} />
                      {hatched && <rect className="pu-mc-bar-hatch" x={p.x} y={p.y} width={NODE_W} height={p.h} rx={2} fill={`url(#${uid}h)`} />}
                      <text className="pu-sk-text" x={cx} y={cy + LINE_H - 3}>
                        <tspan className="pu-sk-name">{trim(p.m.node.label, lw)}</tspan>
                        <tspan x={cx} dy={LINE_H}>{trim(`${amt} · ${pct(p.m.value)}`, lw)}</tspan>
                        {signed && <tspan x={cx} dy={LINE_H}>{`${glyphOf(p.m)} ${wordOf(p.m)}`}</tspan>}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {tip && (
                <ChartTooltip x={tip.x + NODE_W / 2} width={width} testId={testId ? `${testId}-tip` : undefined}>
                  <NodeTip m={tip.m} text={text} pct={pct} amountOf={amountOf} wordOf={wordOf} baseName={baseName} />
                </ChartTooltip>
              )}
            </div>
          </div>
        );
      }}
    </ChartA11yShell>
  );
}

interface TipProps {
  text: MoneyText;
  pct: (v: bigint) => string;
  amountOf: (m: SankeyModelNode) => string;
  wordOf: (m: SankeyModelNode) => string;
}

function NodeTip({ m, pct, amountOf, wordOf, baseName }: TipProps & { m: SankeyModelNode; baseName: string }) {
  return (
    <>
      <b>{m.node.label}</b>
      <dl>
        <div><dt>Amount</dt><dd>{glyphOf(m) ? `${glyphOf(m)} ` : ''}{amountOf(m)}</dd></div>
        <div><dt>{baseName}</dt><dd>{pct(m.value)}</dd></div>
        {wordOf(m) && <div><dt>Result</dt><dd>{wordOf(m)}</dd></div>}
      </dl>
    </>
  );
}

/** The narrow layout: one block per node that sends something on, a bar per flow. Nothing to collide. */
function StackList({ model, text, pct, amountOf, wordOf, active }: TipProps & { model: SankeyModel; active: number | null }) {
  const max = model.nodes.reduce((a, m) => (m.value > a ? m.value : a), 0n);
  const bar = (v: bigint) => `${Math.max(1.5, ratioNumber(v, max) * 100).toFixed(1)}%`;
  const heads = model.columns.flat().filter((k) => model.nodes[k]!.outSum > 0n);
  const row = (k: number, amount: bigint, tone: SankeyTone, key: string) => {
    const m = model.nodes[k]!;
    const signedNode = m.tone === 'gain' || m.tone === 'loss';
    return (
      <li key={key} className={`pu-sk-row${active === k ? ' on' : ''}`} data-node={k}>
        <span className="pu-sk-row-name">{m.node.label}</span>
        <span className="pu-sk-row-amt">{signedNode ? `${glyphOf(m)} ${amountOf(m)}` : text.plain(amount)}</span>
        <span className="pu-sk-row-pct">{pct(amount)}</span>
        <span className="pu-sk-row-bar" aria-hidden="true"><i className={tone} style={{ width: bar(amount) }} /></span>
        {signedNode && <span className="pu-sk-row-word">{wordOf(m)}</span>}
      </li>
    );
  };
  return (
    <div className="pu-sk-groups" aria-hidden="true">
      {heads.map((k) => {
        const m = model.nodes[k]!;
        return (
          <div key={m.node.id} className={`pu-sk-group${active === k ? ' on' : ''}`} data-node={k}>
            <div className="pu-sk-head">
              <span>{m.node.label}</span>
              <span>{text.plain(m.value)} {'·'} {pct(m.value)}</span>
            </div>
            <ul className="pu-sk-rows">
              {model.links
                .filter((l) => l.source === k)
                .map((l) => {
                  const t = model.nodes[l.target]!;
                  return row(l.target, l.amount, t.tone === 'chart' || t.tone === 'rest' ? m.tone : t.tone, `${l.index}`);
                })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
