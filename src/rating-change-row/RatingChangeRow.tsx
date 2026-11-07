/**
 * RatingChangeList, RatingChangeRow and RatingChangeHead (design.punji.app/components/rating-scale): things whose
 * place on an N-step scale moved, one row each. A row leads with a StatusDisc (its group's icon and tint), then its
 * title and one line (a symbol and its name), the move as two RatingChips (before to now), the RatingScale (the old
 * step outlined, the new one filled), the figure with a word under it, and a chevron when it opens something.
 * `variant="held"` is the quiet row of a thing that kept its step: the title, the line and one chip, two to a row on
 * a wide list.
 *
 * The list's own width decides the layout: under 600px the chips go under the name and the scale and the chevron
 * leave (the chips say the same). The figure and the title never truncate; only the line takes an ellipsis. Rows are
 * separated by hairlines, never boxed. The chips are words, so the move never rests on colour; give `moveLabel` the
 * move as one phrase in the reader's language ("Neutral to Mildly bullish"), read in the chips' place.
 *
 * Needs check-row.css (StatusDisc) and rating-chip.css, rating-scale.css (styles.css has everything).
 */
import type { ReactNode } from 'react';

import { StatusDisc, type CheckTone } from '../check-row/CheckRow.tsx';
import { AppLink, type LinkComponent } from '../internal/link.tsx';
import { RatingChip, type RatingStep } from '../rating-chip/RatingChip.tsx';
import { RatingScale } from '../rating-scale/RatingScale.tsx';

/** One end of a move: the word and its step (null: no step, the quiet chip, e.g. "Not rated"). */
export interface RatingEnd {
  /** The place on the scale, or null for none. */
  step: RatingStep | null;
  /** The word, always printed. */
  label: ReactNode;
}

const Arrow = () => (
  <svg className="pu-rating-change-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const Chevron = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export interface RatingChangeHeadProps {
  /** The first column's name ("Stock"). */
  item: ReactNode;
  /** The move column's name ("Rating"). */
  move: ReactNode;
  /** The scale column's name. */
  scale?: ReactNode;
  /** The figure column's name ("Price"). */
  figure?: ReactNode;
  /** Sets `data-testid` on the head. */
  testId?: string;
}

/**
 * The column names over a wide list (hidden under 600px, and from screen readers: each row says it all).
 *
 * @stability beta
 */
export function RatingChangeHead({ item, move, scale, figure, testId }: RatingChangeHeadProps) {
  return (
    <div className="pu-rating-change-head" aria-hidden="true" data-testid={testId}>
      <div className="pu-rating-change-head-in">
        <span />
        <span>{item}</span>
        <span>{move}</span>
        <span>{scale}</span>
        <span data-end="">{figure}</span>
        <span />
      </div>
    </div>
  );
}

export interface RatingChangeListProps {
  /** The group's heading ("Moved up"); none for a bare list. */
  title?: ReactNode;
  /** The icon in the heading's disc. */
  icon?: ReactNode;
  /** The disc's tint. Default neutral. */
  tone?: CheckTone;
  /** How many, after the title. */
  count?: ReactNode;
  /** 'held': the quiet rows of things that kept their step, two to a row on a wide list. */
  variant?: 'change' | 'held';
  /** Names the list when there is no title. */
  label?: string;
  /** The heading's level: 2 or 3 (default). */
  headingLevel?: 2 | 3;
  /** The `RatingChangeRow`s. */
  children: ReactNode;
  /** Sets `data-testid` on the list. */
  testId?: string;
}

/**
 * One group of rows: its heading (a StatusDisc, the title and how many), then the rows.
 *
 * @stability beta
 */
export function RatingChangeList({ title, icon, tone = 'neutral', count, variant = 'change', label, headingLevel = 3, children, testId }: RatingChangeListProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className="pu-rating-change-list" data-variant={variant} aria-label={title ? undefined : label} data-testid={testId}>
      {title && (
        <div className="pu-rating-change-list-head">
          {icon && <StatusDisc tone={tone}>{icon}</StatusDisc>}
          <Heading>{title}</Heading>
          {count != null && <span className="pu-rating-change-count">{count}</span>}
        </div>
      )}
      <ul>{children}</ul>
    </section>
  );
}

