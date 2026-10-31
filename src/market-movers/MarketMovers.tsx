'use client';

/**
 * MarketMovers: gainers, losers and most active as three tabs over one
 * compact StockTable. The caller passes every quote; ranking is `rankMovers`
 * (pure, exported). Tabs are the package's ARIA tabs (arrows, Home, End).
 */
import { useId, type ReactNode } from 'react';

import type { Option } from '../controls/Controls.tsx';
import { StockTable, type StockColumn, type StockTableProps } from '../stock-table/StockTable.tsx';
import type { Quote } from '../stock-table/quotes.ts';
import { Tabs } from '../tabs/Tabs.tsx';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';
import { rankMovers, type MoverKind } from './movers.ts';

export { rankMovers } from './movers.ts';
export type { MoverKind } from './movers.ts';

export type MoverLabels = Record<MoverKind, string>;
const EN_TABS: MoverLabels = { gainers: 'Gainers', losers: 'Losers', active: 'Most active' };
const EN_EMPTY: MoverLabels = { gainers: 'No stocks are up.', losers: 'No stocks are down.', active: 'No trades yet.' };
const COLUMNS: Record<MoverKind, readonly StockColumn[]> = {
  gainers: ['symbol', 'ltp', 'change'],
  losers: ['symbol', 'ltp', 'change'],
  active: ['symbol', 'ltp', 'turnover'],
};

export interface MarketMoversProps<T extends Quote = Quote>
  extends Pick<StockTableProps<T>, 'money' | 'convention' | 'changeLabels' | 'renderSymbol' | 'live' | 'state' | 'onRetry' | 'retryLabel' | 'errorLabel' | 'loadingLabel' | 'density'> {
  /** Every quote to rank, not a pre-ranked list: `rankMovers` picks each tab's rows from it. */
  quotes: readonly T[];
  /** Names the tab list and the table ("Market movers"). */
  label: string;
  /** Selected tab (controlled). */
  tab?: MoverKind;
  /** The tab shown first when `tab` is not controlled. Default gainers. */
  defaultTab?: MoverKind;
  /** Called with the tab the reader chose. */
  onTabChange?: (tab: MoverKind) => void;
  /** How many rows per tab. Default 5. */
  limit?: number;
  /** What "most active" ranks by. Default turnover. */
  activeBy?: 'turnover' | 'volume';
  /** Tab names and empty messages in the reader's language. */
  tabLabels?: Partial<MoverLabels>;
  /** The message each tab shows when it has no rows, keyed by tab. Overrides the English defaults. */
  emptyLabels?: Partial<MoverLabels>;
  /** Shown under the table, for example the as-of time. */
  footer?: ReactNode;
  /** Sets `data-testid` on the section; the table gets `<id>-table`. */
  testId?: string;
}

export function MarketMovers<T extends Quote = Quote>({
  quotes, label, tab, defaultTab = 'gainers', onTabChange, limit = 5, activeBy = 'turnover', tabLabels, emptyLabels, footer, density = 'compact', testId, ...table
}: MarketMoversProps<T>) {
  const id = useId();
  const [current, setCurrent] = useControllableState<MoverKind>({ value: tab, defaultValue: defaultTab, onChange: onTabChange, name: 'MarketMovers tab' });
  const names = { ...EN_TABS, ...tabLabels };
  const empty = { ...EN_EMPTY, ...emptyLabels };
  const options: Option<MoverKind>[] = (['gainers', 'losers', 'active'] as const).map((value) => ({ value, label: names[value] }));
  const rows = rankMovers(quotes, current, { limit, activeBy });
  const panelId = `${id}-panel`;
  return (
    <section className="pu-movers" aria-label={label} data-testid={testId}>
      <Tabs options={options} value={current} onChange={setCurrent} prefix={`${id}-tab`} label={label} panelId={panelId} />
      <div id={panelId} role="tabpanel" aria-labelledby={`${id}-tab-${current}`}>
        <StockTable<T>
          caption={`${label}: ${names[current]}`}
          quotes={rows}
          columns={COLUMNS[current].map((c) => (c === 'turnover' && activeBy === 'volume' ? 'volume' : c))}
          bare
          density={density}
          emptyLabel={empty[current]}
          testId={testId ? `${testId}-table` : undefined}
          {...table}
        />
      </div>
      {footer && <div className="pu-movers-foot">{footer}</div>}
    </section>
  );
}
