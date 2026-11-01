'use client';

/**
 * A number that moves to its new value instead of jumping (LiveFigure).
 * Ease-out over TWEEN_MS on requestAnimationFrame, one shared frame loop for
 * every moving figure on the page (one React render per frame, not one per
 * figure); the gain or loss tint fades over TINT_MS. Under reduced motion
 * neither runs: the new value simply replaces the old.
 *
 * The tween is pure (tweenAt) so the maths is tested without a browser; the
 * last frame is the target itself, never a float that rounds differently.
 */
import { useEffect, useState } from 'react';

import { isNum } from '../format/format.ts';

export const TWEEN_MS = 450;
export const TINT_MS = 900;

/** Cubic ease-out: fast start, gentle landing. */
export const easeOut = (p: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);

/** The value shown at progress p (0 to 1) of a move from `from` to `to`; exactly `to` at the end. */
export function tweenAt(from: number, to: number, p: number): number {
  // Never -0: a figure would print it as "-0.00".
  const v = p >= 1 ? to : from + (to - from) * easeOut(p);
  return v === 0 ? 0 : v;
}

/** Two values that print the same at dp decimals are no move (no tween, no tint). */
export function samePrinted(a: number, b: number, dp: number): boolean {
  return a.toFixed(dp) === b.toFixed(dp);
}

/* One media query list for the page: a feed of 1,000 ticks a second asks on every tick, and matches is live. */
let reduced: { from: unknown; list: MediaQueryList } | null = null;
export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== 'function') return false;
  // Asked again only if matchMedia itself was replaced (tests, polyfills).
  if (reduced?.from !== matchMedia) reduced = { from: matchMedia, list: matchMedia('(prefers-reduced-motion: reduce)') };
  return reduced.list.matches;
}

/* One frame loop for the page: each subscriber says whether it wants the next frame. */
const frames = new Set<(t: number) => boolean>();
let raf = 0;
function loop(t: number) {
  raf = 0;
  // Deleting the current entry while iterating a Set is safe; no copy per frame.
  for (const f of frames) if (!f(t)) frames.delete(f);
  if (frames.size) raf = requestAnimationFrame(loop);
}
function onFrame(f: (t: number) => boolean): () => void {
  frames.add(f);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => {
    frames.delete(f);
  };
}

export type LiveTint = 'up' | 'down' | null;

interface TweenState {
  value: number | null | undefined;
  id: unknown;
  from: number;
  p: number;
  tint: LiveTint;
  run: number;
}

export interface TweenOptions {
  /** What the figure stands for (a symbol, "hover"). A new id is a different figure: it snaps, no tween. */
  id?: unknown;
  /** Decimals the figure prints: a change below them is no move. */
  dp?: number;
  duration?: number;
}

/**
 * The value to print this frame. A change of the same figure (same id, a
 * number before and after, a different printed value) tweens from what is
 * on screen now, so a second change mid-move continues smoothly.
 */
export function useTweenedNumber(value: number | null | undefined, { id, dp = 2, duration = TWEEN_MS }: TweenOptions = {}): { shown: number | null | undefined; tint: LiveTint; moving: boolean } {
  const [s, setS] = useState<TweenState>(() => ({ value, id, from: 0, p: 1, tint: null, run: 0 }));
  let cur = s;
  if (!Object.is(s.value, value) || s.id !== id) {
    const moved = s.id === id && isNum(s.value) && isNum(value) && !samePrinted(s.value, value, dp) && !prefersReducedMotion();
    if (moved) {
      const prev = s.value as number;
      const onScreen = s.p < 1 ? tweenAt(s.from, prev, s.p) : prev;
      cur = { value, id, from: onScreen, p: 0, tint: (value as number) > prev ? 'up' : 'down', run: s.run + 1 };
    } else {
      cur = { value, id, from: 0, p: 1, tint: null, run: s.run };
    }
    setS(cur);
  }

  const { run } = cur;
  const animating = cur.p < 1;
  useEffect(() => {
    if (!animating) return;
    let t0 = -1;
    const stop = onFrame((t) => {
      if (t0 < 0) t0 = t;
      const p = Math.min(1, (t - t0) / duration);
      setS((x) => (x.run === run ? { ...x, p } : x));
      return p < 1;
    });
    const fade = window.setTimeout(() => setS((x) => (x.run === run ? { ...x, tint: null } : x)), TINT_MS);
    return () => {
      stop();
      window.clearTimeout(fade);
    };
    // oxlint-disable-next-line react/exhaustive-deps
  }, [run, duration]);

  return { shown: animating && isNum(cur.value) ? tweenAt(cur.from, cur.value, cur.p) : cur.value, tint: cur.tint, moving: animating };
}
