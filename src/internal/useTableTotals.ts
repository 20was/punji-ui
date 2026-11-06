import { useEffect, useState } from 'react';
import type { TableTotalsEngine } from './tableTotals.tsx';

let loaded: TableTotalsEngine | null = null;

/**
 * The totals engine for a table that groups or totals. Given one (`totalsEngine`)
 * it is used at once; otherwise it is imported on first need, so a table that
 * never groups or totals never bundles the code. Null until then.
 */
export function useTableTotals(needed: boolean, given: TableTotalsEngine | undefined): TableTotalsEngine | null {
  const [engine, setEngine] = useState<TableTotalsEngine | null>(loaded);
  useEffect(() => {
    if (!needed || given || engine) return;
    let live = true;
    void import('./tableTotals.tsx').then((m) => {
      loaded = m.tableTotals;
      if (live) setEngine(m.tableTotals);
    });
    return () => { live = false; };
  }, [needed, given, engine]);
  return given ?? engine;
}
