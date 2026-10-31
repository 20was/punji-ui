/**
 * MarketStatus: whether a market is open, in pre-open, closed, halted or on a
 * holiday. Each state has its own icon shape and its own word, so the state is
 * never carried by colour alone. Give it a `state` you know (from a feed), or
 * the result of `getMarketSession(now, schedule)`.
 */
import type { ReactNode } from 'react';

import { StatusPill } from '../status-pill/StatusPill.tsx';
import type { MarketSession, MarketState } from './session.ts';

export { getMarketSession, nepseSchedule } from './session.ts';
export type { MarketHoliday, MarketSchedule, MarketSession, MarketState, SessionWindow } from './session.ts';

export type MarketStatusLabels = Record<MarketState, string>;
const EN_LABELS: MarketStatusLabels = { open: 'Open', 'pre-open': 'Pre-open', closed: 'Closed', halted: 'Halted', holiday: 'Holiday' };
const TONES: Record<MarketState, 'gain' | 'info' | 'warn' | 'loss' | 'accent' | undefined> = { open: 'gain', 'pre-open': 'info', closed: undefined, halted: 'loss', holiday: 'warn' };

const ICONS: Record<MarketState, ReactNode> = {
  open: <><circle cx="8" cy="8" r="6" /><path d="m5.2 8.2 2 2 3.6-4" /></>,
  'pre-open': <><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.4 1.6" /></>,
  closed: <><circle cx="8" cy="8" r="6" /><path d="M5 8h6" /></>,
  halted: <><rect x="2.5" y="2.5" width="11" height="11" rx="2" /><path d="M6.4 5.6v4.8M9.6 5.6v4.8" /></>,
  holiday: <><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></>,
};

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
  /** 'sm' for a smaller pill in tight rows. Default the regular size. */
  size?: 'sm';
  /** Sets `data-testid` on the status element. */
  testId?: string;
}

export function MarketStatus({ state, session, labels, detail, market, size, testId }: MarketStatusProps) {
  const resolved: MarketState = state ?? session?.state ?? 'closed';
  const words = { ...EN_LABELS, ...labels }[resolved];
  const note = detail ?? (resolved === 'holiday' ? session?.label : undefined);
  return (
    <span className="pu-market-status" data-state={resolved} role="status" data-testid={testId}>
      <StatusPill tone={TONES[resolved]} size={size}>
        <svg className="pu-market-status-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">{ICONS[resolved]}</svg>
        {market && <span className="kit-sr">{market}: </span>}
        {words}
      </StatusPill>
      {note && <span className="pu-market-status-note">{note}</span>}
    </span>
  );
}
