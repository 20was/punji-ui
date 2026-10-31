'use client';

import { useEffect, useRef, type RefObject } from 'react';

export interface ClickOutsideOptions {
  /** Listen only while true. Default true. */
  enabled?: boolean;
}

/** Call `handler` when a pointerdown lands outside every given element. Pass one ref per
 * DOM subtree, including portalled content (portals are not DOM descendants). Listens in
 * the capture phase so handlers that stop propagation do not hide the event.
 */
export function useClickOutside(
  refs: RefObject<Element | null> | readonly RefObject<Element | null>[],
  handler: (event: PointerEvent) => void,
  { enabled = true }: ClickOutsideOptions = {},
): void {
  const latest = useRef({ refs, handler });
  useEffect(() => {
    latest.current = { refs, handler };
  });
  useEffect(() => {
    if (!enabled) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const current = latest.current.refs;
      const list: readonly RefObject<Element | null>[] = 'current' in current ? [current] : current;
      if (list.some((ref) => ref.current?.contains(target))) return;
      latest.current.handler(event);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [enabled]);
}
