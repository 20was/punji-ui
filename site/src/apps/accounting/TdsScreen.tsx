import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { ChoiceGroup } from '@punji/ui/choice-group';
import { FinancialSummary } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Note } from '@punji/ui/states';
import { summariseTds } from '@punji/ui/tax';
import { TdsSummary } from '@punji/ui/tds-summary';
import { ScreenTitle } from '../shared/kit.tsx';
import { dayNumber, npr, rs, shortDate } from '../shared/books.ts';
import { rangeOf } from './books.ts';
import { PeriodBar } from './PeriodBar.tsx';
import { BOOKS, periodById, useAcct } from './store.ts';

/** Tax withheld on rent, contract payments and salaries in the period, by category or by payment, tied to the TDS
 *  payable account: withheld (credits) and deposited with the IRD (debits). */
export default function TdsScreen() {
  const { state, derived } = useAcct();
  const [view, setView] = useState<'category' | 'entries'>('category');
  const period = periodById(state.periodId);
  const { from, to } = rangeOf(period);
  const lo = dayNumber(from);
  const hi = dayNumber(to);
  const entries = BOOKS.tds.filter((e) => dayNumber(e.date) >= lo && dayNumber(e.date) <= hi);
  const totals = summariseTds(entries, { rounding: 'half-up' }).totals;
  let withheld = 0n;
  let deposited = 0n;
  derived.ledger.entries.forEach((e, i) => {
    const d = derived.ledger.days[i]!;
    if (e.account !== '2200' || d < lo || d > hi) return;
    withheld += e.credit;
    deposited += e.debit;
  });
  const caption = `TDS ${view === 'category' ? 'by category' : 'by payment'}, ${period.label} (NPR)`;
  return (
    <div className="app-stack">
      <ScreenTitle aside={<PeriodBar testId="ac-tds-period" />}>TDS summary</ScreenTitle>
      <div className="app-summary">
        <FinancialSummary
          label={`TDS, ${period.label}`}
          metrics={[
            { id: 'gross', label: 'Payments subject to TDS', value: <MoneyDisplay value={totals.gross} preset={npr} /> },
            { id: 'tds', label: 'TDS withheld', value: <MoneyDisplay value={totals.tds} preset={npr} testId="ac-tds-total" /> },
            { id: 'deposited', label: 'Deposited with the IRD', value: <MoneyDisplay value={deposited} preset={npr} testId="ac-tds-deposited" />, note: 'By the 25th of the next month' },
            { id: 'entries', label: 'Payments', value: String(entries.length), note: `${shortDate(from)} to ${shortDate(to)}` },
          ]}
        />
      </div>
      <Card
        title="Withholdings"
        description="Rent 10%, contract payments 1.5%, salaries by the employee's annual tax"
        headingLevel={3}
        action={<ChoiceGroup label="View" value={view} onChange={setView} options={[{ value: 'category', label: 'By category' }, { value: 'entries', label: 'By payment' }]} size="sm" testId="ac-tds-view" />}
        flush
      >
        <TdsSummary caption={caption} entries={entries} view={view} bare emptyLabel="No payments with TDS in this period." testId="ac-tds" />
      </Card>
      {totals.tds === withheld ? (
        <Note quiet>✓ Agrees with credits to TDS payable (2200) in the period: {rs(withheld)}.</Note>
      ) : (
        <Note tone="warn">Credits to TDS payable (2200) in the period are {rs(withheld)}; the payments here withheld {rs(totals.tds)}.</Note>
      )}
    </div>
  );
}
