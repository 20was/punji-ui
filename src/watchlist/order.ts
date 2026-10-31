/** List reordering for a watchlist. Pure: no React, no browser globals. */

/**
 * A copy of `list` with `item` moved `delta` places (negative is up). The move is clamped to the
 * ends, so moving the first item up returns an equal copy. An item that is not in the list
 * returns an equal copy too.
 */
export function moveItem<T>(list: readonly T[], item: T, delta: number): T[] {
  const from = list.indexOf(item);
  if (from < 0 || !Number.isFinite(delta)) return [...list];
  const to = Math.min(list.length - 1, Math.max(0, from + Math.trunc(delta)));
  const next = [...list];
  next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
