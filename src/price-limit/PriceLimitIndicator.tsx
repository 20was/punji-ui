/**
 * PriceLimitIndicator: where the last traded price sits between the day's
 * lower and upper circuit limits. Supply the limits the exchange published, or
 * a previous close and a band rate and they are computed (`circuitLimits`).
 * At a limit it says so in words with an icon (a status the screen reader
 * announces), and the bar's accessible name carries every figure.
 */
import type { ReactNode } from 'react';

import { RangeBar } from '../meter/Meter.tsx';

import { getMoneyFormatter, type MoneyFormatConfig } from '../money/money.ts';
import { StatusPill } from '../status-pill/StatusPill.tsx';
import { nepalQuoteMoney } from '../stock-table/format.ts';
import { circuitLimits, limitPosition } from './limits.ts';

export { circuitLimits, limitPosition } from './limits.ts';
export type { CircuitLimits, LimitPosition, LimitState } from './limits.ts';

export interface PriceLimitLabels {
  ltp: string; lower: string; upper: string; previous: string;
  atUpper: string; atLower: string; outside: string; within: string; unknown: string;
}
const EN: PriceLimitLabels = {
  ltp: 'Last price', lower: 'Lower limit', upper: 'Upper limit', previous: 'Previous close',
  atUpper: 'At upper circuit', atLower: 'At lower circuit', outside: 'Beyond the circuit band', within: 'Within limits', unknown: 'Circuit limits unavailable',
};

export interface PriceLimitIndicatorProps {
  /** Last traded price, minor units. */
  ltp: bigint | null | undefined;
  /** The exchange's published limits, minor units. Used when both are given. */
  lowerLimit?: bigint | null;
  upperLimit?: bigint | null;
  /** The previous close; marks the middle of the bar and, with `bandRate`, derives the limits. */
  previousClose?: bigint | null;
  /** Decimal fraction string for a band around the previous close ('0.10' is ±10%). Ignored when both limits are given. */
  bandRate?: string;
  /** Names the stock ("NABIL") in the accessible name. */
  symbol?: string;
  money?: MoneyFormatConfig;
  labels?: Partial<PriceLimitLabels>;
  /** Show the limit figures under the bar (default true). */
  showFigures?: boolean;
  testId?: string;
}

export function PriceLimitIndicator({ ltp, lowerLimit, upperLimit, previousClose, bandRate, symbol, money = nepalQuoteMoney, labels, showFigures = true, testId }: PriceLimitIndicatorProps) {
  const words = { ...EN, ...labels };
  const derived = lowerLimit == null && upperLimit == null && previousClose != null && bandRate ? circuitLimits(previousClose, bandRate) : null;
  const lower = lowerLimit ?? derived?.lower ?? null;
  const upper = upperLimit ?? derived?.upper ?? null;
  const at = limitPosition(ltp, lower, upper);
  const formatter = getMoneyFormatter(money);
  const f = (v: bigint | null | undefined) => (v == null ? '—' : formatter.format(v));
  const flag: ReactNode =
    at.state === 'at-upper' ? words.atUpper : at.state === 'at-lower' ? words.atLower : at.state === 'unknown' ? words.unknown : null;
  const stateWord = at.outside ? `${flag}, ${words.outside.toLowerCase()}` : flag ?? words.within;
  const name = at.state === 'unknown'
    ? `${symbol ? `${symbol}: ` : ''}${words.unknown}`
    : `${symbol ? `${symbol}: ` : ''}${words.ltp} ${f(ltp)}; ${words.lower} ${f(lower)}; ${words.upper} ${f(upper)}${previousClose != null ? `; ${words.previous} ${f(previousClose)}` : ''}; ${stateWord}`;
  return (
    <div className="pu-limit" data-state={at.state} data-outside={at.outside || undefined} data-testid={testId}>
      {at.state === 'unknown' ? (
        <p className="pu-limit-none" role="status">{words.unknown}</p>
      ) : (
        <>
          <RangeBar
            domain={[Number(lower), Number(upper)]}
            marks={[...(previousClose != null ? [{ value: Number(previousClose), kind: 'tick' as const }] : []), { value: Number(ltp), kind: 'strong' as const }]}
            label={name}
            head={showFigures ? <><span>{words.ltp}</span><b>{f(ltp)}</b></> : undefined}
            legend={showFigures ? [<span key="l"><span>{words.lower}</span><b>{f(lower)}</b></span>, previousClose != null ? <span key="p"><span>{words.previous}</span><b>{f(previousClose)}</b></span> : '', <span key="u"><span>{words.upper}</span><b>{f(upper)}</b></span>] : undefined}
          />
          <span role="status" className="pu-limit-flag">
            {flag && (
              <StatusPill tone={at.state === 'at-upper' ? 'gain' : 'loss'} size="sm">
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false" className="pu-limit-icon">
                  <path d={at.state === 'at-upper' ? 'M8 13V3M4 7l4-4 4 4' : 'M8 3v10M4 9l4 4 4-4'} />
                </svg>
                {flag}
                {at.outside && <span className="kit-sr">, {words.outside}</span>}
              </StatusPill>
            )}
          </span>
        </>
      )}
    </div>
  );
}
