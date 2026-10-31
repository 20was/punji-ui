import { Card } from '@punji/ui/card';
import { DividendHistory } from '@punji/ui/dividend-history';
import { KeyStats } from '@punji/ui/key-stats';
import { MoneyDisplay } from '@punji/ui/money-display';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { dividendEntriesFromTransactions, dividendsByFiscalYear, holdingsSummary, positionsFromTransactions } from '@punji/ui/portfolio';
import { DataRow, DataRows } from '@punji/ui/rows';
import { StatusPill } from '@punji/ui/status-pill';
import { FigureChip, HeadlineFigure } from '@punji/ui/summary-figure';
import { TransactionHistory } from '@punji/ui/transaction-history';
import { portfolioQuotes, portfolioTransactions } from '../../sample.ts';
import './screen.css';

// Dividend income: cash dividends, bonus shares (units × Rs 100 par) and rights, by Nepal fiscal year. One history
// feeds everything: dividendEntriesFromTransactions, then dividendsByFiscalYear for the totals and the yields;
// DividendHistory draws the chart and the table from the same entries.
const npr = nepalMoneyConfig();
const { totals } = holdingsSummary(positionsFromTransactions(portfolioTransactions), portfolioQuotes);
const entries = dividendEntriesFromTransactions(portfolioTransactions);
const years = dividendsByFiscalYear(entries, { marketValue: totals.marketValue, costBasis: totals.costBasis });
const sum = (pick: (y: (typeof years)[number]) => bigint) => years.reduce((s, y) => s + pick(y), 0n);
const cash = sum((y) => y.cash);
const bonus = sum((y) => y.bonus);
const rights = sum((y) => y.rights);
const latest = years.at(-1);

// Announced but not yet paid: what the next book closures mean for you. Synthetic.
const UPCOMING = [
  { symbol: 'NABIL', what: '12% cash, 5% bonus', bookClose: 'Book close 22 Mangsir 2082', status: 'Announced' },
  { symbol: 'NICA', what: '7.5% cash', bookClose: 'AGM 3 Poush 2082', status: 'Proposed' },
  { symbol: 'UPPER', what: '10% bonus', bookClose: 'Book close 9 Poush 2082', status: 'Announced' },
];

export default function Example() {
  return (
    <div className="sc-div">
      <div className="sc-div-top">
        <div className="sc-div-lead">
          <HeadlineFigure
            label="Dividend income, all years"
            currency="Rs"
            value={formatMoney(cash + bonus + rights, { ...npr, display: 'none' })}
            line={`${entries.length} payouts since 2079/80, cash, bonus and rights together.`}
          >
            {latest?.yieldOnCost != null && (
              <FigureChip tone="up">
                {latest.yieldOnCost.toFixed(2)}% on cost in {latest.label}
              </FigureChip>
            )}
            {latest?.yieldOnValue != null && <FigureChip tone="flat">{latest.yieldOnValue.toFixed(2)}% on today’s value</FigureChip>}
          </HeadlineFigure>
          <KeyStats
            label="Dividend income by kind"
            empty="None"
            items={[
              { label: 'Cash dividends', value: <MoneyDisplay value={cash} preset={npr} /> },
              { label: 'Bonus shares', value: <MoneyDisplay value={bonus} preset={npr} />, sub: 'At Rs 100 par' },
              { label: 'Rights', value: <MoneyDisplay value={rights} preset={npr} />, sub: 'Subscribed at par' },
            ]}
          />
        </div>
        <Card title="Coming up" description="Announced corporate actions on your holdings" headingLevel={3}>
          <DataRows label="Upcoming corporate actions">
            {UPCOMING.map((u) => (
              <DataRow
                key={u.symbol}
                label={
                  <span className="sc-div-action">
                    <b>{u.symbol}</b> {u.what}
                  </span>
                }
                note={u.bookClose}
                value={
                  <StatusPill size="sm" tone={u.status === 'Announced' ? 'gain' : 'warn'}>
                    {u.status}
                  </StatusPill>
                }
              />
            ))}
          </DataRows>
        </Card>
      </div>

      <Card title="Dividends by fiscal year" description="With yield on cost and on today’s value" headingLevel={3}>
        <DividendHistory entries={entries} caption="Dividends by fiscal year" marketValue={totals.marketValue} costBasis={totals.costBasis} />
      </Card>
      <Card title="Payouts" description="Every dividend, bonus and rights entry" headingLevel={3}>
        <TransactionHistory
          transactions={portfolioTransactions}
          caption="Dividend, bonus and rights entries, NPR"
          defaultFilters={{ types: ['dividend', 'bonus', 'rights'] }}
          pageSize={6}
        />
      </Card>
    </div>
  );
}
