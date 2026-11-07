/**
 * The hidden-amount mark shared by PrivateAmount, MoneyDisplay and Figure: bullets for sighted people (aria-hidden,
 * so the dots are never read out) and a name for screen readers. The real amount is never put in the page.
 */

/** Six bullets: the same width whatever the amount, so hiding it does not say how large it is. */
export const MASK = '••••••';

/** The currency mark that starts the mask ("Rs ••••••"), or the bare mask when there is none. */
export function maskText(currency?: string): string {
  return currency ? `${currency} ${MASK}` : MASK;
}
