'use client';
/**
 * AlertRow (design.punji.app/components/alert-row): one price alert as a row. The same pieces in two sizes, so every
 * view of an alert reads alike:
 *
 *   AlertRow         the full row of a list (AlertRowList): the direction mark, the symbol and name, the condition and
 *                    how it repeats, the price and today's move, how far the price still has to go over a bar, and the
 *                    row's actions. The whole row opens the alert (one button, stretched); the actions sit above it.
 *                    In a narrow list (under 520px of its own width) it draws as two lines with the bar under.
 *   AlertRowCompact  one line and a bar (an overview's "Your alerts", a panel's "Closest to firing", a watchlist panel),
 *                    or a fired alert with its pill and when. Works on the inverse surface.
 *   AlertRowSkeleton a placeholder row in the list's own grid, so nothing moves when the alerts land.
 *   AlertListEmpty   a tab of the list with nothing in it: the reason and the next step.
 *   AlertGlyph       the mark: an up arrow for "above", a down arrow for "below", a wave for an indicator alert.
 *   AlertBar         the distance bar (alertCloseness: full at the target, empty 10% away).
 *
 * Every state differs in lightness and has its own words, never colour alone: waiting (info blue), crossed (amber:
 * past the target, not fired yet), fired (coral), paused and readonly (neutral). A figure and a symbol never truncate,
 * only the name does. Figures arrive already formatted (`alertTarget`, `MoneyDisplay`, `PriceChange`), so the row
 * holds no money maths; `alertDistance` gives the distance and the bar from exact bigint prices.
 */
import { useId, type ReactNode } from 'react';

import { AppLink, type LinkComponent } from '../internal/link.tsx';
import { Skeleton } from '../states/States.tsx';

/** An alert's state: waiting, crossed (past the target, not fired yet), fired, paused, or readonly (set in the app). */
export type AlertStatus = 'waiting' | 'crossed' | 'fired' | 'paused' | 'readonly';
/** What the alert watches: a price rising above, falling below, or an indicator. */
export type AlertMark = 'above' | 'below' | 'indicator';

const PATHS: Record<AlertMark, string> = {
  above: 'M8 12.5V3.8M4.2 7.4L8 3.6l3.8 3.8',
  below: 'M8 3.5v8.7M4.2 8.6L8 12.4l3.8-3.8',
  indicator: 'M2.5 10l3-3.5 2.6 2.4L13.5 4',
};

export interface AlertGlyphProps {
  /** What the alert watches: an arrow up, an arrow down, or a wave for an indicator. */
  mark: AlertMark;
  /** The alert's state, which tints the tile. Default waiting. */
  status?: AlertStatus;
  /** 'sm' for the 24px tile of a compact row. Default md (36px). */
  size?: 'sm' | 'md';
}

/**
 * The direction mark of an alert, in a tinted tile. Decorative.
 *
 * @stability beta
 */
export function AlertGlyph({ mark, status = 'waiting', size = 'md' }: AlertGlyphProps) {
  return (
    <span className="pu-alert-glyph" data-status={status} data-size={size === 'sm' ? 'sm' : undefined} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16"><path d={PATHS[mark]} /></svg>
    </span>
  );
}

export interface AlertBarProps {
  /** How full the bar draws, 0 to 1 (`alertCloseness`); clamped. */
  closeness: number;
  /** The alert's state, which colours the fill. Default waiting. */
  status?: AlertStatus;
  /** 'lg': the 6px bar. Default md (4px). */
  size?: 'md' | 'lg';
}

/**
 * The distance bar; `closeness` 0 to 1 (`alertCloseness`). Decorative: the distance is printed beside it.
 *
 * @stability beta
 */
export function AlertBar({ closeness, status = 'waiting', size = 'md' }: AlertBarProps) {
  const w = Math.max(0, Math.min(1, Number.isFinite(closeness) ? closeness : 0));
  return (
    <span className="pu-alert-bar" data-status={status} data-size={size === 'lg' ? 'lg' : undefined} aria-hidden="true">
      <i style={{ width: `${Math.round(w * 1000) / 10}%` }} />
    </span>
  );
}

export interface AlertRowListProps {
  /** The column labels: [alert, when, price, distance]; omit to draw no head. */
  head?: readonly [ReactNode, ReactNode, ReactNode, ReactNode];
  /** Names the list for screen readers. */
  label: string;
  /** `AlertRow`s, `AlertRowSkeleton`s. */
  children: ReactNode;
  /** The rows are still loading. */
  busy?: boolean;
  /** Sets `data-testid` on the list. */
  testId?: string;
}

/**
 * The list: a column head over the rows. It is its own container, so the rows pick their layout from the list's width
 * (a panel, a page, a phone).
 *
 * @stability beta
 */
