import { useSyncExternalStore } from 'react';

// Global preview preferences: the locale, density and theme every example stage (and the phone-width frame) shows.
// One external store, so every control and every stage agree. The server snapshot is always the defaults, so the
// prerendered HTML and the first client render are identical; React then switches to the stored or linked values
// after hydration (useSyncExternalStore re-renders when the client snapshot differs).
//
// A link carries the view: ?locale=ne-NP&density=compact&theme=dark-hc. A link wins over the stored choice; the
// stored choice (localStorage) carries it to the next visit.

export const LOCALES = [
  { value: 'en-NP', label: 'English (Nepal)' },
  { value: 'ne-NP', label: 'नेपाली (Nepal)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-US', label: 'English (US)' },
] as const;
export const DENSITIES = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
] as const;
export const PREVIEW_THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'light-hc', label: 'Light, high contrast' },
  { value: 'dark-hc', label: 'Dark, high contrast' },
] as const;

export type PreviewLocale = (typeof LOCALES)[number]['value'];
export type PreviewDensity = (typeof DENSITIES)[number]['value'];
export type PreviewTheme = (typeof PREVIEW_THEMES)[number]['value'];

/** theme null follows the site theme. */
export interface PreviewPrefs {
  locale: PreviewLocale;
  density: PreviewDensity;
  theme: PreviewTheme | null;
}

export const DEFAULT_PREFS: PreviewPrefs = { locale: 'en-NP', density: 'comfortable', theme: null };
const KEY = 'punji-docs-preview';

const has = (list: readonly { value: string }[], v: unknown): boolean => typeof v === 'string' && list.some((o) => o.value === v);

/** Only known values get through, from a URL or storage alike. */
export function sanitise(raw: Record<string, unknown>): PreviewPrefs {
  return {
    locale: has(LOCALES, raw.locale) ? (raw.locale as PreviewLocale) : DEFAULT_PREFS.locale,
    density: has(DENSITIES, raw.density) ? (raw.density as PreviewDensity) : DEFAULT_PREFS.density,
    theme: has(PREVIEW_THEMES, raw.theme) ? (raw.theme as PreviewTheme) : null,
  };
}

function read(): PreviewPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  let stored: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
    if (parsed && typeof parsed === 'object') stored = parsed as Record<string, unknown>;
  } catch {
    // private mode or a tampered value: the defaults
  }
  const query = new URLSearchParams(window.location.search);
  for (const key of ['locale', 'density', 'theme']) {
    const value = query.get(key);
    if (value !== null) stored[key] = value;
  }
  return sanitise(stored);
}

let state: PreviewPrefs | undefined;
const listeners = new Set<() => void>();
const current = (): PreviewPrefs => (state ??= read());

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** Keep the address bar reproducing the view: non-default values only, other parameters and the hash untouched. */
export function syncUrl(prefs: PreviewPrefs = current()): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const key of ['locale', 'density', 'theme'] as const) {
    const value = prefs[key];
    if (value && value !== DEFAULT_PREFS[key]) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
}

export function setPreviewPrefs(patch: Partial<PreviewPrefs>): void {
  state = { ...current(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage is unavailable: the choice lasts for this visit
  }
  syncUrl(state);
  for (const notify of listeners) notify();
}

/** The preview preferences. Defaults on the server and during hydration; the stored or linked values after. */
export function usePreviewPrefs(): PreviewPrefs {
  return useSyncExternalStore(subscribe, current, () => DEFAULT_PREFS);
}

/** The same preferences as query parameters, for the phone frame's URL. */
export function prefsQuery(prefs: PreviewPrefs): Record<string, string> {
  return { locale: prefs.locale, density: prefs.density, ...(prefs.theme ? { theme: prefs.theme } : {}) };
}
