import { useEffect } from 'react';
import { useLocalStorage, useMediaQuery } from '@punji/ui/hooks';

export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'punji-docs-theme';
const isTheme = (value: unknown): value is ThemeChoice => value === 'system' || value === 'light' || value === 'dark';
const options = { defaultValue: 'system' as ThemeChoice, validate: isTheme };

/** The theme choice, persisted with the library's own useLocalStorage (validated, so a tampered value falls back). */
export function useTheme(): [ThemeChoice, (next: ThemeChoice) => void] {
  const { value, set } = useLocalStorage<ThemeChoice>(KEY, options);
  useEffect(() => {
    const root = document.documentElement;
    // The library's mechanism: data-theme forces a theme; no attribute follows prefers-color-scheme.
    if (value === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', value);
  }, [value]);
  return [value, set];
}

/** The theme actually showing: the choice, or the system setting when the choice is 'system'. Light during the server render. */
export function useResolvedTheme(): 'light' | 'dark' {
  const { value } = useLocalStorage<ThemeChoice>(KEY, options);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)', false);
  return value === 'system' ? (systemDark ? 'dark' : 'light') : value;
}
