/**
 * Rows inside one grouped card (the app's toGroupedRows + GroupedCell):
 * GroupedCell is the card, ValueRow a row with a tile, title, line, figure
 * and note, DataRow a flat label/value fact. Rows never carry their own card.
 */
import { Children, isValidElement, type ReactNode } from 'react';
import type { LinkComponent } from '../internal/link.tsx';

import { ChevronRight } from '../layout/Layout.tsx';

export interface GroupedCellProps {
  /** The rows (a RowList, DataRows) or any content that belongs together. */
  children: ReactNode;
  /** The section's accessible name. */
  label?: string;
  /** Adds inner padding, for content that is not rows. */
  pad?: boolean;
  /** Becomes data-testid on the card. */
  testId?: string;
}

export function GroupedCell({ children, label, pad, testId }: GroupedCellProps) {
  return (
    <section className={`kit-group${pad ? ' pad' : ''}`} aria-label={label} data-testid={testId}>
      {children}
    </section>
  );
}

/** A list of ValueRows in a GroupedCell. Each row gets its own list item. */
export interface RowListProps {
  /** The ValueRows. Each becomes its own list item. */
  children: ReactNode;
  /** The list's accessible name. */
  label?: string;
  /** Becomes data-testid on the list. */
  testId?: string;
}

export function RowList({ children, label, testId }: RowListProps) {
  return (
    <ul className="kit-rows" role="list" aria-label={label} data-testid={testId}>
      {Children.map(children, (child, i) => (isValidElement(child) ? <li key={child.key ?? i}>{child}</li> : null))}
    </ul>
  );
}

interface ValueRowProps {
  /** What leads the row: a Tile, an Avatar or an icon. */
  lead?: ReactNode;
  /** A symbol: never shrinks, never truncates. */
  symbol?: string;
  /** The row's main words, when there is no symbol. */
  title?: ReactNode;
  /** The name beside a symbol: may truncate. */
  name?: ReactNode;
  /** A StatusPill after the title ("Bonus"). */
  pill?: ReactNode;
  /** A quiet second line under the title (quantity, a date). */
  line?: ReactNode;
  /** The main figure on the right (a Figure or MoneyDisplay). */
  figure?: ReactNode;
  /** A smaller line under the figure (a Delta). */
  note?: ReactNode;
  /** Makes the row a link to this address. */
  href?: string;
  /** The link element for an in-app `href` (wrap your router's link). Default: a plain <a>. */
  linkComponent?: LinkComponent;
  /** Makes the row a button that calls this. Ignored when there is an `href`. */
  onClick?: () => void;
  /** Draws a chevron at the end, to show the row opens something. */
  chevron?: boolean;
  /** A second action at the row's end, beside (never inside) the row's own button (a ghost icon Button: delete). */
  action?: ReactNode;
  /** Becomes data-testid on the row. */
  testId?: string;
  /** A fuller accessible name for a link or button row; it must contain the visible text. */
  ariaLabel?: string;
}

export function ValueRow({ action, ...props }: ValueRowProps) {
  if (!action) return <ValueRowBody {...props} />;
  return (
    <div className="kit-value-act">
      <ValueRowBody {...props} />
      <span className="kit-value-act-b">{action}</span>
    </div>
  );
}

function ValueRowBody({ lead, symbol, title, name, pill, line, figure, note, href, linkComponent, onClick, chevron, testId, ariaLabel }: Omit<ValueRowProps, 'action'>) {
  const body = (
    <>
      <span className="lead">{lead}</span>
      <span className="main">
        <span className="title">
          {symbol && <span className="sym">{symbol}</span>}
          {title}
          {name && <span className="name">{name}</span>}
          {pill}
        </span>
        {line && <span className="line">{line}</span>}
      </span>
      <span className="side">
        {figure !== undefined && <span className="fig">{figure}</span>}
        {note !== undefined && <span className="note">{note}</span>}
        {chevron && <ChevronRight />}
      </span>
    </>
  );
  if (href) {
    const L = linkComponent && !/^https?:/.test(href) ? linkComponent : 'a';
    return (
      <L className="kit-value-row" href={href} data-testid={testId} aria-label={ariaLabel}>{body}</L>
    );
  }
  if (onClick) {
    return (
      <button type="button" className="kit-value-row" onClick={onClick} data-testid={testId} aria-label={ariaLabel}>
        {body}
      </button>
    );
  }
  return <div className="kit-value-row" data-testid={testId}>{body}</div>;
}

/** Facts, label left and value right, in one card. */
export interface DataRowsProps {
  /** The DataRow facts. */
  children: ReactNode;
  /** The list's accessible name. */
  label?: string;
  /** Rows run to the container's edges (inside a panel), a hairline over each, smaller type. */
  flush?: boolean;
}

export function DataRows({ children, label, flush }: DataRowsProps) {
  return <dl className={`kit-rows${flush ? ' flush' : ''}`} aria-label={label}>{children}</dl>;
}

export function DataRow({ label, value, total, bar, note, testId }: {
  /** The fact's name (the term). */
  label: ReactNode;
  /** The fact's value (the definition). */
  value: ReactNode;
  /** Marks the closing row: heavier, with a rule over it. */
  total?: boolean;
  /** A bar under the label and value, across the row (a MeterBar, a RangeBar): what the value means on a scale. */
  bar?: ReactNode;
  /** One quiet line under the bar ("547.00 sits 71% of the way up"). */
  note?: ReactNode;
  /** Becomes data-testid on the row. */
  testId?: string;
}) {
  return (
    <div className={`kit-data-row${total ? ' total' : ''}${bar || note ? ' has-bar' : ''}`} data-testid={testId}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {bar && <dd className="kit-data-bar">{bar}</dd>}
      {note && <dd className="kit-data-note">{note}</dd>}
    </div>
  );
}

/** The round tile in front of a row: initials of the symbol (NEPSE has no logos). */
export interface TileProps {
  /** The symbol whose first five characters are drawn (NEPSE has no logos); a five-letter symbol sets in a smaller size so it fits the circle. */
  text: string;
}

export function Tile({ text }: TileProps) {
  const letters = text.slice(0, 5);
  return <span className="kit-tile" data-long={letters.length > 4 ? '' : undefined} aria-hidden="true">{letters}</span>;
}
