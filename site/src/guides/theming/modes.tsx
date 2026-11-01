import { useEffect } from 'react';
import { useLocalStorage } from '@punji/ui/hooks';
import { themeAttributes, type Density } from '@punji/ui/theme';

interface Modes {
  theme: 'system' | 'light' | 'dark';
  contrast: 'normal' | 'more';
  density: Density;
}

const isModes = (v: unknown): v is Modes => typeof v === 'object' && v !== null && 'theme' in v && 'contrast' in v && 'density' in v;
const options = { defaultValue: { theme: 'system', contrast: 'normal', density: 'comfortable' } as Modes, validate: isModes };

/** Applies the saved theme, contrast and density to <html>. "system" and "comfortable" remove their attribute. */
export function useModes() {
  const { value, set } = useLocalStorage<Modes>('app-modes', options);
  useEffect(() => {
    const root = document.documentElement;
    const attrs = themeAttributes(value);
    for (const name of ['data-theme', 'data-pu-density'] as const) {
      const next = attrs[name];
      if (next) root.setAttribute(name, next);
      else root.removeAttribute(name);
    }
  }, [value]);
  return [value, set] as const;
}
