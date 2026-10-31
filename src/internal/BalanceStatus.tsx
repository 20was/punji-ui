import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';

export interface BalanceStatusLabels {
  balanced: string;
  /** Printed before the amount: "Out of balance by". */
  outOfBalance: string;
  debitsExceed: string;
  creditsExceed: string;
}

export const DEFAULT_BALANCE_LABELS: BalanceStatusLabels = {
  balanced: 'Balanced', outOfBalance: 'Out of balance by', debitsExceed: 'debits exceed credits', creditsExceed: 'credits exceed debits',
};

/**
 * Balanced or out of balance, said in words with an icon of a different shape
 * for each state (a check, a warning triangle). Colour only reinforces it.
 * `difference` is debits minus credits.
 */
export function BalanceStatus({ difference, money, labels, testId }: { difference: bigint; money: MoneyFormatConfig; labels?: Partial<BalanceStatusLabels>; testId?: string }) {
  const words = { ...DEFAULT_BALANCE_LABELS, ...labels };
  const balanced = difference === 0n;
  return (
    <p className="pu-balance" role="status" data-balanced={balanced ? 'true' : 'false'} data-testid={testId}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" className="pu-balance-icon">
        {balanced
          ? <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M8 2 14.5 13.5h-13zM8 6.5v3.2M8 11.4v.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {balanced ? words.balanced : <>
        <span>{words.outOfBalance}</span>
        <MoneyDisplay value={difference < 0n ? -difference : difference} preset={money} className="pu-balance-amount" />
        <span>({difference > 0n ? words.debitsExceed : words.creditsExceed})</span>
      </>}
    </p>
  );
}
