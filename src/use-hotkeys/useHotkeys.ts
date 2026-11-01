'use client';

import { useEffect, useRef } from 'react';

/**
 * Keyboard shortcuts for an application screen: `mod+k` opens a palette, `b` starts a buy, `?` shows help. One
 * listener on the document, handlers read through a ref (so passing a new array each render costs nothing), and plain
 * keys never fire while the person types in a field, a select or an editable region, or while an IME is composing.
 */

export interface Hotkey {
  /**
   * The combination: modifiers and one key joined by `+`, case-insensitive. Modifiers are `mod` (Command on Apple
   * platforms, Control elsewhere), `ctrl`, `meta`, `alt` and `shift`. The key is a `KeyboardEvent.key` value: a letter,
   * a digit, a symbol (`?`, `/`) or a name (`escape`, `enter`, `arrowup`). Several combinations: `'mod+k, /'`.
   */
  keys: string;
  /** Called with the event. The default action is prevented unless `preventDefault` is false. */
  handler: (event: KeyboardEvent) => void;
  /** Fire while focus is in a text field too. Default: true for a combination with `mod`, `ctrl`, `meta` or `alt`, false otherwise. */
  allowInInputs?: boolean;
  /** Prevent the browser's default for a matched key. Default true. */
  preventDefault?: boolean;
}

export interface HotkeysOptions {
  /** Listen only while true. Default true. Turn it off while a dialog that owns the keyboard is open. */
  enabled?: boolean;
}

interface ParsedCombo {
  key: string;
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

const ALIASES: Readonly<Record<string, string>> = { esc: 'escape', space: ' ', spacebar: ' ', return: 'enter', up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', del: 'delete', plus: '+' };

/** One combination ("mod+shift+k") as its parts. Throws on an empty key or an unknown modifier, so typos fail early. */
export function parseHotkey(combo: string): ParsedCombo {
  const parts = combo.trim().toLowerCase().split('+');
  // "mod++" and "+" name the plus key: an empty last part after a '+' is the key itself.
  let raw = parts.pop() ?? '';
  if (raw === '' && parts.length > 0 && parts.at(-1) === '') {
    parts.pop();
    raw = '+';
  }
  const key = ALIASES[raw] ?? raw;
  if (!key) throw new RangeError(`useHotkeys: "${combo}" has no key`);
  const parsed: ParsedCombo = { key, mod: false, ctrl: false, meta: false, alt: false, shift: false };
  for (const part of parts) {
    if (part === 'mod' || part === 'ctrl' || part === 'meta' || part === 'alt' || part === 'shift') parsed[part] = true;
    else if (part === 'cmd' || part === 'command') parsed.meta = true;
    else if (part === 'control') parsed.ctrl = true;
    else if (part === 'option') parsed.alt = true;
    else throw new RangeError(`useHotkeys: unknown modifier "${part}" in "${combo}"`);
  }
  return parsed;
}

/** Whether the platform's primary modifier is Command (macOS, iOS, iPadOS). False on the server. */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

type KeyEventLike = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>;

/**
 * Whether a key event matches a combination. `mod` is Command when `apple` is true, Control otherwise. Modifiers must
 * match exactly, except Shift on a symbol key: `?` is Shift+/ on most layouts, so `'?'` matches with or without a
 * Shift the combination did not name.
 */
export function matchHotkey(event: KeyEventLike, combo: string, apple: boolean = isApplePlatform()): boolean {
  const want = parseHotkey(combo);
  if (event.key.toLowerCase() !== want.key) return false;
  const ctrl = want.ctrl || (want.mod && !apple);
  const meta = want.meta || (want.mod && apple);
  if (event.ctrlKey !== ctrl || event.metaKey !== meta || event.altKey !== want.alt) return false;
  const symbol = want.key.length === 1 && !/[a-z0-9]/.test(want.key);
  return want.shift ? event.shiftKey : symbol || !event.shiftKey;
}

/** A combination as people read it: "⌘K" on Apple platforms, "Ctrl+K" elsewhere. Several combinations are joined with " or ". */
export function formatHotkey(keys: string, apple: boolean = isApplePlatform()): string {
  return keys
    .split(',')
    .map((combo) => {
      const p = parseHotkey(combo);
      const named: Record<string, string> = { escape: 'Esc', enter: 'Enter', ' ': 'Space', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', delete: 'Delete', backspace: 'Backspace', tab: 'Tab' };
      const key = named[p.key] ?? (p.key.length === 1 ? p.key.toUpperCase() : p.key.charAt(0).toUpperCase() + p.key.slice(1));
      if (apple) return `${p.ctrl ? '⌃' : ''}${p.alt ? '⌥' : ''}${p.shift ? '⇧' : ''}${p.meta || p.mod ? '⌘' : ''}${key}`;
      return [p.ctrl || p.mod ? 'Ctrl' : '', p.meta ? 'Meta' : '', p.alt ? 'Alt' : '', p.shift ? 'Shift' : '', key].filter(Boolean).join('+');
    })
    .join(' or ');
}

/** Whether focus is somewhere typing goes: a text input, a textarea, a select or an editable region. */
function typingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file', 'image'].includes(type);
  }
  return el.closest('[contenteditable=""], [contenteditable="true"]') !== null;
}

/**
 * Bind keyboard shortcuts while the component is mounted. The first matching entry wins. A combination with a
 * modifier fires in text fields (Command-K from the search box); a plain key does not, unless `allowInInputs`.
 */
export function useHotkeys(hotkeys: readonly Hotkey[], { enabled = true }: HotkeysOptions = {}): void {
  const latest = useRef(hotkeys);
  useEffect(() => {
    latest.current = hotkeys;
  });
  useEffect(() => {
    if (!enabled) return;
    const apple = isApplePlatform();
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.key === undefined) return;
      for (const hotkey of latest.current) {
        const combos = hotkey.keys.split(',');
        const hit = combos.find((combo) => matchHotkey(event, combo, apple));
        if (!hit) continue;
        const p = parseHotkey(hit);
        const inInputs = hotkey.allowInInputs ?? (p.mod || p.ctrl || p.meta || p.alt);
        if (!inInputs && typingTarget(event.target)) return;
        if (hotkey.preventDefault !== false) event.preventDefault();
        hotkey.handler(event);
        return;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
}