export function AlertRowList({ head, label, children, busy, testId }: AlertRowListProps) {
  return (
    <div className="pu-alert-list" data-testid={testId}>
      {head && (
        <div className="pu-alert-row pu-alert-head" aria-hidden="true">
          <span>{head[0]}</span>
          <span>{head[1]}</span>
          <span data-end="">{head[2]}</span>
          <span>{head[3]}</span>
          <span />
        </div>
      )}
      <ul className="pu-alert-list-items" aria-label={label} aria-busy={busy || undefined}>{children}</ul>
    </div>
  );
}

export interface AlertRowProps {
  /** The symbol, never truncated. */
  symbol: string;
  /** The company's or the index's name: may truncate. */
  name?: ReactNode;
  /** A short tag after the symbol ("Index"). */
  badge?: ReactNode;
  /** What the alert watches: shapes the glyph (arrow up, arrow down, wave). */
  mark: AlertMark;
  /** The alert's state: waiting, crossed, fired, paused or readonly. Tints the glyph, distance and bar; the distance words say it too. */
  status: AlertStatus;
  /** "Above Rs 500" (the target by `alertTarget`). */
  condition: ReactNode;
  /** "Once", "Every time", "Set in the Punji app". */
  repeat?: ReactNode;
  /** The narrow layout's first line after the symbol ("above Rs 500"); default: the condition. */
  inline?: ReactNode;
  /** The last price, as published; words when there is none ("No price yet"). */
  price: ReactNode;
  /** Today's move (a `PriceChange`), under the price. */
  change?: ReactNode;
  /** "1.21% to go", "Past the target · fires on the next check", "Reached Fri 16 Oct, 13:42". */
  distance: ReactNode;
  /** The bar's fill (`alertCloseness`); null draws no bar (no price, a fired alert). */
  closeness?: number | null;
  /** Icon-only Buttons (pause, resume, set again, open). Hidden in the narrow layout: a tap opens the alert. */
  actions?: ReactNode;
  /** A row menu that remains available in the narrow layout. */
  more?: ReactNode;
  /** Opens the alert (the whole row is this one button). */
  onOpen: () => void;
  /** The alert the side panel shows. */
  selected?: boolean;
  /** A key for page keyboard handlers (data-desk-row on the open button). */
  rowKey?: string;
  /** Sets `data-testid` on the row's list item. */
  testId?: string;
  /** Sets `data-testid` on the open button. */
  openTestId?: string;
}

/**
 * @stability beta
 */
export function AlertRow({ symbol, name, badge, mark, status, condition, repeat, inline, price, change, distance, closeness, actions, more, onOpen, selected, rowKey, testId, openTestId }: AlertRowProps) {
  const id = useId();
  const bar = typeof closeness === 'number' && Number.isFinite(closeness) ? <AlertBar closeness={closeness} status={status} /> : null;
  return (
    <li className="pu-alert-row pu-alert-item" data-status={status} data-selected={selected ? '' : undefined} data-more={more ? '' : undefined} data-testid={testId}>
      <button type="button" className="pu-alert-open" onClick={onOpen} aria-describedby={`${id}-c ${id}-p ${id}-d`} aria-current={selected ? 'true' : undefined} data-desk-row={rowKey} data-testid={openTestId}>
        <AlertGlyph mark={mark} status={status} />
        <span className="pu-alert-symbol">
          <b>{symbol}{badge && <span className="pu-alert-badge">{badge}</span>}</b>
          {name && <span className="pu-alert-name">{name}</span>}
        </span>
      </button>
      <span className="pu-alert-cond" id={`${id}-c`}>
        <span data-line="1">{condition}</span>
        {repeat && <span data-line="2">{repeat}</span>}
      </span>
      <span className="pu-alert-price" id={`${id}-p`}>
        <span data-line="1">{price}</span>
        {change && <span data-line="2">{change}</span>}
      </span>
      <span className="pu-alert-dist" data-status={status} id={`${id}-d`}>
        <span data-line="1">{distance}</span>
        {bar}
      </span>
      <span className="pu-alert-acts">{actions}{more && <span data-menu="">{more}</span>}</span>
      {/* The narrow layout: symbol and condition, name and repeat, then the distance over its bar. */}
      <span className="pu-alert-narrow" aria-hidden="true">
        <AlertGlyph mark={mark} status={status} />
        <span className="pu-alert-narrow-title">
          <b>{symbol}</b>
          {badge && <span className="pu-alert-badge">{badge}</span>} <span>{inline ?? condition}</span>
        </span>
        <span className="pu-alert-narrow-sub">
          {name}
          {name && repeat ? ' · ' : ''}
          {repeat}
        </span>
        <span className="pu-alert-narrow-price">
          <span data-line="1">{price}</span>
          {change && <span data-line="2">{change}</span>}
        </span>
        <span className="pu-alert-narrow-dist" data-status={status}>
          <span data-line="1">{distance}</span>
          {bar}
        </span>
      </span>
    </li>
  );
}

export interface AlertRowSkeletonProps {
  /** The row's position, which varies the bars' widths so a stack of them does not look stamped. Default 0. */
  index?: number;
}

