import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { JournalEntryView } from '@punji/ui/journal-entry';
import { PageHeader } from '@punji/ui/layout';
import { accountBalance, isBalanced, journalsToEntries, rollUp } from '@punji/ui/ledger';
import { LedgerTable } from '@punji/ui/ledger-table';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { FinancialPeriodSelector, nepalFiscalMonthPeriods, nepalFiscalQuarterPeriods, nepalFiscalYearPeriods } from '@punji/ui/period-selector';
import { StatementTable } from '@punji/ui/statement-table';
import { StatusPill } from '@punji/ui/status-pill';
import { Tabs } from '@punji/ui/tabs';
import { TrialBalance } from '@punji/ui/trial-balance';
import { cashEntries, cashOpening, incomeStatement, journals, periodSpec, periods, unbalancedJournal } from '../../sample.ts';
import './screen.css';

// A small business's books. The tiles are display-rounded (compact); the reports below are exact. The figures come from the ledger helpers, exactly: the cash balance from the ledger,
// VAT payable from the posted journals, net profit from the rolled-up income statement. The period selector is
// wired to state only; filter your entries by the chosen period's dates.
const npr = nepalMoneyConfig();
const PERIODS = [...nepalFiscalYearPeriods(periodSpec.from, periodSpec.to), ...nepalFiscalQuarterPeriods(periodSpec.detailYear), ...nepalFiscalMonthPeriods(periodSpec.detailYear)];
const posted = journalsToEntries(journals);
const cash = accountBalance(cashEntries, 'Cash', { normal: 'debit', opening: cashOpening });
const vatPayable = accountBalance(posted, 'VAT Payable', { normal: 'credit' });
const statement = rollUp(incomeStatement);
const root = statement[0];
const netProfit = root?.kind === 'section' ? (root.subtotal?.values?.['2081/82'] ?? null) : null;
const sales = posted.filter((e) => e.account === 'Sales').reduce((sum, e) => sum + e.credit - e.debit, 0n);

type View = 'trial' | 'ledger' | 'pl';

export default function Example() {
  const [period, setPeriod] = useState<string>(periodSpec.initial);
  const [view, setView] = useState<View>('trial');
  return (
    <div className="sc-acc">
      <PageHeader headingLevel={3} title="Books" meta="Himalayan Stationers Pvt. Ltd. · NPR" actions={<Button size="sm">New journal entry</Button>} />
      <div className="sc-acc-period">
        <FinancialPeriodSelector
          periods={PERIODS}
          value={period}
          onChange={(id) => setPeriod(id)}
          label="Reporting period"
          kindLabels={{ year: 'Year', quarter: 'Quarter', month: 'Month' }}
        />
      </div>

      <MetricRow label="Key balances" count={4}>
        <MetricTile label="Cash in hand" value={<MoneyDisplay value={cash} preset={npr} compact />} note="Cash ledger, closing" />
        <MetricTile label="Sales posted" value={<MoneyDisplay value={sales} preset={npr} compact />} note="Shrawan 2081 journals" />
        <MetricTile label="VAT payable" value={<MoneyDisplay value={vatPayable} preset={npr} compact />} note="Output less input VAT" />
        <MetricTile tone="inverse" label="Net profit" value={<MoneyDisplay value={netProfit} preset={npr} compact />} note="FY 2081/82, rolled up" />
      </MetricRow>

      <div className="sc-acc-grid">
        <Card label="Reports" headingLevel={3}>
          <div className="sc-acc-stack">
            <Tabs<View>
              label="Reports"
              prefix="sc-acc-tab"
              panelId="sc-acc-panel"
              value={view}
              onChange={setView}
              options={[
                { value: 'trial', label: 'Trial balance' },
                { value: 'ledger', label: 'Cash ledger' },
                { value: 'pl', label: 'Income statement' },
              ]}
            />
            <div id="sc-acc-panel" role="tabpanel" aria-labelledby={`sc-acc-tab-${view}`} tabIndex={0} className="sc-acc-scroll">
              {view === 'trial' && <TrialBalance caption="Trial balance, Shrawan 2081 (NPR)" data={journals} basis="net" />}
              {view === 'ledger' && <LedgerTable caption="Cash ledger, Shrawan 2081 (NPR)" entries={cashEntries} normal="debit" opening={cashOpening} />}
              {view === 'pl' && <StatementTable caption="Income statement (NPR)" periods={periods} rows={statement} variance={{ from: '2080/81', to: '2081/82' }} />}
            </div>
          </div>
        </Card>

        <div className="sc-acc-side">
          <Card
            title="Latest journal"
            headingLevel={3}
            action={
              <StatusPill tone="gain" size="sm">
                Posted
              </StatusPill>
            }
          >
            <div className="sc-acc-scroll">
              <JournalEntryView journal={journals[0]!} />
            </div>
          </Card>
          <Card
            title="Draft"
            headingLevel={3}
            action={
              <StatusPill tone={isBalanced(unbalancedJournal) ? 'gain' : 'warn'} size="sm">
                {isBalanced(unbalancedJournal) ? 'Balanced' : 'Does not balance'}
              </StatusPill>
            }
          >
            <div className="sc-acc-scroll">
              <JournalEntryView journal={unbalancedJournal} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
