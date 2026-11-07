/**
 * MarketStatus: whether a market is open, in pre-open, closed, halted, on a
 * holiday or offline. Each state has its own icon shape and its own word, so
 * the state is never carried by colour alone. Give it a `state` you know (from
 * a feed), or the result of `getMarketSession(now, schedule)`. `offline` is the
 * device's connection, not the exchange's: the figures beside it are the last
 * it had.
 *
 * An optional `index` slot prints the market's index value and its change as
 * the exchange published them; the change carries an arrow, its sign and a
 * word. `marketSessionSentence` builds the one-line story of the session
 * ("Closed for Dashain · prices of 16 Oct · opens Wed 21 Oct, 11:00").
 */
import type { ReactNode } from 'react';

import { StatusPill } from '../status-pill/StatusPill.tsx';
import type { MarketSession, MarketState } from './session.ts';

export { getMarketSession, nepseSchedule } from './session.ts';
export { marketSentenceLabels, marketSessionSentence } from './sentence.ts';
export type { MarketSentenceLabels, MarketSentenceOptions } from './sentence.ts';
export type { MarketHoliday, MarketSchedule, MarketSession, MarketState, SessionWindow } from './session.ts';

export type MarketStatusLabels = Record<MarketState, string>;
const EN_LABELS: MarketStatusLabels = { open: 'Open', 'pre-open': 'Pre-open', closed: 'Closed', halted: 'Halted', holiday: 'Holiday', offline: 'Offline' };
const TONES: Record<MarketState, 'gain' | 'info' | 'warn' | 'loss' | 'accent' | undefined> = { open: 'gain', 'pre-open': 'info', closed: undefined, halted: 'loss', holiday: 'warn', offline: 'warn' };

const ICONS: Record<MarketState, ReactNode> = {
  open: <><circle cx="8" cy="8" r="6" /><path d="m5.2 8.2 2 2 3.6-4" /></>,
  'pre-open': <><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.4 1.6" /></>,
  closed: <><circle cx="8" cy="8" r="6" /><path d="M5 8h6" /></>,
  halted: <><rect x="2.5" y="2.5" width="11" height="11" rx="2" /><path d="M6.4 5.6v4.8M9.6 5.6v4.8" /></>,
  holiday: <><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></>,
  offline: <><circle cx="8" cy="8" r="6" /><path d="m5.6 5.6 4.8 4.8M10.4 5.6l-4.8 4.8" /></>,
};

export interface MarketStatusIndex {
  /** The index's name ("NEPSE"). */
  name?: ReactNode;
  /** The value as published ("2,641.18"), already formatted. Index points are not money, so the caller prints them as the exchange does. */
  value: ReactNode;
  /** Its change as published, signed ("+0.42%"). The sign is part of the text; it is never recomputed here. Leave it out when unknown (no change is drawn, never a 0). */
  change?: ReactNode;
  /** Which way the change went: draws the arrow and says the word. Default 'flat'. */
  direction?: 'up' | 'down' | 'flat';
}

export interface MarketStatusChangeLabels { up: string; down: string; flat: string }
const EN_CHANGE: MarketStatusChangeLabels = { up: 'up', down: 'down', flat: 'unchanged' };
const ARROWS = { up: '4,0 8,7 0,7', down: '0,0 8,0 4,7' } as const;

export interface MarketStatusProps {
  /** The state to show. Use this or `session`. */
  state?: MarketState;
  /** A result of `getMarketSession`; its state, label and next change are used. */
  session?: MarketSession;
  /** The words for each state, in the reader's language. */
  labels?: Partial<MarketStatusLabels>;
  /** A short note beside the state ("Opens 11:00", "Dashain"). Default: the session's label when it is a holiday. */
  detail?: ReactNode;
  /** Names the market for screen readers ("NEPSE"); spoken before the state. */
  market?: string;
  /** The market's index beside the state: its value and change as published. Drawn outside the live status region, so a price tick is not announced. */
  index?: MarketStatusIndex;
  /** The spoken direction words for the index's change, in the reader's language. */
  changeLabels?: Partial<MarketStatusChangeLabels>;
  /** 'sm' for a smaller pill in tight rows. Default the regular size. */
  size?: 'sm';
  /** Sets `data-testid` on the status element; the index gets `<testId>-index`. */
  testId?: string;
}

/**
 * @stability stable
 */
export function MarketStatus({ state, session, labels, detail, market, index, changeLabels, size, testId }: MarketStatusProps) {
  const resolved: MarketState = state ?? session?.state ?? 'closed';
  const words = { ...EN_LABELS, ...labels }[resolved];
  const note = detail ?? (resolved === 'holiday' ? session?.label : undefined);
  const status = (
    <span className="pu-market-status" data-state={resolved} role="status" data-testid={testId}>
      <StatusPill tone={TONES[resolved]} size={size}>
        <svg className="pu-market-status-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">{ICONS[resolved]}</svg>
        {market && <span className="kit-sr">{market}: </span>}
        {words}
      </StatusPill>
      {note && <span className="pu-market-status-note">{note}</span>}
    </span>
  );
  if (!index) return status;
  const direction = index.direction ?? 'flat';
  return (
    <span className="pu-market-status-wrap">
      {status}
      <span className="pu-market-status-index" data-testid={testId ? `${testId}-index` : undefined}>
        {index.name && <span className="pu-market-status-index-name">{index.name}</span>}
        <b className="pu-market-status-index-value">{index.value}</b>
        {index.change != null && (
          <span className="pu-market-status-index-change" data-direction={direction}>
            {direction !== 'flat' && (
              <svg width="8" height="7" viewBox="0 0 8 7" aria-hidden="true" focusable="false"><polygon points={ARROWS[direction]} fill="currentColor" /></svg>
            )}
            {index.change}
            <span className="kit-sr"> {{ ...EN_CHANGE, ...changeLabels }[direction]}</span>
          </span>
        )}
      </span>
    </span>
  );
}
