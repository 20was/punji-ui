'use client';

import { useMemo, useState } from 'react';
import { keepOrder } from './keepOrder.ts';
export { keepOrder } from './keepOrder.ts';
/** Keep rows still during value updates; re-sort when sortId or membership changes.
 * Input must already be sorted. keyOf returns a unique stable string per row.
 * Output contains the latest row objects and never mutates the input array.
 */
export function useStableOrder<T>(sorted: readonly T[], keyOf: (row: T) => string, sortId: string): T[] {
  const keys = useMemo(() => sorted.map(keyOf), [sorted, keyOf]);
  const [kept, setKept] = useState<{ sortId: string; keys: readonly string[] }>({ sortId, keys });
  const retained = keepOrder(kept.keys, keys);
  const order = kept.sortId === sortId ? retained : keys;
  if (order !== kept.keys || kept.sortId !== sortId) setKept({ sortId, keys: order });
  return useMemo(() => {
    const byKey = new Map(sorted.map(row => [keyOf(row), row]));
    return order.map(key => byKey.get(key)!);
  }, [sorted, keyOf, order]);
}
