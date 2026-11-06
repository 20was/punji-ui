import { useEffect } from 'react';

/** What the page looked like before the first lock; restored when the last lock goes. */
let locks = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

/**
 * Keeps the page from scrolling while `active`. Ref-counted: stacked overlays share one lock,
 * the page's own overflow and padding-right come back exactly when the last one closes (in any
 * order), and the width of the vanished scrollbar is added as padding so nothing shifts sideways.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const html = document.documentElement;
    if (locks++ === 0) {
      saved = { overflow: html.style.overflow, paddingRight: html.style.paddingRight };
      const bar = window.innerWidth - html.clientWidth;
      if (bar > 0) html.style.paddingRight = `calc(${parseFloat(getComputedStyle(html).paddingRight) || 0}px + ${bar}px)`;
      html.style.overflow = 'hidden';
    }
    return () => {
      if (--locks === 0 && saved) {
        html.style.overflow = saved.overflow;
        html.style.paddingRight = saved.paddingRight;
        saved = null;
      }
    };
  }, [active]);
}
