import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { KeyStats } from '@punji/ui/key-stats';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { Tabs } from '@punji/ui/tabs';
import { TransactionList } from '@punji/ui/transaction-list';
import { accounts, transactions } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

type Tab = 'summary' | 'activity' | 'statements';
const npr = nepalMoneyConfig();
const statements = ['Kartik 2082', 'Ashwin 2082', 'Bhadra 2082'];

// The tabs switch the view; the panel is yours to render, with role="tabpanel" and aria-labelledby the chosen tab.
// fill spreads the tabs across a narrow card.
export default function Example() {
  const [tab, setTab] = useState<Tab>('summary');
  return (
    <div className="ex-narrow">
      <Card title={accounts.savings.institution} description={accounts.savings.accountType} headingLevel={3}>
        <Stack>
          <Tabs<Tab>
            label="Account sections"
            prefix="tabs-line"
            panelId="tabs-line-panel"
            fill
            value={tab}
            onChange={setTab}
            options={[
              { value: 'summary', label: 'Summary' },
              { value: 'activity', label: 'Activity' },
              { value: 'statements', label: 'Statements' },
            ]}
          />
          <div id="tabs-line-panel" role="tabpanel" aria-labelledby={`tabs-line-${tab}`} tabIndex={0}>
            {tab === 'summary' && (
              <KeyStats
                label="Account summary"
                empty="Not available"
                items={[
                  { label: 'Balance', value: <MoneyDisplay value={accounts.savings.balance} preset={npr} /> },
                  { label: 'Interest rate', value: '6.25%', sub: 'Paid quarterly' },
                  { label: 'Holder', value: accounts.savings.holder },
                  { label: 'Status', value: 'Active' },
                ]}
              />
            )}
            {tab === 'activity' && <TransactionList transactions={transactions.slice(0, 3)} />}
            {tab === 'statements' && (
              <ul className="ex-rows">
                {statements.map((month) => (
                  <li key={month}>
                    <span>
                      <b>{month}</b>
                      <small>Monthly statement</small>
                    </span>
                    <small>PDF</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Stack>
      </Card>
    </div>
  );
}
