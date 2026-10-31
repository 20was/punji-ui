import { useEffect } from 'react';
import { useLocalStorage } from '@punji/ui/hooks';

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
