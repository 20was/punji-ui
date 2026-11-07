
/**
 * StyleGrid (design.punji.app/components/style-grid): a 3 by 3 grid of size (large, mid, small) by style (value, blend,
 * growth) for placing a fund or a portfolio. The selected cell is ringed, marked with a tick and spelled in words;
 * optional weights per cell (percent, exact decimals) are printed in each cell and shade it, and their exact total is
 * printed under the grid. The name is generic: the grid is a plain size and style matrix, not any vendor's product.
 * The placement and the weights come from the app (your own classification); this component only draws them.
 *
 * Accessible alternative: ChartA11yShell (one focus stop; Left/Right step through the nine cells, Up/Down jump a row,
 * Home/End, Escape; live region; spoken summary; hidden table of size by style with the weights).
 */
import type { KeyboardEvent } from 'react';

import { ChartA11yShell, ChartDataTable } from '../chart-a11y/ChartA11yShell.tsx';
import { isNum } from '../internal/chartFrame.tsx';
import { alignScale, parseDecimal, type Scaled } from '../internal/decimal.ts';

export type StyleGridSize = 'large' | 'mid' | 'small';
export type StyleGridStyle = 'value' | 'blend' | 'growth';

export interface StyleGridCell {
  /** The row: large, mid or small. */
  size: StyleGridSize;
  /** The column: value, blend or growth. */
  style: StyleGridStyle;
  /** The share in this cell, in percent: a decimal string ("64.5") or a number. Not a valid non-negative decimal: no weight. */
  weight?: string | number;
}

export interface StyleGridPlacement {
  /** The row of the selected cell. */
  size: StyleGridSize;
  /** The column of the selected cell. */
  style: StyleGridStyle;
}

export interface StyleGridLabels {
  /** The three sizes, large first. Defaults Large, Mid, Small. */
  sizes?: Partial<Record<StyleGridSize, string>>;
  /** The three styles. Defaults Value, Blend, Growth. */
  styles?: Partial<Record<StyleGridStyle, string>>;
  /** The table's row-head column. Default "Size". */
  size?: string;
  /** The axis caption over the styles. Default "Style". */
  style?: string;
  /** The weight column and caption. Default "Weight". */
  weight?: string;
  /** Marks the placement. Default "Selected". */
  selected?: string;
  /** The total line. Default "Total". */
  total?: string;
  /** A cell with no weight, in the table. Default "—". */
  noWeight?: string;
  /** Joins size and style into a cell name: ("Large", "growth") => "Large growth". */
  cellName?: (size: string, style: string) => string;
  hint?: string;
  summary?: (info: { selected: string; largest: string; largestWeight: string }) => string;
  /** Names the grid when nothing is selected. Default "No cell selected". */
  none?: string;
}

export interface StyleGridProps {
  /** Optional weights per cell. Cells not listed have no weight. A cell listed twice keeps the last. */
  cells?: readonly StyleGridCell[];
  /** The cell to mark as the placement. */
  selected?: StyleGridPlacement | null;
  /** Names the grid and its data table. */
  label: string;
  /** Pass false when a parent hides the grid and gives the same figures another way. */
  interactive?: boolean;
  /** Overrides for the printed and spoken words. */
  labels?: StyleGridLabels;
  /** Layout only (margin, grid placement). */
  className?: string;
  /** Becomes data-testid on the figure; each cell is `${testId}-${size}-${style}`. */
  testId?: string;
}

const SIZES: readonly StyleGridSize[] = ['large', 'mid', 'small'];
const STYLES: readonly StyleGridStyle[] = ['value', 'blend', 'growth'];
const SIZE_WORDS: Record<StyleGridSize, string> = { large: 'Large', mid: 'Mid', small: 'Small' };
const STYLE_WORDS: Record<StyleGridStyle, string> = { value: 'Value', blend: 'Blend', growth: 'Growth' };