/**
 * A placeholder row in the list's own grid, so nothing moves when the alerts land.
 *
 * @stability beta
 */
export function AlertRowSkeleton({ index = 0 }: AlertRowSkeletonProps) {
  const w = [1, 0.8, 0.92, 0.7, 0.86, 0.76][index % 6]!;
  return (
    <li className="pu-alert-row pu-alert-item pu-alert-skeleton" aria-hidden="true" data-skel-row="">
      <span className="pu-alert-open">
        <Skeleton width={36} height={36} radius={11} />
        <span className="pu-alert-symbol">
          <Skeleton width={Math.round(52 * w)} height={14} />
          <Skeleton width={Math.round(128 * w)} height={10} />
        </span>
      </span>
      <span className="pu-alert-cond">
        <Skeleton width={Math.round(104 * w)} height={13} />
        <Skeleton width={56} height={10} />
      </span>
      <span className="pu-alert-price">
        <Skeleton width={56} height={13} />
        <Skeleton width={48} height={10} />
      </span>
      <span className="pu-alert-dist">
        <Skeleton width={Math.round(80 * w)} height={12} />
        <span className="pu-alert-bar" />
      </span>
      <span className="pu-alert-acts">
        <Skeleton width={32} height={32} radius={10} />
        <Skeleton width={32} height={32} radius={10} />
      </span>
      <span className="pu-alert-narrow" aria-hidden="true">
        <Skeleton width={36} height={36} radius={11} />
        <span className="pu-alert-narrow-title"><Skeleton width={Math.round(150 * w)} height={14} /></span>
        <span className="pu-alert-narrow-sub"><Skeleton width={Math.round(140 * w)} height={10} /></span>
        <span className="pu-alert-narrow-price">
          <Skeleton width={56} height={13} />
          <Skeleton width={48} height={10} />
        </span>
        <span className="pu-alert-narrow-dist">
          <span data-line="1"><Skeleton width={Math.round(80 * w)} height={12} /></span>
          <span className="pu-alert-bar" />
        </span>
      </span>
    </li>
  );
}

export interface AlertRowCompactProps {
  /** "HRL above Rs 500" (the symbol in a `<b>`). */
  title: ReactNode;
  /** At the right: "1.21% to go", or a StatusPill ("Reached"). */
  aside?: ReactNode;
  /** A second line ("Now 328.00 · Fri 16 Oct, 13:42"). */
  sub?: ReactNode;
  /** The alert's state: tints the aside and the bar. */
  status: AlertStatus;
  /** The bar under the line; null for none. */
  closeness?: number | null;
  /** Makes the row a link. An in-app path uses `linkComponent` or the nearest `LinkProvider`. */
  href?: string;
  /** The link element for an in-app `href` (wrap your router's link). */
  linkComponent?: LinkComponent;
  /** Makes the row a button instead of a link. */
  onOpen?: () => void;
  /** The row's accessible name, when its words alone are vague. */
  label?: string;
  /** The aside on its own line under the title (a long distance in a panel). */
  stack?: boolean;
  /** Sets `data-testid` on the row. */
  testId?: string;
}

/**
 * @stability beta
 */
export function AlertRowCompact({ title, aside, sub, status, closeness, href, linkComponent, onOpen, label, stack, testId }: AlertRowCompactProps) {
  const body = (
    <>
      <span className="pu-alert-mini-title">{title}</span>
      {aside !== undefined && aside !== null && <span className="pu-alert-mini-aside" data-status={status}>{aside}</span>}
      {sub && <span className="pu-alert-mini-sub">{sub}</span>}
      {typeof closeness === 'number' && Number.isFinite(closeness) && <AlertBar closeness={closeness} status={status} />}
    </>
  );
  const common = { className: 'pu-alert-mini', 'data-stack': stack ? '' : undefined, 'aria-label': label, 'data-testid': testId };
  if (href) return <AppLink {...common} href={href} linkComponent={linkComponent}>{body}</AppLink>;
  if (onOpen) return <button type="button" {...common} onClick={onOpen}>{body}</button>;
  return <div {...common} data-still="">{body}</div>;
}

export interface AlertListEmptyProps {
  /** The reason, as a heading ("No fired alerts"). */
  title: ReactNode;
  /** One line on what to do or why. */
  body?: ReactNode;
  /** The next step (a Button). */
  action?: ReactNode;
  /** 'status' or 'alert' to announce it when it appears (a filtered tab that just emptied). */
  role?: 'alert' | 'status';
  /** The heading's level: 2 (default) or 3. */
  headingLevel?: 2 | 3;
  /** Sets `data-testid` on the root. */
  testId?: string;
}

/**
 * A tab of the list with nothing in it: the reason and the next step, inside the list's card (no surface of its own).
 *
 * @stability beta
 */
export function AlertListEmpty({ title, body, action, role, headingLevel = 2, testId }: AlertListEmptyProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <div className="pu-alert-empty" role={role} data-testid={testId}>
      <Heading>{title}</Heading>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}
