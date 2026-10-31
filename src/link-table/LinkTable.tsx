'use client';
/**
 * LinkTable (design.punji.app/components/link-table): a short list where every
 * row opens something (a holding, a watched stock, a sector), with quiet
 * column heads over it. Each row is one link (or a plain row when it opens
 * nothing), its cells on one grid with the heads, split by hairlines. Figures
 * sit right-aligned and never truncate; only a name gives way, with an
 * ellipsis (StockLabel). Under 560px of its own width the heads go and each
 * row shows its two-sided `compact` layout instead (lead left, figures right).
 *
 * The heads are drawn for the eye only: a row's link says everything it shows,
 * so a screen reader hears one sentence per row. Give a row `ariaLabel` when
 * its cells alone do not read as a sentence. For a long or sortable table use
 * DataTable instead.
 */
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import type { LinkComponent } from '../internal/link.tsx';

import { ChevronRight } from '../layout/Layout.tsx';

export interface LinkColumn {
  /** Unique, stable key. */
  key: string;
  /** The column head's words (drawn for the eye only). */
  label: ReactNode;
  /** The column's grid track ("minmax(0, 1.3fr)", "88px", "auto"). */
  track: string;
  /** Right-aligned (figures). */
  end?: boolean;
}

const Ctx = createContext<{ ends: readonly boolean[]; linkComponent?: LinkComponent }>({ ends: [] });

export function LinkTable({ label, columns, children, chevron = true, heads = true, compactAt = 560, linkComponent, testId }: {
  /** Names the list for screen readers. */
  label: string;
  /** The grid tracks and their heads, in cell order. */
  columns: readonly LinkColumn[];
  /** The `LinkTableRow`s. */
  children: ReactNode;
  /** A chevron at each row's end (rows that open something). */
  chevron?: boolean;
  /** Draw the column heads. */
  heads?: boolean;
  /** Under this width of its own (560 or 360px) the rows turn compact. */
  compactAt?: 560 | 360;
  /** The link element for in-app row addresses (wrap your router's link). Default: a plain <a>. */
  linkComponent?: LinkComponent;
  /** Sets `data-testid` on the root. */
  testId?: string;
}) {
  const tracks = `${columns.map((c) => c.track).join(' ')}${chevron ? ' 14px' : ''}`;
  return (
    <div className={`kit-lt${chevron ? ' chev' : ''}${compactAt === 360 ? ' cq-sm' : ''}`} style={{ '--kit-lt-cols': tracks } as CSSProperties} data-testid={testId}>
      {heads && (
        <div className="kit-lt-h" aria-hidden="true">
          {columns.map((c) => (
            <span key={c.key} className={c.end ? 'end' : undefined}>
              {c.label}
            </span>
          ))}
          {chevron && <span />}
        </div>
      )}
      <ul className="kit-lt-rows" aria-label={label}>
        <Ctx.Provider value={{ ends: columns.map((c) => !!c.end), linkComponent }}>{children}</Ctx.Provider>
      </ul>
    </div>
  );
}

export interface LinkTableRowProps {
  /** The cells, in the columns' order (the column's `end` aligns them). */
  cells: readonly ReactNode[];
  /** The narrow layout: the lead on the left, the figures on the right. */
  compact?: { lead: ReactNode; trail: ReactNode };
  /** Makes the row a link. */
  href?: string;
  /** The link's full name when its cells say less than it means. */
  ariaLabel?: string;
  /** Sets `data-testid` on the row. */
  testId?: string;
}

export function LinkTableRow({ cells, compact, href, ariaLabel, testId }: LinkTableRowProps) {
  const { ends, linkComponent } = useContext(Ctx);
  const body = (
    <>
      {cells.map((c, i) => (
        <span key={i} className={`kit-lt-c${ends[i] ? ' end' : ''}`}>
          {c}
        </span>
      ))}
      {compact && (
        <span className="kit-lt-cp">
          <span className="l">{compact.lead}</span>
          <span className="r">{compact.trail}</span>
        </span>
      )}
      {href && (
        <span className="kit-lt-ch">
          <ChevronRight />
        </span>
      )}
    </>
  );
  const cls = `kit-lt-row${compact ? ' has-cp' : ''}`;
  const L = linkComponent && href && !/^https?:/.test(href) ? linkComponent : 'a';
  return (
    <li>
      {href ? (
        <L className={cls} href={href} aria-label={ariaLabel} data-testid={testId}>
          {body}
        </L>
      ) : (
        <div className={cls} data-testid={testId}>
          {body}
        </div>
      )}
    </li>
  );
}

/**
 * A stock's two lines: the symbol (never shrinks), an optional tag after it
 * (a StatusPill), and a second line (its name, the number of shares held) that
 * takes what room is left and ends in an ellipsis. `extra` follows the line
 * after a "·" the label draws (one spacing, never cut), so pass only the fact
 * ("100 shares").
 */
export function StockLabel({ symbol, tag, line, extra, shrink = false, testId }: {
  /** The first line; it never shrinks. */
  symbol: ReactNode;
  /** A small element after the symbol, for example a StatusPill. */
  tag?: ReactNode;
  /** The second line (a name); it takes the room left and ends in an ellipsis. */
  line?: ReactNode;
  /** After the line and a "·", never cut ("100 shares"): the line gives way first. */
  extra?: ReactNode;
  /** The first line is a name, not a symbol (a broker, whose number is its badge): it gives way with an ellipsis before the figures beside it do. */
  shrink?: boolean;
  /** Sets `data-testid` on the label. */
  testId?: string;
}) {
  return (
    <span className={`kit-stock${shrink ? ' shrink' : ''}`} data-testid={testId}>
      <span className="kit-stock-1">
        <b>{symbol}</b>
        {tag}
      </span>
      {((line !== undefined && line !== null) || extra) && (
        <span className="kit-stock-2">
          <span className="kit-stock-n">{line}</span>
          {extra && (
            <span className="kit-stock-x">
              {' '}
              <span aria-hidden="true">·</span> {extra}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
