'use client';

/**
 * MarketHeatmap: a treemap of symbols. A tile's area is its size (turnover,
 * market cap), its fill is the change on a diverging scale with a legend, and
 * each tile prints its symbol and signed change, so colour is never the only
 * signal. Beneath it a "View data" table lists every item, including those too
 * small to label and those with no usable size. The layout is a pure function
 * (`squarify`), so the same data draws the same map.
 *
 * For sector, industry and stock groups with drill-in, use `GroupedMarketHeatmap` from `@punji/ui/market-heatmap-grouped`;
 * it is a separate module so this flat map does not carry its code.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react';

import { quoteChangePercent, type Quote } from '../stock-table/quotes.ts';
import { defaultSize, EN, heatLegend, signed, type HeatmapItem, type HeatmapLabels } from './common.ts';
import { heatStep, squarify, type TreemapRect } from './treemap.ts';

export type { HeatmapItem, HeatmapLabels } from './common.ts';

export { heatStep, squarify } from './treemap.ts';
export type { TreemapBounds, TreemapItem, TreemapLayout, TreemapRect } from './treemap.ts';

/** Items for the map from quotes, sized by turnover or volume (display scale: minor units become a float). */
export function heatmapItemsFromQuotes(quotes: readonly Quote[], by: 'turnover' | 'volume' = 'turnover'): HeatmapItem[] {
  return quotes.map((q) => ({
    id: q.symbol,
    label: q.symbol,
    name: q.name,
    size: by === 'turnover' ? (q.turnover === null ? null : Number(q.turnover) / 100) : q.volume,
    change: quoteChangePercent(q),
  }));
}

export interface MarketHeatmapProps {
  /** What to draw. The layout orders tiles by size; items without a positive size are listed under the map and in the table but not drawn. */
  items: readonly HeatmapItem[];
  /** Names the map ("NEPSE turnover heatmap"). */
  label: string;
  /** What area means, printed in the legend and table head ("Turnover"). */
  sizeLabel?: string;
  /** Format a size for the table and tile tooltip. Default: grouped number. */
  formatSize?: (size: number) => string;
  /** Percent beyond which a tile has the deepest colour. Default 3. */
  scaleMax?: number;
  /** Width over height of the map. Default 1.5; use about 1 on a phone. */
  aspect?: number;
  /** Per-instance override of which hue means up: 'green-up' or 'red-up' (absolute, never a second swap on top of the theme). Default: follow the theme's gain and loss colours (`createTheme({ finance })`), which is the one place to set the convention. */
  convention?: 'green-up' | 'red-up';
  /** Tiles become buttons that call this with the item's id. */
  onSelect?: (id: string) => void;
  /** Overrides for the legend, table and tile words, in the reader's language. */
  labels?: Partial<HeatmapLabels>;
  /** Sets `data-testid` on the figure. */
  testId?: string;
}

/**
 * @stability experimental
 */
export function MarketHeatmap({ items, label, sizeLabel = 'Size', formatSize = defaultSize, scaleMax = 3, aspect = 1.5, convention, onSelect, labels, testId }: MarketHeatmapProps) {
  const words = { ...EN, ...labels };
  const W = 100;
  const H = W / aspect;
  const layout = useMemo(() => squarify(items.map((i) => ({ id: i.id, size: i.size })), { width: W, height: H }), [items, H]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const legend = heatLegend(words, scaleMax);
  const tileStyle = (r: TreemapRect): CSSProperties => ({ left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%`, width: `${(r.width / W) * 100}%`, height: `${(r.height / H) * 100}%` });
  // Share of the map's width and height decides how much a tile can print: nothing, the symbol, or the symbol and change.
  const sizeClass = (r: TreemapRect) => {
    const wp = (r.width / W) * 100;
    const hp = (r.height / H) * 100;
    return wp < 7 || hp < 10 ? 'xs' : wp < 13 || hp < 16 ? 'sm' : 'md';
  };
  const listed: ReactNode[] = layout.rects.map((r) => {
    const item = byId.get(r.id)!;
    const step = heatStep(item.change, scaleMax);
    const text = item.change === null ? '—' : signed(item.change);
    const spoken = `${item.label}${item.name ? `, ${item.name}` : ''}, ${sizeLabel} ${formatSize(item.size!)}, ${item.change === null ? words.noChange : `${item.change > 0 ? 'up' : item.change < 0 ? 'down' : words.unchanged.toLowerCase()} ${Math.abs(item.change).toFixed(2)} percent`}`;
    const body = (
      <>
        <b className="pu-heat-sym">{item.label}</b>
        <span className="pu-heat-chg" aria-hidden="true">{item.change === null ? '' : `${item.change > 0 ? '▲' : item.change < 0 ? '▼' : '■'} ${text}`}</span>
        <span className="kit-sr">{spoken.slice(item.label.length)}</span>
      </>
    );
    return (
      <li key={item.id} className="pu-heat-tile" style={tileStyle(r)} data-step={step ?? 'none'} data-size={sizeClass(r)} title={spoken}>
        {onSelect
          ? <button type="button" onClick={() => onSelect(item.id)}>{body}</button>
          : <div role="group" aria-label={spoken}>{body}</div>}
      </li>
    );
  });

  return (
    <figure className="pu-heat" data-convention={convention} data-testid={testId}>
      <figcaption className="pu-heat-title">{label}</figcaption>
      {layout.rects.length === 0 ? (
        <p className="pu-heat-empty" role="status">{words.noSize}</p>
      ) : (
        <ul className="pu-heat-map" aria-label={label} style={{ aspectRatio: String(aspect) }}>{listed}</ul>
      )}
      {layout.skipped.length > 0 && <p className="pu-heat-skipped" role="status">{words.notSized(layout.skipped.length)}: {layout.skipped.join(', ')}</p>}
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
            <thead><tr><th scope="col">{words.symbol}</th><th scope="col" className="num">{sizeLabel}</th><th scope="col" className="num">{words.change}</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <th scope="row">{i.label}{i.name && <span className="sub">{i.name}</span>}</th>
                  <td className="num">{i.size !== null && Number.isFinite(i.size) && i.size > 0 ? formatSize(i.size) : words.noSize}</td>
                  <td className="num">{i.change === null ? '—' : signed(i.change)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
