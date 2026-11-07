/**
 * LinkRow and LinkRowList (design.punji.app/components/link-row): one link per row in a list, the whole row
 * pressable: a title (a symbol that never shrinks, a name that may truncate, a pill), a line under it that wraps
 * rather than cuts a figure, and on the right a value over a caption, then a chevron. Rows in a LinkRowList are split
 * by hairlines; the list sits in one card.
 *
 * `tile` sets one apart as a tinted tile, for a small grid of places to start. ValueRow is the row with a lead tile
 * and an optional action; LinkRow is always a link, and keeps its line whole. The address goes through `safeHref`;
 * an in-app path uses `linkComponent` or the nearest `LinkProvider`.
 */
import { Children, isValidElement, type ReactNode } from 'react';

import { AppLink, type LinkComponent } from '../internal/link.tsx';
import { ChevronRight } from '../layout/Layout.tsx';

export interface LinkRowListProps {
  /** The `LinkRow`s. */
  children: ReactNode;
  /** Names the list for screen readers. */
  label?: string;
  /** The id of an element that names the list. */
  labelledBy?: string;
  /** 4: four columns from 1256px, two from 700px, one below, each column split by hairlines (a directory). 2: two columns from 700px (a short list of guides). */
  columns?: 2 | 4;
  /** Becomes data-testid on the list. */
  testId?: string;
}

/**
 * The list of link rows: a `ul` with a hairline between rows.
 * @stability beta
 */
export function LinkRowList({ children, label, labelledBy, columns, testId }: LinkRowListProps) {
  return (
    <ul className={`pu-linkrows${columns === 4 ? ' cols' : columns === 2 ? ' cols2' : ''}`} aria-label={label} aria-labelledby={labelledBy} data-testid={testId}>
      {Children.map(children, (child, i) => (isValidElement(child) ? <li key={child.key ?? i}>{child}</li> : null))}
    </ul>
  );
}

export interface LinkRowProps {
  /** An address in the app (through `linkComponent`), or an http(s) link (a plain <a>). */
  href: string;
  /** The link element for an in-app `href` (wrap your router's link); default the nearest `LinkProvider`, else a plain <a>. */
  linkComponent?: LinkComponent;
  /** A ticker or code. Never shrinks, never truncates. */
  symbol?: string;
  /** A bold name, in place of or after the symbol. */
  title?: ReactNode;
  /** Beside the symbol or title, muted; truncates first. */
  name?: ReactNode;
  /** A pill after the title (a StatusPill or StatusTag). */
  pill?: ReactNode;
  /** Wraps onto a second line on a narrow screen rather than cutting a figure. */
  line?: ReactNode;
  /** The figure on the right; never truncates. */
  value?: ReactNode;
  /** Small words under the value. */
  caption?: ReactNode;
  /**
   * `warn` for a caution ("−56.82%"); `neutral` for a word in place of a figure ("No cash"), muted.
   * Deprecated: 'muted', use `neutral`.
   */
  tone?: 'neutral' | 'warn' | 'muted';
  /** A tinted tile of its own, for a grid of a few links (places to start), not a list. */
  tile?: boolean;
  /** A mark before the text (a BrokerBadge, an icon chip); decorative, so give the row words that say the same. */
  lead?: ReactNode;
  /** A shorter row for a long list: 52px, the title in the body weight and cut with an ellipsis, the line on one row. */
  dense?: boolean;
  /** A fuller name when the words alone are vague. */
  ariaLabel?: string;
  /** Becomes data-testid on the link. */
  testId?: string;
}

/**
 * @stability beta
 */
export function LinkRow({ href, linkComponent, symbol, title, name, pill, line, value, caption, tone, tile, lead, dense, ariaLabel, testId }: LinkRowProps) {
  const quiet = tone === 'neutral' || tone === 'muted';
  return (
    <AppLink linkComponent={linkComponent} href={href} className={`pu-linkrow${tile ? ' tile' : ''}${lead ? ' has-lead' : ''}${dense ? ' dense' : ''}`} aria-label={ariaLabel} data-testid={testId}>
      {lead && <span className="pu-linkrow-lead">{lead}</span>}
      <span className="pu-linkrow-m">
        <span className="pu-linkrow-t">
          {symbol && <b className="sym">{symbol}</b>}
          {title && <b>{title}</b>}
          {name && <span className="name">{name}</span>}
          {pill}
        </span>
        {line && <span className="pu-linkrow-l">{line}</span>}
      </span>
      <span className="pu-linkrow-s">
        {value !== undefined && <b className={quiet ? 'muted' : tone}>{value}</b>}
        {caption !== undefined && <small>{caption}</small>}
      </span>
      <ChevronRight />
    </AppLink>
  );
}
