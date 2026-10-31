/**
 * SummaryFigure (design.punji.app/components/summary-figure): one figure a
 * reader acts on, with its label above and a short note beside it, e.g.
 * what selling everything today would pay. It sits on the card's own surface
 * between hairlines (no box in a card); the default `inverse` tone gives the
 * label full weight (the one figure on a card that stands out), `tone="tint"`
 * keeps it quiet. The figure never truncates: on a narrow card the note wraps
 * under it.
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
