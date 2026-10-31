/**
 * StatGrid + StatTile: figures two by two (four across on a wide screen),
 * a quiet label, the figure, a note. The app's StatGrid. The columns follow
 * the width of the space the grid is given (a container query), not the screen,
 * so a grid in a narrow card or sidebar stays at two.
 */
import type { CSSProperties, ReactNode } from 'react';


export interface StatGridProps {
  /** The StatTiles. */
  children: ReactNode;
  /** Columns once the grid's own space is 520px wide (default 4); two below that, whatever the screen. */
  cols?: number;
  /** The grid's accessible name ("Portfolio today"). */
  label?: string;
  /** Becomes data-testid on the grid. */
  testId?: string;
}

export function StatGrid({ children, cols = 4, label, testId }: StatGridProps) {
  return (
    <div className="kit-stats-box">
      <dl className="kit-stats" style={{ '--kit-cols': cols } as CSSProperties} aria-label={label} data-testid={testId}>
        {children}
      </dl>
    </div>
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
