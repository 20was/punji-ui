/**
 * SummaryFigure (design.punji.app/components/summary-figure): one figure a
 * reader acts on, with its label above and a short note beside it, e.g.
 * what selling everything today would pay. It sits on the card's own surface
 * between hairlines (no box in a card); the default `inverse` tone gives the
 * label full weight (the one figure on a card that stands out), `tone="tint"`
 * keeps it quiet. The figure never truncates: on a narrow card the note wraps
 * under it.
 *
 * HeadlineFigure is a page's or a view's lead figure, with FigureChips for its
 * changes (a soft gain, loss or flat ground; the sign and the words come in the
 * chip's text, never colour alone). They share this file and stylesheet
 * because they are the two sizes of "one figure that matters".
 */
import type { ReactNode } from 'react';

export interface SummaryFigureProps {
  label: ReactNode;
  /** The figure, exactly as published or computed (a Figure, a MoneyDisplay). */
  value: ReactNode;
  note?: ReactNode;
  tone?: 'inverse' | 'tint';
  size?: 'md' | 'lg';
  testId?: string;
}

export function SummaryFigure({ label, value, note, tone = 'inverse', size = 'md', testId }: SummaryFigureProps) {
  return (
    <div className={`kit-sumfig${tone === 'inverse' ? ' lead' : ''}${size === 'lg' ? ' lg' : ''}`} data-testid={testId}>
      <span className="kit-sumfig-k">{label}</span>
      <div className="kit-sumfig-row">
        <b className="kit-sumfig-v">{value}</b>
        {note !== undefined && note !== null && <span className="kit-sumfig-n">{note}</span>}
      </div>
    </div>
  );
}

const has = (n: ReactNode) => n !== undefined && n !== null && n !== false && n !== '';

export interface HeadlineFigureProps {
  /** A quiet label above the figure. */
  label?: ReactNode;
  /** A small control at the end of the label's line (an amounts toggle). */
  labelAction?: ReactNode;
  /** One sentence under the figure: what it means. */
  line?: ReactNode;
  /** The figure, exactly as published or computed (a Figure, a MoneyDisplay). */
  value: ReactNode;
  /** Printed before the figure, smaller and muted ("Rs"). Leave it out when `value` is a MoneyDisplay. */
  currency?: ReactNode;
  /** Beside the figure, on its baseline (a change). */
  aside?: ReactNode;
  /** Under the figure: FigureChips. */
  children?: ReactNode;
  /** 'xl' (default) or 'lg'. */
  size?: 'xl' | 'lg';
  /** Sets `data-testid` on the root. */
  testId?: string;
  /** Sets `data-testid` on the figure. */
  valueTestId?: string;
}

/**
 * A page's or a view's lead figure: a quiet label, the figure large ("Rs"
 * smaller and muted), and beside or under it the changes as FigureChips. The
 * figure never truncates; a long label wraps.
 */
export function HeadlineFigure({ label, labelAction, value, currency, aside, line, children, size = 'xl', testId, valueTestId }: HeadlineFigureProps) {
  return (
    <div className={`kit-headfig ${size}`} data-testid={testId}>
      {has(label) && has(labelAction) ? (
        <div className="kit-headfig-kr">
          <p className="kit-headfig-k">{label}</p>
          {labelAction}
        </div>
      ) : (
        has(label) && <p className="kit-headfig-k">{label}</p>
      )}
      <div className="kit-headfig-row">
        <div className="kit-headfig-v" data-testid={valueTestId}>
          {has(currency) && <span className="cur">{currency}</span>}
          {has(currency) && ' '}
          {value}
        </div>
        {has(aside) && <div className="kit-headfig-aside">{aside}</div>}
      </div>
      {has(line) && <p className="kit-headfig-line">{line}</p>}
      {has(children) && <div className="kit-headfig-chips">{children}</div>}
    </div>
  );
}

export interface FigureChipProps {
  /** `up` and `down` tint the chip as a gain or a loss; `flat` is quiet. */
  tone: 'up' | 'down' | 'flat';
  /** The change as words and figures. Put the sign in the text ("+Rs 320 (+2.6%)"): the tint never carries it alone. */
  children: ReactNode;
  /** Spoken before the text and not shown ("Gain", "Loss"), for a change whose text has no sign or word. */
  srLabel?: string;
  /** Sets `data-testid` on the chip. */
  testId?: string;
}

/** One change as a soft pill under a HeadlineFigure. */
export function FigureChip({ tone, children, srLabel, testId }: FigureChipProps) {
  return (
    <span className={`kit-figchip ${tone}`} data-testid={testId}>
      {srLabel && <span className="kit-sr">{srLabel}: </span>}
      {children}
    </span>
  );
}
