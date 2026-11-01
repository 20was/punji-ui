import { useEffect, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { FinancialTable } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { StatusPill } from '@punji/ui/status-pill';

// Money is bigint minor units (paisa): 12_450_075n is Rs 1,24,500.75. Never a float.
// The data is invented for the starter; replace it with your API.
type Txn = { id: string; date: string; description: string; amount: bigint; status: 'Settled' | 'Pending' };

const opening = 11_800_000n;
const transactions: Txn[] = [
  { id: 't1', date: '2026-11-01', description: 'Salary, Himal Traders', amount: 9_500_000n, status: 'Settled' },
  { id: 't2', date: '2026-11-01', description: 'Rent, Lalitpur flat', amount: -3_500_000n, status: 'Settled' },
  { id: 't3', date: '2026-11-02', description: 'Electricity bill', amount: -184_925n, status: 'Settled' },
  { id: 't4', date: '2026-11-02', description: 'Mobile top-up', amount: -50_000n, status: 'Settled' },
  { id: 't5', date: '2026-11-03', description: 'Transfer to savings', amount: -5_115_000n, status: 'Pending' },
];
const balance = transactions.reduce((sum, t) => sum + t.amount, opening);

// Nepal preset: NPR with lakh and crore grouping. For another currency pass currency="USD" locale="en-US".
const npr = nepalMoneyConfig();

type Theme = 'light' | 'dark';
type Density = 'compact' | 'comfortable' | 'spacious';

/** Theme and density are attributes on <html>; every Punji component reads them through CSS variables. */
function usePreferences() {
  const [theme, setTheme] = useState<Theme>(() => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [density, setDensity] = useState<Density>('comfortable');
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
    document.documentElement.dataset['puDensity'] = density;
  }, [theme, density]);
  return { theme, setTheme, density, setDensity };
}

export function App() {
  const { theme, setTheme, density, setDensity } = usePreferences();
  return (
    <div className="app">
      <header className="app-bar">
        <h1>Punji Bank</h1>
        <div className="app-prefs">
          <SegmentedControl<Theme> label="Theme" prefix="theme" size="sm" value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          <SegmentedControl<Density>
            label="Density"
            prefix="density"
            size="sm"
            value={density}
            onChange={setDensity}
            options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'spacious', label: 'Spacious' }]}
          />
        </div>
      </header>

      <main className="app-main">
        <Card title="Savings account" description="Everest Savings, account ending 4521" action={<Button size="sm">Send money</Button>}>
          <p className="app-balance-label">Available balance</p>
          <p className="app-balance">
            <MoneyDisplay value={balance} preset={npr} />
          </p>
        </Card>

        <Card title="Recent transactions" description="Amounts in NPR, newest last" flush>
          <FinancialTable<Txn>
            caption="Recent transactions"
            rows={transactions}
            rowKey={(t) => t.id}
            emptyTitle="No transactions yet"
            columns={[
              { key: 'date', label: 'Date', render: (t) => t.date },
              { key: 'description', label: 'Description', rowHeader: true, render: (t) => t.description },
              { key: 'status', label: 'Status', render: (t) => <StatusPill size="sm" {...(t.status === 'Pending' ? { tone: 'warn' as const } : {})}>{t.status}</StatusPill> },
              { key: 'amount', label: 'Amount', num: true, render: (t) => <MoneyDisplay value={t.amount} preset={npr} signDisplay="exceptZero" /> },
            ]}
          />
        </Card>
      </main>
    </div>
  );
}
