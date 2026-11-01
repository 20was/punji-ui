import { useMemo, useState } from 'react';
import { Card } from '@punji/ui/card';
import { ChoiceGroup } from '@punji/ui/choice-group';
import { TrialBalance } from '@punji/ui/trial-balance';
import { ScreenTitle } from '../shared/kit.tsx';
import { dayNumber, shortDate } from '../shared/books.ts';
import { ACCOUNTS, accountName, rangeOf } from './books.ts';
import { PeriodBar } from './PeriodBar.tsx';
import { periodById, useAcct } from './store.ts';

const ORDER = new Map(ACCOUNTS.map((a, i) => [a.code, i]));

/** Every account's debit or credit balance at the end of the period, and whether the books balance. */
export default function TrialScreen() {
  const { state, derived } = useAcct();
  const [basis, setBasis] = useState<'net' | 'totals'>('net');
  const period = periodById(state.periodId);
  const { to } = rangeOf(period);
  const entries = useMemo(() => {
    const hi = dayNumber(to);
    return derived.ledger.entries.filter((_, i) => derived.ledger.days[i]! <= hi).toSorted((a, b) => ORDER.get(a.account)! - ORDER.get(b.account)!);
  }, [derived.ledger, to]);
  return (
    <div className="app-stack">
      <ScreenTitle aside={<PeriodBar label="As at the end of" testId="ac-trial-period" />}>Trial balance</ScreenTitle>
      <Card
        title={`Trial balance at ${shortDate(to)}`}
        description="Cumulative from the opening balances on 1 Shrawan 2082, in chart order"
        headingLevel={3}
        action={
          <ChoiceGroup
            label="Show"
            value={basis}
            onChange={setBasis}
            options={[{ value: 'net', label: 'Balances' }, { value: 'totals', label: 'Totals' }]}
            size="sm"
            testId="ac-trial-basis"
          />
        }
        flush
      >
        <TrialBalance caption={`Trial balance at ${shortDate(to)} (NPR)`} data={entries} basis={basis} renderAccount={accountName} bare maxHeight={560} emptyLabel="No postings by this date." testId="ac-trial" />
      </Card>
    </div>
  );
}
