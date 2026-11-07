/**
 * LockedHead and LockedCell (design.punji.app/components/data-table, "Locked
 * cells"): a DataTable column whose figures are not included on this account.
 * The head keeps its name with a lock and is not sortable (give the column
 * `sortable: false`); each cell is a soft bar with words for screen readers.
 * A locked cell takes no value by design: the page must not hold the figure at
 * all (the server leaves it out), so none can sit behind a bar, and nothing is
 * hidden with CSS alone. The same idea as `LockedNote`, in a table.
 */

const LOCKED = 'Not included on this account';

export interface LockedHeadProps {
  /** The column's name. */
  children: string;
  /** The lock in words, read after the name. Default "Not included on this account". */
  label?: string;
}

/**
 * A column head with a lock, for a column the account does not include.
 *
 * @remarks A locked state is a message, not a lock. UX safeguard only: the server must leave the figures out.
 *
 * @stability beta
 */
export function LockedHead({ children, label = LOCKED }: LockedHeadProps) {
  return (
    <span className="pu-locked-head">
      {children}
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      </svg>
      <span className="kit-sr">, {label}</span>
    </span>
  );
}

export interface LockedCellProps {
  /** The lock in words, for screen readers. Default "Not included on this account". */
  label?: string;
  /** The column's name, printed before the bar in a stacked row (DataTable `stack`). */
  column?: string;
  /** Hidden under 760px with the column (its Column `wide`). */
  wide?: boolean;
  /** As its Column's. */
  hideUnder?: 1024 | 1256;
  /** Becomes data-testid on the cell. */
  testId?: string;
}

/**
 * A `<td>` for a locked column: a soft bar, read as the lock in words.
 *
 * @remarks A locked state is a message, not a lock. UX safeguard only: the server must leave the figures out.
 *
 * @stability beta
 */
export function LockedCell({ label = LOCKED, column, wide, hideUnder, testId }: LockedCellProps) {
  return (
    <td className={`num${wide ? ' wide' : ''}${hideUnder ? ` hide-${hideUnder}` : ''}`} data-label={column} data-testid={testId}>
      <span className="pu-locked-bar" aria-hidden="true" />
      <span className="kit-sr">{label}</span>
    </td>
  );
}
