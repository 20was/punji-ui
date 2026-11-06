import { useEffect, useRef, useState, type RefObject } from 'react';

import { isDestructive, tabbables } from './focusable.ts';

export interface FocusScopeOptions {
  /** Keep Tab inside the container (default true). Only the newest open scope traps. */
  trap?: boolean;
  /** Put focus back on what had it before the scope opened (default true). */
  restoreFocus?: boolean;
  /**
   * Where focus lands: 'safe' (default) an element marked [data-autofocus], else the first control that is not destructive;
   * 'first' the first control; 'container' the container itself; 'none' leave focus alone (an autoFocus child already took it).
   */
  initialFocus?: 'safe' | 'first' | 'container' | 'none';
  /** Esc pressed while this is the newest open scope and nothing inside used the key first. Leave it out and Esc does nothing here. */
  onEscape?: () => void;
}

/** Open traps, newest last: with one modal over another only the top one handles Tab. */
const stack: object[] = [];

/** Focus handling for a modal surface, live while the component using it is mounted (mount it when the surface opens): moves focus in, wraps Tab at the ends, puts focus back on close. */
export function useFocusScope(ref: RefObject<HTMLElement | null>, { trap = true, restoreFocus = true, initialFocus = 'safe', onEscape }: FocusScopeOptions = {}): void {
  // Read while rendering, before the content mounts and an autoFocus field takes focus: this is the opener.
  const [prev] = useState(() => (typeof document === 'undefined' ? null : document.activeElement));
  const esc = useRef(onEscape);
  useEffect(() => {
    esc.current = onEscape;
  });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (initialFocus !== 'none' && !root.contains(document.activeElement)) {
      const all = tabbables(root);
      const first = initialFocus === 'container' ? null : initialFocus === 'first' ? all[0] : (all.find((el) => el.hasAttribute('data-autofocus')) ?? all.find((el) => !isDestructive(el)) ?? all[0]);
      (first ?? root).focus({ preventScroll: true });
    }
    const token = {};
    stack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape' && esc.current && !e.defaultPrevented) {
        e.preventDefault();
        esc.current();
        return;
      }
      if (e.key !== 'Tab' || !trap) return;
      const items = tabbables(root);
      const at = document.activeElement;
      if (!items.length) {
        e.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }
      const [a, z] = [items[0]!, items[items.length - 1]!];
      if (!root.contains(at) || (e.shiftKey && (at === a || at === root))) {
        e.preventDefault();
        (e.shiftKey ? z : a).focus();
      } else if (!e.shiftKey && at === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      const back = prev as HTMLElement | null;
      if (restoreFocus && back && document.contains(back)) back.focus?.({ preventScroll: true });
    };
  }, [ref, prev, trap, restoreFocus, initialFocus]);
}
