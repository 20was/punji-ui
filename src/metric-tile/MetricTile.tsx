/**
 * MetricTile (design.punji.app/components/metric-tile): one headline figure
 * with its label, a MeterBar that shows its size, and a note, e.g. a
 * portfolio's invested, total return, money-weighted return and what a sale
 * would pay. Four in a MetricRow on a wide card, two by two on a phone, as
 * cells on the card's own surface split by hairlines (never a tile box: no
 * card in a card). The `inverse` tone marks the one figure a reader acts on,
 * by weight and size; only one per row.
 *
 * Separate from FinancialSummary on purpose: that is a plain list of
 * `{ label, value, note }` metrics on StatTile, a semantic `<dl>`. MetricTile
 * adds what a portfolio needs and a plain metric does not: a meter slot that
 * keeps tiles aligned, a lead tone, a compact density and container-query
 * columns. Use FinancialSummary for a metrics array, MetricTile for cells with
 * meters. The figure never truncates; the label may wrap (an InfoTip sits
 * after it).
 */
import type { ReactNode } from 'react';

export interface MetricTileProps {
  /** The tile's label, above the figure. */
  label: ReactNode;
  /** The figure, formatted by the caller (a string or a MoneyDisplay). */
  value: ReactNode;
  /** A MeterBar showing the figure's size; decorative, so the figure must also be printed. */
  meter?: ReactNode;
  /** A note under the figure. */
  note?: ReactNode;
  /** `inverse` marks the one figure a reader acts on. */
  tone?: 'tint' | 'inverse';
  /** No meter in the whole row: no meter space held, a tighter tile. */
  compact?: boolean;
  /** Test id on the tile element. */
  testId?: string;
}

export function MetricTile({ label, value, meter, note, tone = 'tint', compact, testId }: MetricTileProps) {
  return (
    <div className={`kit-metric${tone === 'inverse' ? ' lead' : ''}${compact ? ' compact' : ''}`} data-testid={testId}>
      <div className="kit-metric-k">{label}</div>
      <div className="kit-metric-v">{value}</div>
      {meter ?? (compact ? null : <span className="kit-metric-nometer" aria-hidden="true" />)}
      <div className="kit-metric-n">{note}</div>
    </div>
  );
}

export interface MetricRowProps {
  /** The MetricTile cells, in order. */
  children: ReactNode;
  /** Names the group for screen readers ("Portfolio totals"). */
  label?: string;
  /** Columns where there is room (2 columns below that). */
  count?: 2 | 3 | 4;
  /** Small tiles that stay `count` across in a narrow panel (a figure and one note each, no meter). */
  dense?: boolean;
  /** Test id on the group element. */
  testId?: string;
}

/** Tiles in one row: `count` across where there is room, two by two otherwise. */
export function MetricRow({ children, label, count = 4, dense, testId }: MetricRowProps) {
  return (
    <div className="kit-metrics-c">
      <div className={`kit-metrics n${count}${dense ? ' dense' : ''}`} role="group" aria-label={label} data-testid={testId}>
        {children}
      </div>
    </div>
  );
}
