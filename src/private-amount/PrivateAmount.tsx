'use client';

/**
 * PrivateAmount (design.punji.app/components/private-amount): a figure the viewer can hide on this device, for when
 * someone may see the screen. One store for the whole app: every `PrivateAmount`, every `AmountsToggle` and any code
 * that calls `setAmountsHidden` see the same state, saved in this browser (localStorage; shown when storage is blocked)
 * and kept in step across tabs.
 *
 * Hidden, the figure is not in the page at all: the box reads "Rs ••••••" (aria-hidden) and is named "Amount hidden"
 * for screen readers. Wrap only private amounts; percentages, counts and published market figures are not.
 * `MoneyDisplay` and `Figure` take `masked` for the same mask when you already hold the state.
 */
import { useSyncExternalStore, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { MASK, maskText } from '../internal/mask.tsx';
import type { ControlSize } from '../select/Select.tsx';

export { MASK };

const KEY = 'punji-amounts-hidden';
const listeners = new Set<() => void>();
// undefined until first read, so importing this module touches no storage (server render, tests).
let hidden: boolean | undefined;

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function onStorage(e: StorageEvent): void {
  if (e.key !== KEY && e.key !== null) return;
  const next = read();
  if (next === hidden) return;
  hidden = next;
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener('storage', onStorage);
    // The value may have changed while nobody listened.
    hidden = read();
  }
  listeners.add(l);
  return () => {
    listeners.delete(l);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

/** Whether amounts are hidden now (outside React). False on the server. */
export function amountsHidden(): boolean {
  if (typeof window === 'undefined') return false;
  hidden ??= read();
  return hidden;
}

/** Hide or show every private amount, and remember it on this device. */
export function setAmountsHidden(next: boolean): void {
  if (typeof window === 'undefined' || next === amountsHidden()) return;
  hidden = next;
  try {
    if (next) window.localStorage.setItem(KEY, '1');
    else window.localStorage.removeItem(KEY);
  } catch {
    /* Storage blocked: hidden for this page's life only. */
  }
  for (const l of listeners) l();
}

/** The shared state, re-rendering when it changes anywhere in the app (or in another tab). Amounts show until the browser says otherwise, so the server render and the first client render agree. */
export function useAmountsHidden(): boolean {
  return useSyncExternalStore(subscribe, amountsHidden, () => false);
}

export interface PrivateAmountProps {
  /** The figure as it shows when amounts are shown. It is not rendered while hidden. */
  children: ReactNode;
  /** The currency mark the mask starts with ("Rs", "रु"); empty for a bare figure. Default "Rs". */
  currency?: string;
  /** Read out in place of the figure while it is hidden. Default 'Amount hidden'. */
  hiddenLabel?: string;
  /** The figure's own classes (size, weight), so the mask sits the same. */
  className?: string;
  /** Becomes data-testid on the mask. */
  testId?: string;
}

/**
 * A private figure: as given while amounts are shown, "Rs ••••••" while hidden.
 * @stability beta
 */
export function PrivateAmount({ children, currency = 'Rs', hiddenLabel = 'Amount hidden', className, testId }: PrivateAmountProps) {
  const h = useAmountsHidden();
  if (!h) return <>{children}</>;
  return (
    <span className={`kit-fig pu-private${className ? ` ${className}` : ''}`} role="img" aria-label={hiddenLabel} data-private="hidden" data-testid={testId}>
      <span aria-hidden="true">{maskText(currency)}</span>
    </span>
  );
}

/** The eye (amounts shown) or the eye struck through (hidden), for a menu item or a button. Decorative. */
export interface EyeIconProps {
  /** Struck through: amounts are hidden. */
  off: boolean;
  /** Width and height in px. Default 18. */
  size?: number;
}

export function EyeIcon({ off, size = 18 }: EyeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

export interface AmountsToggleProps {
  /** Its name while amounts show. Default 'Hide amounts'. */
  hideLabel?: string;
  /** Its name while amounts are hidden. Default 'Show amounts'. */
  showLabel?: string;
  /** Button size. Default md. */
  size?: ControlSize;
  /** Layout only (margin, grid placement), never a restyle. */
  className?: string;
  /** Becomes data-testid on the button. */
  testId?: string;
}

/**
 * The eye beside a headline figure: hides or shows every private amount (`aria-pressed` while hidden).
 * @stability beta
 */
export function AmountsToggle({ hideLabel = 'Hide amounts', showLabel = 'Show amounts', size = 'md', className, testId }: AmountsToggleProps) {
  const h = useAmountsHidden();
  return (
    <Button variant="ghost" size={size} iconOnly label={h ? showLabel : hideLabel} aria-pressed={h} onClick={() => setAmountsHidden(!h)} className={className} testId={testId}>
      <EyeIcon off={!h} />
    </Button>
  );
}
