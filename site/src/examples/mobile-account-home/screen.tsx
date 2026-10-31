import { useState } from 'react';
import { Avatar } from '@punji/ui/avatar';
import { BankAccountCard } from '@punji/ui/bank-account-card';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { Delta, Figure } from '@punji/ui/figures';
import { StateGlyph } from '@punji/ui/inline-state';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { PriceChange } from '@punji/ui/price-change';
import { GroupedCell, RowList, Tile, ValueRow } from '@punji/ui/rows';
import { Sparkline } from '@punji/ui/sparkline';
import { CountBadge } from '@punji/ui/status-pill';
import { TransactionList } from '@punji/ui/transaction-list';
import { accounts, holdings, nabilCloses, quotes, transactions } from '../../sample.ts';
import './screen.css';

// A phone's home screen for a bank-and-brokerage account: the balance (hidden on request), quick actions, the
// portfolio at a glance, recent transactions and the bottom tab bar. Designed at 390 px; on a wide screen it stays
// a phone-width column.
const npr = nepalMoneyConfig();
const value = quotes.reduce((sum, q, i) => sum + (q.ltp ?? 0n) * BigInt(holdings[i]?.qty ?? 0), 0n);
const previous = quotes.reduce((sum, q, i) => sum + (q.previousClose ?? 0n) * BigInt(holdings[i]?.qty ?? 0), 0n);
const recent = transactions.filter((t) => !t.counterparty.startsWith('=')).slice(0, 4);
const ACTIONS = [
  { label: 'Send', icon: 'chart' },
  { label: 'Pay bills', icon: 'clock' },
  { label: 'Alerts', icon: 'bell' },
  { label: 'Statements', icon: 'info' },
] as const;
const TABS = ['Home', 'Markets', 'Portfolio', 'More'] as const;
type Tab = (typeof TABS)[number];

export default function Example() {
  const [tab, setTab] = useState<Tab>('Home');
  return (
    <div className="sc-mob">
      <div className="sc-mob-phone">
        <header className="sc-mob-top">
          <Avatar name={accounts.savings.holder} tone="accent" />
          <div className="sc-mob-hello">
            <p>Namaste,</p>
            <h3>Sita</h3>
          </div>
          <span className="sc-mob-bell">
            <Button variant="ghost" size="sm" iconOnly label="Notifications, 2 new" icon={<StateGlyph name="bell" size={18} />} />
            <CountBadge count={2} label="new" />
          </span>
        </header>

        <BankAccountCard {...accounts.savings} balanceToggle headingLevel={4} />

        <ul className="sc-mob-actions" aria-label="Quick actions">
          {ACTIONS.map((a) => (
            <li key={a.label}>
              <Button variant="secondary" block stacked icon={<StateGlyph name={a.icon} size={18} />}>
                {a.label}
              </Button>
            </li>
          ))}
        </ul>

        <Card
          title="Portfolio"
          headingLevel={3}
          action={
            <Button variant="ghost" size="sm">
              See all
            </Button>
          }
        >
          <div className="sc-mob-pf">
            <div>
              <p className="sc-mob-figure">
                <MoneyDisplay value={value} preset={npr} />
              </p>
              <PriceChange current={value} previous={previous} preset={npr} size="sm" />
            </div>
            <Sparkline values={nabilCloses} tone="chart" width={72} height={32} label="Portfolio value, last 30 sessions" />
          </div>
          <GroupedCell label="Largest holdings">
            <RowList label="Largest holdings">
              {holdings.slice(0, 3).map((h) => (
                <ValueRow
                  key={h.symbol}
                  lead={<Tile text={h.symbol} />}
                  symbol={h.symbol}
                  line={`${h.qty} shares`}
                  figure={<Figure value={h.ltp * h.qty} kind="rs" />}
                  note={<Delta value={h.change} />}
                  href={`#${h.symbol}`}
                  chevron
                />
              ))}
            </RowList>
          </GroupedCell>
        </Card>

        <Card
          title="Recent"
          headingLevel={3}
          action={
            <Button variant="ghost" size="sm">
              Statement
            </Button>
          }
        >
          <TransactionList transactions={recent} calendar="bs" />
        </Card>

        <nav className="sc-mob-tabs" aria-label="App sections">
          <ul>
            {TABS.map((t) => (
              <li key={t}>
                <Button variant="ghost" size="sm" block aria-current={t === tab ? 'page' : undefined} onClick={() => setTab(t)}>
                  {t}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
