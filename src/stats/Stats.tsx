/**
 * StatGrid + StatTile: figures two by two (four across on a wide screen),
 * a quiet label, the figure, a note. The app's StatGrid.
 */
import type { CSSProperties, ReactNode } from 'react';


export function StatGrid({ children, cols = 4, label, testId }: { children: ReactNode; cols?: number; label?: string; testId?: string }) {
  return (
    <dl className="kit-stats" style={{ '--kit-cols': cols } as CSSProperties} aria-label={label} data-testid={testId}>
      {children}
    </dl>
  );
}

export function StatTile({ label, value, note, testId }: { label: ReactNode; value: ReactNode; note?: ReactNode; testId?: string }) {
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
