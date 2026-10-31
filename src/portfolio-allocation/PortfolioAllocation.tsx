/**
 * PortfolioAllocation: where the money sits, by holding or by sector, as a
 * donut or one stacked bar with a legend. A composition of ShareDonut,
 * ShareBar and ShareLegend over `allocateHoldings`: the smallest slices past
 * `maxSlices` gather into one "Other", and the shares are rounded by largest
 * remainder so they always add up to exactly 100.
 *
 * Colour never carries a share alone: every slice has a legend row with its
 * name and percent, and an exact-values table (name, share, value) follows
 * the chart, visually hidden by default (`tableView="visible"` shows it).
 * Holdings without a price are left out of the chart, not drawn as zero, and
 * the note under it names them.
 */
import type { ReactNode } from 'react';

import { allocateHoldings, type AllocationOptions, type Holding } from '../portfolio/portfolio.ts';
import { percentText } from '../portfolio/shared.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { SHARE_TONES, ShareBar, ShareDonut, ShareLegend, type ShareItem } from '../meter/Meter.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';
import { Skeleton } from '../states/States.tsx';
import { nepalQuoteMoney } from '../stock-table/format.ts';

export interface PortfolioAllocationLabels {
  /** The table's name column head. Default 'Name'. */
  name?: string;
  /** The table's share column head. Default 'Share'. */
  share?: string;
  /** The table's value column head. Default 'Value'. */
  value?: string;
  /** The line under a slice that gathers several holdings. Gets the count. Default '3 holdings'. */
  holdingCount?: (count: number) => string;
  /** The note naming holdings left out for want of a price. */
  unpriced?: (symbols: readonly string[]) => ReactNode;
}

export interface PortfolioAllocationProps extends AllocationOptions {
  /** Holdings from `holdingsSummary(...).holdings`. Only the symbol, name, sector, quantity and market value are read. */
  holdings: readonly Pick<Holding, 'symbol' | 'name' | 'sector' | 'marketValue' | 'quantity'>[];
  /** Names the chart and its table, for example 'Allocation by sector'. */
  label: string;
  /** `donut` (default) or one stacked `bar`. */
  view?: 'donut' | 'bar';
  /** Where the exact-values table goes: `hidden` (default, for screen readers), `visible` or `none` (the legend is then the only text). */
  tableView?: 'hidden' | 'visible' | 'none';
  /** The small word under the count in the donut's middle. Default 'holdings'. */
  unit?: string;
  /** Currency and locale of the table's values. Default NPR, en-IN, no currency mark. */
  money?: MoneyFormatConfig;
  /** Overrides for the printed words. */
  labels?: PortfolioAllocationLabels;
  /** ready (default) or loading (a placeholder in the chart's place). */
  state?: 'ready' | 'loading';
  /** Shown when there is nothing to draw (no priced holdings). Default 'No holdings to chart.' */
  emptyLabel?: ReactNode;
  /** The loading status line. Default 'Loading allocation…'. */
  loadingLabel?: string;
  /** Sets `data-testid` on the root. */
  testId?: string;
}

export function PortfolioAllocation({
  holdings, label, view = 'donut', tableView = 'hidden', unit = 'holdings', money = nepalQuoteMoney, labels, state = 'ready',
  emptyLabel = 'No holdings to chart.', loadingLabel = 'Loading allocation…', testId, by = 'holding', maxSlices = 6, decimals = 1, otherLabel = 'Other', unclassifiedLabel = 'Unclassified',
}: PortfolioAllocationProps) {
  if (state === 'loading') {
    return (
      <div className="pu-alloc loading" data-testid={testId}>
        <Skeleton width={view === 'donut' ? 180 : '100%'} height={view === 'donut' ? 180 : 12} circle={view === 'donut'} label={loadingLabel} />
      </div>
    );
  }
  const { slices, unpriced } = allocateHoldings(holdings, { by, maxSlices, decimals, otherLabel, unclassifiedLabel });
  const names = new Map(holdings.map((h) => [h.symbol, h.name]));
  const count = labels?.holdingCount ?? ((n: number) => `${n} ${n === 1 ? 'holding' : 'holdings'}`);
  const pct = (n: number) => percentText(n, money, decimals) ?? '';
  const items: ShareItem[] = slices.map((slice, index) => ({
    key: slice.key,
    label: slice.label,
    sub: by === 'holding' && !slice.other ? names.get(slice.key.slice('holding:'.length)) : count(slice.count),
    pct: slice.displayPercent,
    tone: slice.other ? 'rest' : (SHARE_TONES[index] ?? 'rest'),
    value: pct(slice.displayPercent),
  }));
  const spoken = `${label}: ${slices.map((s) => `${s.label} ${pct(s.displayPercent)}`).join(', ')}`;
  const holdingsCount = slices.reduce((n, s) => n + s.count, 0);
  const note = unpriced.length > 0 ? (labels?.unpriced ?? ((symbols: readonly string[]) => `Left out, no price: ${symbols.join(', ')}.`))(unpriced) : null;
  const hiddenTable = tableView === 'hidden';

  const table = tableView === 'none' || slices.length === 0 ? null : (
    <div className={tableView === 'visible' ? 'kit-tablebox bare dense pu-alloc-table' : 'kit-sr'}>
      <table className="kit-table">
        <caption className={tableView === 'visible' ? 'kit-sr' : undefined}>{label}</caption>
        <thead><tr><th scope="col">{labels?.name ?? 'Name'}</th><th scope="col" className="num">{labels?.share ?? 'Share'}</th><th scope="col" className="num">{labels?.value ?? 'Value'}</th></tr></thead>
        <tbody>
          {slices.map((slice) => (
            <tr key={slice.key}>
              <th scope="row">{slice.label}</th>
              <td className="num">{pct(slice.displayPercent)}</td>
              <td className="num"><MoneyDisplay value={slice.value} preset={money} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (slices.length === 0) {
    return (
      <div className="pu-alloc" data-testid={testId}>
        <p className="pu-alloc-empty" role="status">{emptyLabel}</p>
        {note && <p className="pu-holdings-note">{note}</p>}
      </div>
    );
  }
  return (
    <div className="pu-alloc" data-view={view} data-testid={testId}>
      {view === 'donut' ? (
        <div className="pu-alloc-donut">
          <ShareDonut items={items} count={holdingsCount} unit={unit} label={spoken} testId={testId ? `${testId}-chart` : undefined} />
          <div aria-hidden={hiddenTable ? true : undefined}><ShareLegend items={items} layout="rows" /></div>
        </div>
      ) : (
        <div aria-hidden={hiddenTable ? true : undefined}><ShareBar items={items} label={spoken} legend="grid" testId={testId ? `${testId}-chart` : undefined} /></div>
      )}
      {table}
      {note && <p className="pu-holdings-note" data-testid={testId ? `${testId}-note` : undefined}>{note}</p>}
    </div>
  );
}
