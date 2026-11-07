'use client';

/**
 * ThemeProvider and useTheme (design.punji.app/components/theme-provider): the reader's colour theme, chosen with
 * `setTheme` or `toggle`, remembered in this browser (localStorage, kept in step across tabs) and written to the
 * page as `data-theme` on `<html>`, together with `color-scheme` and `<meta name="theme-color">`.
 *
 * `system` leaves `data-theme` off so `prefers-color-scheme` and `prefers-contrast` decide, and follows the system
 * live. `themeInitScript` is the same logic as a string for the document head, so the right theme is on the page
 * before React loads (no flash). It builds on `themeAttributes` from `@punji/ui/theme`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';

import { THEMES, themeAttributes, type ThemeName } from '../theme/theme.ts';

/** What the reader can choose: one of the four themes, or `system`. */
export type ThemeChoice = 'system' | ThemeName;

const CHOICES: readonly ThemeChoice[] = ['system', ...THEMES];
const isChoice = (v: unknown): v is ThemeChoice => typeof v === 'string' && (CHOICES as readonly string[]).includes(v);

/** The `<meta name="theme-color">` values, by colour scheme, as `#rgb` or `#rrggbb`. */
export interface ThemeColors {
  /** The colour for the light themes (`light`, `light-hc`). */
  light?: string;
  /** The colour for the dark themes (`dark`, `dark-hc`). */
  dark?: string;
}

export interface ThemeContextValue {
  /** The reader's choice: `system` until they pick one (or `defaultTheme`). */
  theme: ThemeChoice;
  /** What is on screen now: `system` resolved against the device, or the chosen theme (including a high-contrast name). */
  resolvedTheme: ThemeName;
  /** Choose a theme and remember it. */
  setTheme: (theme: ThemeChoice) => void;
  /** Flip between light and dark, keeping a high-contrast variant. From `system` it flips away from what is showing. */
  toggle: () => void;
}

export interface ThemeProviderProps {
  /** The part of your app that reads the theme with `useTheme`. */
  children: ReactNode;
  /** The theme before the reader has chosen. Default `system`; a dark-first product passes `dark`. */
  defaultTheme?: ThemeChoice;
  /** The localStorage key. Default `punji-theme`; `themeInitScript` must be given the same one. */
  storageKey?: string;
  /** `<meta name="theme-color">` per scheme. Default: the page background token, read after the theme is applied. */
  themeColors?: ThemeColors;
  /** The element that gets `data-theme` and `color-scheme`, read after mount. Default `<html>`. Give a region to theme only that region (an embedded widget, a preview); the theme-color meta is then left alone. */
  target?: () => HTMLElement | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';
const CHANGE_EVENT = 'punji-theme-change';
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function readStored(key: string): ThemeChoice | null {
  try {
    const v = window.localStorage.getItem(key);
    return isChoice(v) ? v : null;
  } catch {
    return null;
  }
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

function applyTheme(choice: ThemeChoice, resolved: ThemeName, colors: ThemeColors, target: HTMLElement | null): void {
  const root = target ?? document.documentElement;
  const attr = themeAttributes({ theme: choice })['data-theme'];
  if (attr) root.setAttribute('data-theme', attr);
  else root.removeAttribute('data-theme');
  const scheme = resolved.startsWith('dark') ? 'dark' : 'light';
  root.style.colorScheme = scheme;
  const meta = target ? null : document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const given = colors[scheme];
  const fromToken = getComputedStyle(root).getPropertyValue('--pu-color-bg').trim();
  const color = given && HEX.test(given) ? given : HEX.test(fromToken) ? fromToken : null;
  if (color) meta.setAttribute('content', color);
}

/**
 * Provides the theme to `useTheme` and applies it to `<html>`. Renders no element of its own.
 * @stability beta
 */
export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'punji-theme', themeColors, target }: ThemeProviderProps) {
  // The choice for this page's life, for when storage is blocked and cannot hold it.
  const memory = useRef<ThemeChoice | null>(null);
  const subscribe = useCallback(
    (notify: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === storageKey || e.key === null) notify();
      };
      window.addEventListener('storage', onStorage);
      window.addEventListener(CHANGE_EVENT, notify);
      return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener(CHANGE_EVENT, notify);
      };
    },
    [storageKey],
  );
  // The server and the first client render both say `defaultTheme`; the stored choice lands right after hydration.
  const theme = useSyncExternalStore(
    subscribe,
    () => readStored(storageKey) ?? memory.current ?? defaultTheme,
    () => defaultTheme,
  );

  // `system` follows the device live.
  const dark = useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const mq = window.matchMedia(DARK_QUERY);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    systemDark,
    () => false,
  );

  const resolvedTheme: ThemeName = theme === 'system' ? (dark ? 'dark' : 'light') : theme;
  const lightColor = themeColors?.light;
  const darkColor = themeColors?.dark;
  useEffect(() => {
    applyTheme(theme, resolvedTheme, { light: lightColor, dark: darkColor }, target?.() ?? null);
  }, [theme, resolvedTheme, lightColor, darkColor, target]);

  const setTheme = useCallback(
    (next: ThemeChoice) => {
      if (!isChoice(next)) return;
      memory.current = next;
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        /* Storage blocked: the theme applies to this page, it is just not remembered. */
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [storageKey],
  );
  const toggle = useCallback(() => {
    const hc = resolvedTheme.endsWith('-hc') ? '-hc' : '';
    setTheme(`${resolvedTheme.startsWith('dark') ? 'light' : 'dark'}${hc}` as ThemeName);
  }, [resolvedTheme, setTheme]);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme, toggle }), [theme, resolvedTheme, setTheme, toggle]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

