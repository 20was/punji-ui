/**
 * DividendHistory: what a portfolio received per Nepal fiscal year (Bikram
 * Sambat labels such as 2081/82), as a stacked ColumnChart of cash, bonus
 * shares and rights and an exact table under it, with a totals row. Give a
 * market value and/or a cost and the table adds the cash yield on each.
 *
 * It is a composition over `dividendsByFiscalYear` (the grouping, the BS
 * conversion and the yield) and the existing ColumnChart and DataTable. The
 * chart is a picture of rounded numbers and is hidden from screen readers;
 * the table carries every exact figure. The amounts are the values you give:
 * the cash received, and your valuation of bonus shares and rights.
 */
import type { ReactNode } from 'react';

import { ColumnChart, type ColumnDatum, type ColumnSeries } from '../column-chart/ColumnChart.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { getMoneyFormatter, type MoneyFormatConfig } from '../money/money.ts';
import { dividendsByFiscalYear, type DividendEntry, type DividendYear, type DividendYearOptions } from '../portfolio/portfolio.ts';
import { Missing, percentText } from '../portfolio/shared.tsx';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { nepalQuoteMoney } from '../stock-table/format.ts';
import { Cell, DataListRow, DataTable, type Column } from '../table/Table.tsx';

export interface DividendHistoryLabels {
  year?: string;
  total?: string;
  cash?: string;
  bonus?: string;
  rights?: string;
  /** Head of the cash yield on the market value. Default 'Yield on value'. */
  yieldOnValue?: string;
  /** Head of the cash yield on cost. Default 'Yield on cost'. */
  yieldOnCost?: string;
  /** The totals row's head. Default 'All years'. */
  allYears?: string;
}

export interface DividendHistoryProps extends DividendYearOptions {
  /** Dividends, bonus issues and rights, valued by you (see `dividendEntriesFromTransactions`). */
  entries: readonly DividendEntry[];
  /** Names the chart and the table. */
  caption: string;
  /** Currency and locale of the figures. Default NPR, en-IN, no currency mark. */
  money?: MoneyFormatConfig;
  /** Overrides for the printed words. */
  labels?: DividendHistoryLabels;
  /** The chart's plot height in CSS px (96 to 480). Default 220. */
  chartHeight?: number;
  /** Draw the chart (default true). Off, only the table shows. */
  chart?: boolean;
  /** ready (default), loading or error. */
  state?: 'ready' | 'loading' | 'error';
  /** Shown when `entries` is empty. Default 'No dividends received yet.' */
  emptyLabel?: ReactNode;
  /** The loading status line. Default 'Loading dividends…'. */
  loadingLabel?: string;
  /** What failed. Default 'Dividends could not be loaded.' */
  errorLabel?: ReactNode;
  /** The retry button's words. Default 'Try again'. */
  retryLabel?: string;
  /** Called when the retry button is pressed. */
  onRetry?: () => void;
  /** Sets `data-testid` on the root. */
  testId?: string;
}

const SERIES = (words: { cash: string; bonus: string; rights: string }): ColumnSeries[] => [
  { key: 'cash', label: words.cash, tone: 'chart' },
  { key: 'bonus', label: words.bonus, tone: 'series2' },
  { key: 'rights', label: words.rights, tone: 'series3' },
];

