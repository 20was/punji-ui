/**
 * InstrumentHeader (design.punji.app/components/instrument-header): the head of a stock's, an index's or a fund's page
 * or panel. A glyph tile, the symbol over its name and group, and the price over its change. It joins the web kit's
 * QuoteHero, SymbolBlock and SecurityTitle.
 *
 * The price is exact (bigint minor units) and the change comes from `PriceChange`: the amount, the percent, an arrow
 * and a spoken word, so a move is never colour alone. The symbol and the figures never truncate; only the name line
 * takes an ellipsis. An unknown price is absent (a skeleton while it reads), never a dash or a zero.
 *
 * An index is not money: pass its value as `figure` and its published move as `figureChange`, already formatted.
 */
import type { ReactNode } from 'react';

import type { Change } from '../calculations/ratios.ts';
import { MoneyDisplay, type MoneySource } from '../money-display/MoneyDisplay.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';
import { PriceChange, type PriceChangeLabels } from '../price-change/PriceChange.tsx';
import { Skeleton } from '../states/States.tsx';

export interface InstrumentHeaderOptions extends Partial<Omit<MoneyFormatConfig, 'currency' | 'accounting' | 'signDisplay'>> {
  /** The symbol or short name ("NABIL"). Never truncated. Pass a button to make it open a finder. */
  symbol: ReactNode;
  /** The full name ("Nabil Bank Limited"); the line under the symbol and the only part that gives way. */
  name?: ReactNode;
  /** Its group, after the name ("Commercial Banks"). */
  group?: ReactNode;
  /** A small neutral tag after the symbol ("Index"). */
  tag?: ReactNode;
  /** A small icon for the kind of thing (a sector's glyph, candles for an index). Decorative. */
  glyph?: ReactNode;
  /** The last price in minor units (paisa), or an exact decimal string in major units. null: not known. */
  price?: bigint | string | null;
  /** The previous close in minor units. With `price` it gives the change, exactly. */
  previousClose?: bigint | null;
  /** A change you already have (for example from `priceChange`), used instead of `previousClose`. */
  change?: Change<bigint> | null;
  /** For a figure that is not money (an index in points): printed as given, in place of `price`. */
  figure?: ReactNode;
  /** For `figure`: its published move, printed as given ("+12.40 · +0.42%"), with the direction that draws the arrow and says the word. */
  figureChange?: { text: ReactNode; direction: 'up' | 'down' | 'flat' } | null;
  /** In the change's place when the figure is not live ("Last close · 16 Oct"). */
  note?: ReactNode;
  /** Icon buttons or links at the row's end (watch, alert). They wrap under the row on a phone. */
  actions?: ReactNode;
  /** The figures are still being read: skeleton bars hold their place. */
  loading?: boolean;
  /** The heading's level: 1, 2 (default) or 3. */
  headingLevel?: 1 | 2 | 3;
  /** The heading's id, for `aria-labelledby`. */
  headingId?: string;
  /** The spoken direction words for the change, in the reader's language. */
  changeLabels?: PriceChangeLabels;
  /** Extra class names on the root, layout only. */
  className?: string;
  /** Sets `data-testid` on the root; parts get `<testId>-price`, `-change` and `-note`. */
  testId?: string;
}

export type InstrumentHeaderProps = InstrumentHeaderOptions & Partial<MoneySource>;

const ARROWS = { up: '5,1.5 9,8.5 1,8.5', down: '5,8.5 1,1.5 9,1.5' } as const;

/**
 * @stability beta
 */
export function InstrumentHeader({
  symbol, name, group, tag, glyph, price, previousClose, change, figure, figureChange, note, actions, loading, headingLevel = 2, headingId,
  changeLabels, className, testId, currency, preset, locale, display, numberingSystem,
}: InstrumentHeaderProps) {
  const Heading = headingLevel === 1 ? 'h1' : headingLevel === 3 ? 'h3' : 'h2';
  const hasPrice = price != null && (currency !== undefined || preset !== undefined);
  const known = hasPrice || figure != null;
  const sub = name != null || group != null ? (
    <p className="pu-instrument-header-line">{name}{name != null && group != null ? ' · ' : ''}{group}</p>
  ) : null;
  const id = (suffix: string) => (testId ? `${testId}-${suffix}` : undefined);
  let figureNode: ReactNode = null;
  if (loading && !known) figureNode = <><Skeleton width={72} height={20} /><Skeleton width={56} height={12} /></>;
  else if (known) {
    const moneySource = { currency, preset } as MoneySource;
    figureNode = (
      <>
        <b className="pu-instrument-header-price" data-testid={id('price')}>
          {hasPrice ? <MoneyDisplay value={price} locale={locale} display={display ?? 'none'} numberingSystem={numberingSystem} {...moneySource} /> : figure}
        </b>
        {note ? (
          <span className="pu-instrument-header-note" data-testid={id('note')}>{note}</span>
        ) : hasPrice && (change || previousClose != null) ? (
          <span data-testid={id('change')}>
            <PriceChange size="sm" locale={locale} numberingSystem={numberingSystem} labels={changeLabels} {...(change ? { change } : { current: price as bigint, previous: previousClose })} {...moneySource} />
          </span>
        ) : !hasPrice && figureChange ? (
          <span className="pu-instrument-header-move" data-direction={figureChange.direction} data-testid={id('change')}>
            {figureChange.direction !== 'flat' && <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false"><polygon points={ARROWS[figureChange.direction]} fill="currentColor" /></svg>}
            {figureChange.text}
            <span className="kit-sr"> {{ up: 'up', down: 'down', flat: 'unchanged', ...changeLabels }[figureChange.direction]}</span>
          </span>
        ) : null}
      </>
    );
  }
  return (
    <div className={`pu-instrument-header${className ? ` ${className}` : ''}`} aria-busy={loading && !known ? true : undefined} data-testid={testId}>
      {glyph && <span className="pu-instrument-header-glyph" aria-hidden="true">{glyph}</span>}
      <div className="pu-instrument-header-id">
        <Heading id={headingId} className="pu-instrument-header-symbol">
          <span>{symbol}</span>
          {tag && <span className="pu-instrument-header-tag">{tag}</span>}
        </Heading>
        {sub}
      </div>
      {figureNode && <div className="pu-instrument-header-figures">{figureNode}</div>}
      {actions && <div className="pu-instrument-header-actions">{actions}</div>}
    </div>
  );
}
