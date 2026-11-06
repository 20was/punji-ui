import { useEffect, type RefObject } from 'react';

/** Body-level elements made inert, how many open overlays want each so, and whether it was inert already. */
const held = new Map<Element, { count: number; was: boolean }>();

/**
 * While `active`, makes every other child of <body> inert, so the page behind a modal can be neither
 * focused nor clicked nor read by a screen reader. `ref` is anything inside the overlay (its portal root
 * is found from it). Ref-counted: with a modal over a modal the first stays inert for the second, and when
 * the second closes only what it changed is undone. An element that was inert before is left inert.
 */
export function useInertOthers(ref: RefObject<Element | null>, active: boolean): void {
  useEffect(() => {
    const node = ref.current;
    if (!active || !node || typeof document === 'undefined') return;
    let root: Element | null = node;
    while (root && root.parentElement !== document.body) root = root.parentElement;
    if (!root) return;
    const mine: Element[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el === root || /^(SCRIPT|STYLE|LINK)$/.test(el.tagName)) continue;
      const h = held.get(el);
      if (h) h.count++;
      else {
        held.set(el, { count: 1, was: el.hasAttribute('inert') });
        el.setAttribute('inert', '');
      }
      mine.push(el);
    }
    return () => {
      for (const el of mine) {
        const h = held.get(el);
        if (h && --h.count === 0) {
          held.delete(el);
          if (!h.was) el.removeAttribute('inert');
        }
      }
    };
  }, [ref, active]);
}