/** "64.50" as typed, without a leading plus; null when it is not a non-negative decimal. */
function weightOf(v: string | number | undefined): Scaled | null {
  if (v === undefined) return null;
  const s = typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : v;
  if (/e/i.test(s)) return null;
  const p = parseDecimal(s);
  return p && p.n >= 0n ? p : null;
}

/** A bigint at a scale as a decimal with no trailing zeros ("64.5", "100"). */
export function scaledText(n: bigint, scale: number): string {
  const div = 10n ** BigInt(scale);
  const whole = (n / div).toString();
  const frac = scale > 0 ? (n % div).toString().padStart(scale, '0').replace(/0+$/, '') : '';
  return frac ? `${whole}.${frac}` : whole;
}

/** The exact total of the weights as text, or null with none. Pure. */
export function styleGridTotal(cells: readonly StyleGridCell[]): string | null {
  const ws = cells.map((c) => weightOf(c.weight)).filter((w): w is Scaled => w !== null);
  if (ws.length === 0) return null;
  const { units, scale } = alignScale(ws);
  return scaledText(units.reduce((s, u) => s + u, 0n), scale);
}

interface Slot {
  size: StyleGridSize;
  style: StyleGridStyle;
  weight: Scaled | null;
}

/**
 * @stability beta
 */