export interface RatingChangeRowProps {
  /** The icon in the row's disc (its group: a sector, a team). Not drawn on a held row. */
  icon?: ReactNode;
  /** The disc's tint. Default neutral. */
  tone?: CheckTone;
  /** A symbol, a code: never truncated. */
  title: ReactNode;
  /** One line under (or after, on a held row) the title: the full name. Truncates. */
  line?: ReactNode;
  /** Where it was: the first chip, and the outlined step. None on a held row. */
  from?: RatingEnd | null;
  /** Where it is now: the second chip, and the filled step. */
  to: RatingEnd;
  /** How many steps the scale has. Default 5. */
  steps?: number;
  /** A chip or a word after the move ("Low confidence"). */
  note?: ReactNode;
  /** The figure on the right (a price, printed by `MoneyDisplay` or as the caller likes). Never truncated. */
  figure?: ReactNode;
  /** Under the figure (under the chip, on a held row): a word about it ("Getting stronger"). */
  figureSub?: ReactNode;
  /** 'held': the quiet row of a thing that kept its step. Default 'change'. */
  variant?: 'change' | 'held';
  /** The row opens this address. An in-app path uses `linkComponent` or the nearest `LinkProvider`. */
  href?: string;
  /** Force a plain link (another site). */
  external?: boolean;
  /** The link element for an in-app `href` (wrap your router's link). */
  linkComponent?: LinkComponent;
  /** The row is a button instead of a link. */
  onClick?: () => void;
  /** The move as one phrase for screen readers ("Neutral to Mildly bullish"), read in the chips' place (they are then hidden from it). */
  moveLabel?: string;
  /** The row's whole name for screen readers, replacing its pieces. Prefer `moveLabel`: a name must contain the visible words. */
  ariaLabel?: string;
  /** Sets `data-testid` on the row; the figure gets `<testId>-value`. */
  testId?: string;
}

/**
 * @stability beta
 */
export function RatingChangeRow({ icon, tone = 'neutral', title, line, from, to, steps = 5, note, figure, figureSub, variant = 'change', href, external, linkComponent, onClick, moveLabel, ariaLabel, testId }: RatingChangeRowProps) {
  const held = variant === 'held';
  const pressable = !!(href || onClick);
  const id = (
    <span className="pu-rating-change-id">
      <b>{title}</b>
      {line && <span>{line}</span>}
    </span>
  );
  const body = held ? (
    <>
      {id}
      <span className="pu-rating-change-move" data-sub={figureSub ? '' : undefined}>
        <span className="pu-rating-change-chips">
          <RatingChip step={to.step} steps={steps} size="sm">{to.label}</RatingChip>
          {note}
        </span>
        {figureSub && <small>{figureSub}</small>}
      </span>
    </>
  ) : (
    <>
      <StatusDisc tone={tone}>{icon}</StatusDisc>
      {id}
      {moveLabel && <span className="kit-sr">{moveLabel}</span>}
      <span className="pu-rating-change-move" aria-hidden={moveLabel ? true : undefined}>
        {from && (
          <>
            <RatingChip step={from.step} steps={steps} size="sm">{from.label}</RatingChip>
            <Arrow />
          </>
        )}
        <RatingChip step={to.step} steps={steps} size="sm">{to.label}</RatingChip>
        {note}
      </span>
      <span className="pu-rating-change-scale">
        <RatingScale value={to.step} from={from?.step ?? null} steps={steps} />
      </span>
      <span className="pu-rating-change-figure">
        {figure != null && <b data-testid={testId ? `${testId}-value` : undefined}>{figure}</b>}
        {figureSub && <small>{figureSub}</small>}
      </span>
      <span className="pu-rating-change-chevron" aria-hidden="true">{pressable && <Chevron />}</span>
    </>
  );
  const common = { className: 'pu-rating-change', 'data-variant': variant, 'aria-label': ariaLabel, 'data-testid': testId };
  if (href)
    return (
      <li>
        <AppLink {...common} href={href} external={external} linkComponent={linkComponent}>{body}</AppLink>
      </li>
    );
  if (onClick)
    return (
      <li>
        <button type="button" {...common} onClick={onClick}>{body}</button>
      </li>
    );
  return (
    <li>
      <div {...common}>{body}</div>
    </li>
  );
}
