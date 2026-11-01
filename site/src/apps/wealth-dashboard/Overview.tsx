import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { ShareBar } from '@punji/ui/meter';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PortfolioAllocation } from '@punji/ui/portfolio-allocation';
import { PortfolioOverview } from '@punji/ui/portfolio-overview';
import { PriceChange } from '@punji/ui/price-change';
import { corporateTimeline, issueStatus } from '@punji/ui/share-issues';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE, timeAt } from '../shared/sim.ts';
import { ACTIONS, ISSUES, npr, rs, useWealth } from './store.ts';

/** A share of a whole in percent with two decimals, from exact amounts. */
const pctOf = (part: bigint, whole: bigint) => (whole > 0n ? Number((part * 10_000n) / whole) / 100 : 0);

/** Net worth and where it sits, the equity portfolio's headline, allocation by sector, and what is coming up. */
export function Overview() {
  const { state, derived, go } = useWealth();
  const { summary, netWorth, equities, blocked } = derived;
  const parts = [
    { key: 'equities', label: 'Shares', amount: equities, tone: 'series2' as const },
    { key: 'deposits', label: 'Fixed deposits', amount: state.deposits, tone: 'series3' as const },
    { key: 'bank', label: 'Savings account', amount: state.bank, tone: 'series4' as const },
    { key: 'blocked', label: 'Blocked for applications', amount: blocked, tone: 'series5' as const },
  ].filter((p) => p.amount > 0n);
  const upcoming = Object.entries(ACTIONS)
    .flatMap(([symbol, events]) => corporateTimeline(events, SESSION_DATE).filter((e) => e.phase !== 'past').map((e) => ({ symbol, ...e })))
    .toSorted((a, b) => a.days - b.days)
    .slice(0, 3);
  const openIssues = ISSUES.filter((i) => ['open', 'closing-today'].includes(issueStatus(i, SESSION_DATE)));
  const goalSaved = state.goals.reduce((s, g) => s + g.saved, 0n);
  const goalTarget = state.goals.reduce((s, g) => s + g.target, 0n);

  return (
    <div className="app-stack">
      <ScreenTitle>Overview</ScreenTitle>
      <Card title="Net worth" description={`Shares at live prices, as of ${timeAt(state.market.tick)}`} headingLevel={3} testId="wd-networth">
        <div className="wd-headline">
          <span className="wd-headline-value">
            <MoneyDisplay value={netWorth} preset={npr} testId="wd-networth-value" />
          </span>
          {summary.totals.dayChange !== null && (
            <span className="wd-headline-day">
              Today <PriceChange change={{ absolute: summary.totals.dayChange, percent: summary.totals.dayChangePercent }} preset={npr} />
            </span>
          )}
        </div>
        <ShareBar
          label={`Net worth: ${parts.map((p) => `${p.label} ${pctOf(p.amount, netWorth).toFixed(1)}%`).join(', ')}`}
          items={parts.map((p) => ({ key: p.key, label: p.label, sub: rs(p.amount), pct: pctOf(p.amount, netWorth), tone: p.tone }))}
        />
      </Card>

      <PortfolioOverview totals={summary.totals} label="Share portfolio" asOf="Live" testId="wd-overview" />

      <div className="app-grid is-halves">
        <Card title="Allocation by sector" description="Shares at market value" headingLevel={3}>
          <PortfolioAllocation holdings={summary.holdings} label="Share allocation by sector" by="sector" unit="holdings" />
        </Card>
        <Card title="Coming up" headingLevel={3}>
          <ul className="wd-upcoming">
            {upcoming.map((e) => (
              <li key={`${e.symbol}-${e.id}`}>
                <strong>{e.symbol}</strong> {e.label ?? e.kind.replace('-', ' ')}
                <span className="app-muted app-small"> · {e.days === 0 ? 'today' : `in ${e.days} days`}</span>
              </li>
            ))}
            <li>
              <strong>{openIssues.length} share issues open</strong>
              <span className="app-muted app-small"> · {openIssues.map((i) => i.company).join(', ')}</span>
            </li>
            <li>
              <strong>Goals</strong> {rs(goalSaved)} saved of {rs(goalTarget)}
              <span className="app-muted app-small"> · {pctOf(goalSaved, goalTarget).toFixed(1)}%</span>
            </li>
          </ul>
          <div className="wd-links">
            <Button size="sm" variant="secondary" onClick={() => go('issues')}>
              Open the IPO centre
            </Button>
            <Button size="sm" variant="ghost" onClick={() => go('actions')}>
              All corporate actions
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
