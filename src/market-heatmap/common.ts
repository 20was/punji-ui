/** What the flat and the grouped heat map share: the item, the words, and the number text. Not a public module. */

export interface HeatmapItem {
  /** Unique, stable key (the symbol). */
  id: string;
  /** Printed on the tile. */
  label: string;
  /** The company's name, used in the tile's spoken name and in the data table. */
  name?: string;
  /** Area weight: turnover, market cap. Missing, zero and negative sizes are not drawn. */
  size: number | null;
  /** Change in percent (1.25 is +1.25%). Null draws a neutral tile marked "no change data". */
  change: number | null;
  /** Sector, then industry (then deeper): where the stock sits in a grouped map. Any item with a group makes the map grouped. Leave it out for a flat map. */
  group?: readonly string[];
  /** Where the stock's tile goes (a real link, through `LinkProvider` for an in-app path). In a grouped map it wins over `onSelect`. */
  href?: string;
}

export interface HeatmapLabels {
  unchanged: string;
  noChange: string;
  notSized: (count: number) => string;
  legend: string;
  dataSummary: string;
  symbol: string;
  name: string;
  size: string;
  change: string;
  noSize: string;
  areaNote: (sizeLabel: string) => string;
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

export const EN: HeatmapLabels = {
  unchanged: 'Unchanged', noChange: 'No change data', notSized: (n) => `${n} not drawn: no size`, legend: 'Colour scale: change since the previous close',
  dataSummary: 'View data as a table', symbol: 'Symbol', name: 'Name', size: 'Size', change: 'Change', noSize: 'No size', areaNote: (s) => `Tile area shows ${s}.`,
  all: 'All', levelNav: 'Heat map level', more: (n) => `+${n} more`, showMore: (n, names) => `Show ${n} more: ${names}`, openGroup: (n) => `Open ${n}`,
  groupHint: 'Arrow keys move between tiles, Enter opens a group or follows a link, Escape or Backspace goes up one level.',
  group: 'Group', total: 'Total', weight: 'weight', stocks: (n) => (n === 1 ? '1 stock' : `${n} stocks`),
};

export const signed = (c: number) => `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c).toFixed(2)}%`;
const SIZE = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export const defaultSize = (n: number) => SIZE.format(n);
export const trim = (n: number) => String(Math.round(n * 10) / 10);

export interface HeatLegendEntry { step: number | 'none'; text: string }
export function heatLegend(words: HeatmapLabels, scaleMax: number): HeatLegendEntry[] {
  const e1 = scaleMax / 3;
  const e2 = (2 * scaleMax) / 3;
  return [
    { step: -3, text: `< −${trim(e2)}%` }, { step: -2, text: `−${trim(e2)} to −${trim(e1)}%` }, { step: -1, text: `−${trim(e1)} to 0%` },
    { step: 0, text: words.unchanged },
    { step: 1, text: `0 to +${trim(e1)}%` }, { step: 2, text: `+${trim(e1)} to +${trim(e2)}%` }, { step: 3, text: `> +${trim(e2)}%` },
    { step: 'none', text: words.noChange },
  ];
}

/** The change as words for a screen reader ("up 1.25 percent"). */
export function spokenChange(change: number | null, words: HeatmapLabels): string {
  return change === null ? words.noChange : `${change > 0 ? 'up' : change < 0 ? 'down' : words.unchanged.toLowerCase()} ${Math.abs(change).toFixed(2)} percent`;
}

export const arrow = (c: number | null) => (c === null ? '' : c > 0 ? '▲' : c < 0 ? '▼' : '■');
