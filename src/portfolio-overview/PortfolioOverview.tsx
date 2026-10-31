/**
 * PortfolioOverview: a portfolio's headline in one composition of
 * SummaryFigure and a MetricRow of MetricTiles. The lead figure is the market
 * value with the day's change beside it; the tiles are what was invested,
 * the unrealised P&L, the realised P&L from sales and the return on cost.
 *
 * It prints `holdingsSummary(...).totals` and does no arithmetic of its own.
 * Those totals cover the holdings that have a price, so a symbol with no
 * quote is named in a note under the figures instead of being counted as
 * zero; with no priced holding at all the value and P&L are dashes.
 */
import type { ReactNode } from 'react';

import { MetricRow, MetricTile } from '../metric-tile/MetricTile.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';
import { PriceChange, type PriceChangeLabels } from '../price-change/PriceChange.tsx';
import type { HoldingsTotals } from '../portfolio/portfolio.ts';
import { ChangeFigure, Missing } from '../portfolio/shared.tsx';
import { RetryNote } from '../retry-note/RetryNote.tsx';
import { Skeleton } from '../states/States.tsx';
import { SummaryFigure } from '../summary-figure/SummaryFigure.tsx';

export interface PortfolioOverviewLabels {
  value?: string;
  today?: string;
  invested?: string;
  unrealised?: string;
  realised?: string;
  /** The return tile's label. Default 'Return on cost'. */
  returnOnCost?: string;
  /** The note under Invested. Gets the number of open holdings. */
  holdings?: (count: number) => string;
  /** The note under the unrealised tile. */
  unrealisedNote?: string;
  /** The note under the realised tile. */
  realisedNote?: string;
  /** The note under the return tile. */
  returnNote?: string;
  /** The note naming symbols the figures leave out. */
  incomplete?: (unpriced: readonly string[], noPreviousClose: readonly string[]) => ReactNode;
}

export interface PortfolioOverviewProps {
  /** From `holdingsSummary(...).totals`. Optional only while `state` is `loading`. */
  totals?: HoldingsTotals;
  /** Names the group of figures for screen readers. Default 'Portfolio summary'. */
  label?: string;
  /** Printed beside the lead figure, for example the as-of time. The day change follows it. */
  asOf?: ReactNode;
  /** Currency and locale. Default NPR with the currency code (en-IN). */
  money?: MoneyFormatConfig;
  /** Which colour means up. Default green-up. */
  convention?: 'green-up' | 'red-up';
  /** Spoken direction words. */
  changeLabels?: PriceChangeLabels;
  /** Overrides for the printed words. */
  labels?: PortfolioOverviewLabels;
  /** ready (default), loading (figures replaced by placeholders, labels stay) or error. */
  state?: 'ready' | 'loading' | 'error';
  /** What failed, with the retry button when `state` is `error`. Default 'The portfolio could not be loaded.' */
  errorLabel?: ReactNode;
  /** The retry button's words. Default 'Try again'. */
  retryLabel?: string;
  /** Called when the retry button is pressed. */
  onRetry?: () => void;
  /** Sets `data-testid` on the root. */
  testId?: string;
}

const defaultMoney: MoneyFormatConfig = { currency: 'NPR', locale: 'en-IN', display: 'code' };

export function PortfolioOverview({
  totals, label = 'Portfolio summary', asOf, money = defaultMoney, convention = 'green-up', changeLabels, labels, state = 'ready',
  errorLabel = 'The portfolio could not be loaded.', retryLabel = 'Try again', onRetry, testId,
}: PortfolioOverviewProps) {
  if (state === 'error') return <RetryNote retryLabel={retryLabel} onRetry={onRetry} testId={testId}>{errorLabel}</RetryNote>;
  const t = state === 'loading' ? undefined : totals;
  const loading = !t;
  const placeholder = <Skeleton width="8em" height={22} />;
  const words = {
    value: labels?.value ?? 'Portfolio value', today: labels?.today ?? 'Today', invested: labels?.invested ?? 'Invested',
    unrealised: labels?.unrealised ?? 'Unrealised P&L', realised: labels?.realised ?? 'Realised P&L', returnOnCost: labels?.returnOnCost ?? 'Return on cost',
  };
  const change = (absolute: bigint | null, percent: number | null, showPercent = true) => (
    <ChangeFigure absolute={absolute} percent={percent} money={money} convention={convention} labels={changeLabels} size="md" showPercent={showPercent} />
  );
  const incomplete = t && !t.complete ? (labels?.incomplete ?? defaultIncomplete)(t.unpriced, t.noPreviousClose) : null;
  const returnValue = !t || t.unrealisedPnL === null || t.unrealisedPercent === null
    ? <Missing />
    : <PriceChange change={{ absolute: t.unrealisedPnL, percent: t.unrealisedPercent }} showAbsolute={false} preset={money} convention={convention} {...(changeLabels ? { labels: changeLabels } : {})} />;

  return (
    <div className="pu-overview" role="group" aria-label={label} aria-busy={loading || undefined} data-testid={testId}>
      {loading && <span className="kit-sr" role="status">Loading portfolio…</span>}
      <SummaryFigure
        tone="tint"
        size="lg"
        label={words.value}
        value={t ? <MoneyDisplay value={t.marketValue} preset={money} /> : placeholder}
        note={t ? (
          <>
            {asOf !== undefined && asOf !== null && <span className="pu-overview-asof">{asOf} </span>}
            {t.dayChange !== null && <span className="pu-overview-day"><span className="pu-overview-today">{words.today}</span> {change(t.dayChange, t.dayChangePercent)}</span>}
          </>
        ) : undefined}
        testId={testId ? `${testId}-value` : undefined}
      />
      <MetricRow label={label} count={4} testId={testId ? `${testId}-tiles` : undefined}>
        <MetricTile
          compact
          label={words.invested}
          value={t ? <MoneyDisplay value={t.costBasis} preset={money} /> : placeholder}
          note={t ? (labels?.holdings ?? ((n: number) => `${n} ${n === 1 ? 'holding' : 'holdings'}`))(t.count) : undefined}
        />
        <MetricTile
          compact
          label={words.unrealised}
          value={t ? change(t.unrealisedPnL, null, false) : placeholder}
          note={t ? labels?.unrealisedNote ?? 'On what you still hold' : undefined}
        />
        <MetricTile
          compact
          label={words.realised}
          value={t ? change(t.realisedPnL, null, false) : placeholder}
          note={t ? labels?.realisedNote ?? 'From sales, after fees' : undefined}
        />
        <MetricTile
          compact
          label={words.returnOnCost}
          value={t ? returnValue : placeholder}
          note={t ? labels?.returnNote ?? 'Unrealised, on cost' : undefined}
        />
      </MetricRow>
      {incomplete && !loading && <p className="pu-holdings-note" data-testid={testId ? `${testId}-incomplete` : undefined}>{incomplete}</p>}
    </div>
  );
}

function defaultIncomplete(unpriced: readonly string[], noPreviousClose: readonly string[]): ReactNode {
  return (
    <>
      {unpriced.length > 0 && <span>Figures leave out {unpriced.join(', ')} (no price). </span>}
      {noPreviousClose.length > 0 && <span>The day change leaves out {noPreviousClose.join(', ')} (no previous close).</span>}
    </>
  );
}