export function StyleGrid({ cells = [], selected = null, label, interactive = true, labels, className, testId }: StyleGridProps) {
  const sizes = { ...SIZE_WORDS, ...labels?.sizes };
  const styles = { ...STYLE_WORDS, ...labels?.styles };
  const L = {
    size: labels?.size ?? 'Size',
    style: labels?.style ?? 'Style',
    weight: labels?.weight ?? 'Weight',
    selected: labels?.selected ?? 'Selected',
    total: labels?.total ?? 'Total',
    noWeight: labels?.noWeight ?? '—',
    none: labels?.none ?? 'No cell selected',
    name: labels?.cellName ?? ((s: string, t: string) => `${s} ${t.toLowerCase()}`),
  };
  const latest = new Map<string, StyleGridCell>();
  for (const c of cells) latest.set(`${c.size}/${c.style}`, c);
  const slots: Slot[] = SIZES.flatMap((size) => STYLES.map((style) => ({ size, style, weight: weightOf(latest.get(`${size}/${style}`)?.weight) })));
  const nameOf = (s: Slot) => L.name(sizes[s.size], styles[s.style]);
  const weightText = (s: Slot) => (s.weight ? `${scaledText(s.weight.n, s.weight.scale)}%` : L.noWeight);
  const isSel = (s: Slot) => selected !== null && selected.size === s.size && selected.style === s.style;
  const selSlot = slots.find(isSel);
  const total = styleGridTotal([...latest.values()]);
  const weighted = slots.filter((s) => s.weight);
  let largest: Slot | null = null;
  for (const s of weighted) if (!largest || s.weight!.n * 10n ** BigInt(Math.max(0, largest.weight!.scale - s.weight!.scale)) > largest.weight!.n * 10n ** BigInt(Math.max(0, s.weight!.scale - largest.weight!.scale))) largest = s;
  const summary = (
    labels?.summary ??
    ((i) => `${label}: ${i.selected}.${i.largest ? ` Largest weight ${i.largest} at ${i.largestWeight}.` : ''}`)
  )({
    selected: selSlot ? `${L.selected} ${nameOf(selSlot)}${selSlot.weight ? `, ${weightText(selSlot)}` : ''}` : L.none,
    largest: largest ? nameOf(largest) : '',
    largestWeight: largest ? weightText(largest) : '',
  });
  // A light shade step (0 to 5) that repeats the printed weight; the number is always in the cell.
  const shade = (s: Slot): number => {
    if (!s.weight) return 0;
    const v = Number(s.weight.n) / 10 ** s.weight.scale;
    return !isNum(v) || v <= 0 ? 0 : v <= 5 ? 1 : v <= 12 ? 2 : v <= 20 ? 3 : v <= 30 ? 4 : 5;
  };
  return (
    <ChartA11yShell
      className={`kit-ct pu-sg${className ? ` ${className}` : ''}`}
      label={label}
      roleDescription="size and style grid"
      count={slots.length}
      testId={testId}
      interactive={interactive}
      hint={labels?.hint ?? 'Use the left and right arrow keys to move between cells, up and down to change row, Home and End to jump to the first and last.'}
      summary={summary}
      speak={(i) => `${nameOf(slots[i]!)}, ${weightText(slots[i]!)}${isSel(slots[i]!) ? `, ${L.selected.toLowerCase()}` : ''}`}
      footer={
        <>
          {selSlot && (
            <p className="pu-sg-sel"><b aria-hidden="true">✓</b> {L.selected}: <b>{nameOf(selSlot)}</b>{selSlot.weight ? <> <span>{weightText(selSlot)}</span></> : null}</p>
          )}
          {total !== null && <p className="pu-sg-total">{L.total} <b>{total}%</b></p>}
        </>
      }
      table={
        <ChartDataTable
          caption={label}
          head={[L.size, ...STYLES.map((t) => styles[t])]}
          rows={SIZES.map((size) => ({
            key: size,
            head: sizes[size],
            cells: STYLES.map((style) => {
              const s = slots.find((x) => x.size === size && x.style === style)!;
              return `${weightText(s)}${isSel(s) ? ` (${L.selected.toLowerCase()})` : ''}`;
            }),
          }))}
          note={total !== null ? <p>{`${L.total}: ${total}%`}</p> : undefined}
        />
      }
    >
      {(ctx) => {
        const props = ctx.plotProps((e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const col = Math.min(3, Math.max(0, Math.floor(((e.clientX - r.left - 56) / Math.max(1, r.width - 56)) * 3)));
          const row = Math.min(2, Math.max(0, Math.floor(((e.clientY - r.top - 28) / Math.max(1, r.height - 28)) * 3)));
          ctx.pointerTo(e.clientX - r.left < 56 || e.clientY - r.top < 28 ? null : row * 3 + Math.min(2, col));
        });
        const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
          if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !e.altKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const at = ctx.index;
            const next = at === null ? (e.key === 'ArrowDown' ? 0 : 8) : e.key === 'ArrowDown' ? (at <= 5 ? at + 3 : at) : at >= 3 ? at - 3 : at;
            ctx.pointerTo(next);
            return;
          }
          props.onKeyDown?.(e);
        };
        return (
          <div className="kit-ct-area pu-sg-area">
            {/* The grid is the one focus stop: arrows move across the cells. */}
            {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-static-element-interactions */}
            <div className="kit-ct-plot pu-sg-plot" {...props} onKeyDown={interactive ? onKeyDown : undefined}>
              <div className="pu-sg-grid" aria-hidden="true">
                <span className="pu-sg-corner">{L.size} / {L.style}</span>
                {STYLES.map((t) => (
                  <span key={t} className="pu-sg-head">{styles[t]}</span>
                ))}
                {SIZES.map((size, r) => (
                  <div key={size} className="pu-sg-row">
                    <span className="pu-sg-head side">{sizes[size]}</span>
                    {STYLES.map((style, c) => {
                      const s = slots[r * 3 + c]!;
                      const lit = ctx.index === r * 3 + c;
                      return (
                        <div
                          key={style}
                          className={`pu-sg-cell${isSel(s) ? ' selected' : ''}${lit ? ' lit' : ''}${s.weight ? ' weighted' : ''}`}
                          data-band={shade(s)}
                          data-testid={testId ? `${testId}-${size}-${style}` : undefined}
                          data-selected={isSel(s) ? 'true' : undefined}
                        >
                          {isSel(s) && <span className="pu-sg-tick">✓</span>}
                          <span className="pu-sg-weight">{s.weight ? weightText(s) : ''}</span>
                          {isSel(s) && <span className="pu-sg-word">{L.selected}</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }}
    </ChartA11yShell>
  );
}

