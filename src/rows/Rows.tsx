/**
 * Rows inside one grouped card (the app's toGroupedRows + GroupedCell):
 * GroupedCell is the card, ValueRow a row with a tile, title, line, figure
 * and note, DataRow a flat label/value fact. Rows never carry their own card.
 */
import { Children, isValidElement, type ReactNode } from 'react';
import type { LinkComponent } from '../internal/link.tsx';

import { ChevronRight } from '../layout/Layout.tsx';

export function GroupedCell({ children, label, pad, testId }: { children: ReactNode; label?: string; pad?: boolean; testId?: string }) {
  return (
    <section className={`kit-group${pad ? ' pad' : ''}`} aria-label={label} data-testid={testId}>
      {children}
    </section>
  );
}

/** A list of ValueRows in a GroupedCell. Each row gets its own list item. */
export function RowList({ children, label, testId }: { children: ReactNode; label?: string; testId?: string }) {
  return (
    <ul className="kit-rows" role="list" aria-label={label} data-testid={testId}>
      {Children.map(children, (child, i) => (isValidElement(child) ? <li key={child.key ?? i}>{child}</li> : null))}
    </ul>
  );
}

interface ValueRowProps {
  lead?: ReactNode;
  /** A symbol: never shrinks, never truncates. */
  symbol?: string;
  title?: ReactNode;
  /** The name beside a symbol: may truncate. */
  name?: ReactNode;
  pill?: ReactNode;
  line?: ReactNode;
  figure?: ReactNode;
  note?: ReactNode;
  href?: string;
  /** The link element for an in-app `href` (wrap your router's link). Default: a plain <a>. */
  linkComponent?: LinkComponent;
  onClick?: () => void;
  chevron?: boolean;
  /** A second action at the row's end, beside (never inside) the row's own button (a ghost icon Button: delete). */
  action?: ReactNode;
  testId?: string;
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
export function DataRows({ children, label, flush }: { children: ReactNode; label?: string; /** Rows run to the container's edges (inside a panel), a hairline over each, smaller type. */ flush?: boolean }) {
  return <dl className={`kit-rows${flush ? ' flush' : ''}`} aria-label={label}>{children}</dl>;
}

export function DataRow({ label, value, total, testId }: { label: ReactNode; value: ReactNode; total?: boolean; testId?: string }) {
  return (
    <div className={`kit-data-row${total ? ' total' : ''}`} data-testid={testId}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** The round tile in front of a row: initials of the symbol (NEPSE has no logos). */
export function Tile({ text }: { text: string }) {
  return <span className="kit-tile" aria-hidden="true">{text.slice(0, 4)}</span>;
}
