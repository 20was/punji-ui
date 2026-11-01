/**
 * TradingHaltBanner: the line across a terminal when trading stops. An index circuit breaker (the index moved by a
 * set percent and trading pauses), a halt the exchange announced, or trading resumed. A halt is an alert, so a
 * screen reader hears it at once; resumed is a polite status. It says when trading resumes in words, never by
 * colour. `circuitBreakerStage` picks the breaker stage from an index move with tiers you can replace.
 */
import type { ReactNode } from 'react';

import { ToneIcon } from '../states/States.tsx';

export interface CircuitTier {
  /** The absolute index move, in percent units (4 means ±4%), that triggers this stage. */
  movePercent: number;
  /** How long trading pauses; null means for the rest of the day. */
  haltMinutes: number | null;
}

/**
 * An example of NEPSE's index circuit breaker: ±4% pauses 15 minutes, ±5% pauses 40 minutes, ±6% stops trading for
 * the day. Verify against the current NEPSE trading bylaws, which also exempt late-session triggers.
 */
export const nepseCircuitTiers: readonly CircuitTier[] = Object.freeze([
  Object.freeze({ movePercent: 4, haltMinutes: 15 }),
  Object.freeze({ movePercent: 5, haltMinutes: 40 }),
  Object.freeze({ movePercent: 6, haltMinutes: null }),
]);

/** The highest stage an index move (percent, signed) reaches, or null below the first. Tiers may come in any order. */
export function circuitBreakerStage(changePercent: number, tiers: readonly CircuitTier[] = nepseCircuitTiers): CircuitTier | null {
  if (!Number.isFinite(changePercent)) return null;
  const move = Math.abs(changePercent);
  let hit: CircuitTier | null = null;
  for (const tier of tiers) if (move >= tier.movePercent && (!hit || tier.movePercent > hit.movePercent)) hit = tier;
  return hit;
}

export type TradingHaltKind = 'circuit-breaker' | 'halt' | 'resumed';

export interface TradingHaltLabels {
  /** Title per kind. `direction` is 'up' or 'down' for a breaker when `changePercent` is known. */
  title: (kind: TradingHaltKind, market: string, direction: 'up' | 'down' | null) => string;
  /** "NEPSE moved 4.12%" style line for a breaker. */
  move: (percent: string, direction: 'up' | 'down') => string;
  resumesAt: (time: string) => string;
  restOfDay: string;
  pausedFor: (minutes: string) => string;
  dismiss: string;
}

const EN: TradingHaltLabels = {
  title: (kind, market, direction) => kind === 'resumed'
    ? `${market} trading has resumed`
    : kind === 'halt'
      ? `${market} trading is halted`
      : `${market} circuit breaker${direction ? ` (${direction === 'up' ? 'up' : 'down'})` : ''}: trading paused`,
  move: (percent, direction) => `The index is ${direction} ${percent}.`,
  resumesAt: (time) => `Trading resumes at ${time}.`,
  restOfDay: 'Trading is closed for the rest of the day.',
  pausedFor: (minutes) => `Paused for ${minutes} minutes.`,
  dismiss: 'Dismiss',
};

export interface TradingHaltBannerProps {
  kind: TradingHaltKind;
  /** Market name in the title. Default "NEPSE". */
  market?: string;
  /** The index move that tripped a breaker, signed percent units (-4.12). Shown in words, and with `tiers` gives the pause. */
  changePercent?: number;
  /** Breaker stages for the pause length. Default `nepseCircuitTiers`. */
  tiers?: readonly CircuitTier[];
  /** When trading resumes, already formatted ("13:25" or a BS date and time). */
  resumesAt?: string;
  /** One more line (the exchange notice, what open orders do). */
  detail?: ReactNode;
  /** An action, such as a link to the notice. */
  action?: ReactNode;
  /** Shows a dismiss button. A halt you dismiss is still a halt: keep the ticket disabled. */
  onDismiss?: () => void;
  /** Digits for the move and minutes. Default 'latn'. */
  digits?: 'latn' | 'deva';
  labels?: Partial<TradingHaltLabels>;
  testId?: string;
  className?: string;
}

export function TradingHaltBanner({ kind, market = 'NEPSE', changePercent, tiers = nepseCircuitTiers, resumesAt, detail, action, onDismiss, digits = 'latn', labels, testId, className }: TradingHaltBannerProps) {
  const words = { ...EN, ...labels };
  const num = (text: string) => (digits === 'deva' ? text.replace(/\d/g, (d) => '०१२३४५६७८९'[Number(d)]!) : text);
  const known = changePercent !== undefined && Number.isFinite(changePercent);
  const direction = known && changePercent !== 0 ? (changePercent > 0 ? 'up' : 'down') : null;
  const stage = kind === 'circuit-breaker' && known ? circuitBreakerStage(changePercent, tiers) : null;
  const lines: string[] = [];
  if (kind === 'circuit-breaker' && direction) lines.push(words.move(`${num(Math.abs(changePercent!).toFixed(2))}%`, direction));
  if (kind !== 'resumed') {
    if (stage && stage.haltMinutes === null) lines.push(words.restOfDay);
    else if (resumesAt) lines.push(words.resumesAt(resumesAt));
    else if (stage?.haltMinutes != null) lines.push(words.pausedFor(num(String(stage.haltMinutes))));
  }
  const resumed = kind === 'resumed';
  return (
    <div className={`pu-halt${className ? ` ${className}` : ''}`} data-kind={kind} role={resumed ? 'status' : 'alert'} data-testid={testId}>
      <ToneIcon tone={resumed ? 'success' : kind === 'halt' ? 'error' : 'warn'} />
      <div className="pu-halt-body">
        <b className="pu-halt-title">{words.title(kind, market, direction)}</b>
        {lines.length > 0 && <span>{lines.join(' ')}</span>}
        {detail && <span className="pu-halt-detail">{detail}</span>}
      </div>
      {(action || onDismiss) && (
        <div className="pu-halt-actions">
          {action}
          {onDismiss && (
            <button type="button" className="pu-halt-dismiss" aria-label={words.dismiss} onClick={onDismiss}>
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
