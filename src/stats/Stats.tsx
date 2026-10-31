/**
 * StatGrid + StatTile: figures two by two (four across on a wide screen),
 * a quiet label, the figure, a note. The app's StatGrid.
 */
import type { CSSProperties, ReactNode } from 'react';


export interface StatGridProps {
  /** The StatTiles. */
  children: ReactNode;
  /** Columns on a wide screen (default 4); two on a phone. */
  cols?: number;
  /** The grid's accessible name ("Portfolio today"). */
  label?: string;
  /** Becomes data-testid on the grid. */
  testId?: string;
}

export function StatGrid({ children, cols = 4, label, testId }: StatGridProps) {
  return (
    <dl className="kit-stats" style={{ '--kit-cols': cols } as CSSProperties} aria-label={label} data-testid={testId}>
      {children}
    </dl>
  );
}

export interface StatTileProps {
  /** A quiet name for the figure ("Invested"). */
  label: ReactNode;
  /** The figure itself: a Figure or MoneyDisplay. */
  value: ReactNode;
  /** A smaller line under the figure (a Delta, a date). */
  note?: ReactNode;
  /** Becomes data-testid on the tile. */
  testId?: string;
}

export function StatTile({ label, value, note, testId }: StatTileProps) {
  return (
    <div className="kit-stat" data-testid={testId}>
      <dt>{label}</dt>
      <dd>
        <span className="v">{value}</span>
        {note !== undefined && note !== null && <span className="n">{note}</span>}
      </dd>
    </div>
  );
}