export function DividendHistory({
  entries, caption, money = nepalQuoteMoney, labels, chartHeight = 220, chart = true, state = 'ready', emptyLabel = 'No dividends received yet.',
  loadingLabel = 'Loading dividends…', errorLabel = 'Dividends could not be loaded.', retryLabel = 'Try again', onRetry, testId, marketValue, costBasis, fiscalLabel,
}: DividendHistoryProps) {
  if (state === 'error') return <RetryNote retryLabel={retryLabel} onRetry={onRetry} testId={testId}>{errorLabel}</RetryNote>;
  const words = {
    year: labels?.year ?? 'Fiscal year', total: labels?.total ?? 'Total', cash: labels?.cash ?? 'Cash dividend', bonus: labels?.bonus ?? 'Bonus shares', rights: labels?.rights ?? 'Rights',
    yieldOnValue: labels?.yieldOnValue ?? 'Yield on value', yieldOnCost: labels?.yieldOnCost ?? 'Yield on cost', allYears: labels?.allYears ?? 'All years',
  };
  const years: DividendYear[] = state === 'loading' ? [] : dividendsByFiscalYear(entries, { marketValue, costBasis, ...(fiscalLabel ? { fiscalLabel } : {}) });
  const showValue = marketValue !== undefined, showCost = costBasis !== undefined;
  type Key = 'total' | 'cash' | 'bonus' | 'rights' | 'yieldOnValue' | 'yieldOnCost';
  const keys: Key[] = ['total', 'cash', 'bonus', 'rights', ...(showValue ? ['yieldOnValue' as const] : []), ...(showCost ? ['yieldOnCost' as const] : [])];
  const head: Record<Key, string> = { total: words.total, cash: words.cash, bonus: words.bonus, rights: words.rights, yieldOnValue: words.yieldOnValue, yieldOnCost: words.yieldOnCost };
  const columns: Column<'year' | Key>[] = [{ key: 'year', label: words.year }, ...keys.map((key) => ({ key, label: head[key], num: true }))];

  const formatter = getMoneyFormatter(money);
  const scale = 10 ** formatter.exponent;
  const toMinor = (v: number) => BigInt(Math.round(v * scale));
  const plot: ColumnDatum[] = years.map((year) => ({
    key: String(year.startYear), label: year.label, short: year.label.slice(2),
    values: [Number(year.cash) / scale, Number(year.bonus) / scale, Number(year.rights) / scale],
  }));

  const sum = (pick: (y: DividendYear) => bigint) => years.reduce((n, y) => n + pick(y), 0n);
  const money$ = (value: bigint) => <MoneyDisplay value={value} preset={money} />;
  const yieldCell = (value: number | null) => { const text = percentText(value, money); return text === null ? <Missing /> : <span className="pu-money">{text}</span>; };
  const figure = (key: Key, year: DividendYear): ReactNode => (key === 'yieldOnValue' ? yieldCell(year.yieldOnValue) : key === 'yieldOnCost' ? yieldCell(year.yieldOnCost) : money$(year[key]));
  const total = (key: Key): ReactNode => (key === 'yieldOnValue' || key === 'yieldOnCost' ? null : money$(sum((y) => y[key])));
  const footer = years.length > 0 ? (
    <DataListRow testId={testId ? `${testId}-total` : undefined}>
      <Cell header sym>{words.allYears}</Cell>
      {keys.map((key) => <Cell key={key} num label={head[key]}>{total(key)}</Cell>)}
    </DataListRow>
  ) : undefined;

  return (
    <div className="pu-dividends" data-testid={testId}>
      {chart && years.length > 0 && (
        <div className="pu-dividends-chart" aria-hidden="true">
          <ColumnChart
            series={SERIES(words)}
            columns={plot}
            label={caption}
            height={chartHeight}
            legend
            minSlots={Math.max(2, plot.length)}
            format={(v) => formatter.format(toMinor(v))}
            formatAxis={(v) => formatter.formatCompact(toMinor(v))}
            testId={testId ? `${testId}-chart` : undefined}
          />
        </div>
      )}
      <DataTable caption={caption} columns={columns} bare stack loading={state === 'loading'} loadingLabel={loadingLabel} empty={emptyLabel} footer={footer}>
        {years.map((year) => (
          <DataListRow key={year.startYear} testId={testId ? `${testId}-row-${year.startYear}` : undefined}>
            <Cell header sym>{year.label}</Cell>
            {keys.map((key) => <Cell key={key} num label={head[key]}>{figure(key, year)}</Cell>)}
          </DataListRow>
        ))}
      </DataTable>
    </div>
  );
}
