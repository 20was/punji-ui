import type { ReactNode } from 'react';

/** Printed length of a label node: text counts its characters, an element its children (8 when it has none). */
export function textLen(n: ReactNode): number {
  if (typeof n === 'string' || typeof n === 'number') return `${n}`.length;
  if (Array.isArray(n)) return n.reduce((a: number, c) => a + textLen(c as ReactNode), 0);
  const k = (n as { props?: { children?: ReactNode } } | null)?.props;
  return k ? (k.children === undefined ? 8 : textLen(k.children)) : 0;
}

/**
 * The row of each label (in the order given): the first row where it clears
 * every label already placed (a label's width is its text at about 6.6px
 * against a 280px track), so labels that fall near each other, at an end or at
 * one value, stack instead of printing over one another.
 */
export function rangeLabelRows(items: readonly { x: number; len: number }[]): number[] {
  const out: number[] = items.map(() => 0);
  const put: { r: number; a: number; b: number }[] = [];
  const order = items.map((item, i) => ({ item, i })).toSorted((p, q) => p.item.x - q.item.x);
  for (const { item, i } of order) {
    const w = Math.min(100, ((item.len || 1) * 6.6 * 100) / 280);
    const a = item.x - (w * item.x) / 100 - 1.5;
    const b = a + w + 3;
    let r = 0;
    while (put.some((p) => p.r === r && a < p.b && p.a < b)) r++;
    put.push({ r, a, b });
    out[i] = r;
  }
  return out;
}
