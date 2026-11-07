/**
 * PresetTile and PresetRow (design.punji.app/components/preset-tile): a ready-made set of filters as a calm tile
 * you press: its name, how many items it keeps (a live count), and one line on what it asks. Pressed is the
 * inverse surface (press again to clear). A locked tile carries a lock after its name and no count: pressing it
 * never applies it, the page says why.
 *
 * PresetRow lays the tiles out by its own width: six across when there is room, three across in a narrower
 * column, and one sideways-scrolling row of compact tiles (name and count, no line) on a phone.
 */
import type { ReactNode } from 'react';

export interface PresetRowProps {
  /** The group's accessible name ("Screens"). */
  label: string;
  /** PresetTile elements. */
  children: ReactNode;
  /** Becomes data-testid on the group. */
  testId?: string;
}

/**
 * The row of preset tiles, laid out by its own width.
 * @stability beta
 */
export function PresetRow({ label, children, testId }: PresetRowProps) {
  return (
    <div className="pu-preset-box">
      <div className="pu-preset-row" role="group" aria-label={label} data-testid={testId}>
        {children}
      </div>
    </div>
  );
}

export interface PresetTileProps {
  /** The preset's name ("Steady dividends"). */
  title: ReactNode;
  /** The live count (a number or a figure as printed). Leave out while it loads, and on a locked tile. */
  count?: ReactNode;
  /** One short line on what the preset asks. Hidden in the phone row. */
  line?: ReactNode;
  /** The preset is applied now. */
  pressed: boolean;
  /** Not included on this account: a lock, no count; the press is the page's to answer. */
  locked?: boolean;
  /** The lock in words, for screen readers ("Not included on this account"). */
  lockedLabel?: string;
  /** Called on press. */
  onClick: () => void;
  /** The id of the element with the full description (or the page's note after a locked press). */
  describedBy?: string;
  /** Becomes data-testid on the tile. */
  testId?: string;
  /** Becomes data-testid on the count. */
  countTestId?: string;
  /** Becomes data-testid on the lock. */
  lockTestId?: string;
}

/**
 * A saved filter preset with a live count: a toggle button (aria-pressed).
 * @stability beta
 */
export function PresetTile({ title, count, line, pressed, locked, lockedLabel, onClick, describedBy, testId, countTestId, lockTestId }: PresetTileProps) {
  return (
    <button type="button" className={`pu-preset${locked ? ' locked' : ''}`} aria-pressed={pressed} aria-describedby={describedBy} onClick={onClick} data-testid={testId}>
      <span className="pu-preset-head">
        <b className="pu-preset-title">{title}</b>
        {locked ? (
          <span className="pu-preset-lock" data-testid={lockTestId}>
            <LockIcon />
            {lockedLabel && <span className="kit-sr">, {lockedLabel}</span>}
          </span>
        ) : (
          <span className="pu-preset-count" data-testid={countTestId}>
            {count ?? ''}
          </span>
        )}
      </span>
      {line && <span className="pu-preset-line">{line}</span>}
    </button>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