/**
 * The theme and its setters. Throws outside a `ThemeProvider`.
 * @stability beta
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export interface ThemeInitScriptOptions {
  /** The same as `ThemeProvider`'s `storageKey`. Default `punji-theme`. */
  storageKey?: string;
  /** The same as `ThemeProvider`'s `defaultTheme`. Default `system`. */
  defaultTheme?: ThemeChoice;
  /** `<meta name="theme-color">` per scheme (hex), set before first paint. Omit and the provider sets it after load. */
  themeColors?: ThemeColors;
}

/**
 * JavaScript (as a string) that puts the stored theme on `<html>` before the page paints. Put it inline in the head,
 * before your stylesheets, in a script element whose text is `themeInitScript({ defaultTheme: 'dark' })`.
 * It never throws (blocked storage falls back to `defaultTheme`) and every value is validated and JSON-encoded, so it
 * is safe to inline.
 * @stability beta
 */
export function themeInitScript({ storageKey = 'punji-theme', defaultTheme = 'system', themeColors }: ThemeInitScriptOptions = {}): string {
  if (!isChoice(defaultTheme)) throw new TypeError(`themeInitScript: unknown theme ${String(defaultTheme)}`);
  const colors: ThemeColors = {};
  for (const scheme of ['light', 'dark'] as const) {
    const c = themeColors?.[scheme];
    if (c !== undefined) {
      if (!HEX.test(c)) throw new TypeError(`themeInitScript: the ${scheme} theme colour must be a hex colour`);
      colors[scheme] = c;
    }
  }
  // JSON, with `<` escaped so a storage key can never close the script element.
  const data = JSON.stringify({ k: storageKey, d: defaultTheme, c: colors, t: CHOICES }).replace(/</g, '\\u003c');
  return `(function(){try{var o=${data},v=null;try{v=localStorage.getItem(o.k)}catch(e){}if(o.t.indexOf(v)<0)v=o.d;var r=document.documentElement,s=v;if(v==='system'){s=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';r.removeAttribute('data-theme')}else r.setAttribute('data-theme',v);var k=s.indexOf('dark')===0?'dark':'light';r.style.colorScheme=k;var m=document.querySelector('meta[name="theme-color"]');if(m&&o.c[k])m.setAttribute('content',o.c[k])}catch(e){}})();`;
}
