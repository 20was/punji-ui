import { ChoiceGroup } from '@punji/ui/choice-group';
import { FinancialPeriodSelector } from '@punji/ui/period-selector';
import { PERIODS } from './books.ts';
import { useAcct, type Compare } from './store.ts';

const KINDS = { year: 'Year', quarter: 'Quarter', month: 'Month' };

/** The reporting period (BS fiscal year, quarter or month) and, where it applies, what to compare it with. Shared by
 *  every screen, so the ledger, trial balance, statements and TDS show the same period. */
export function PeriodBar({ label = 'Reporting period', compare = false, testId }: { label?: string; compare?: boolean; testId: string }) {
  const { state, dispatch } = useAcct();
  return (
    <div className="ac-periodbar">
      <FinancialPeriodSelector periods={PERIODS} value={state.periodId} onChange={(id) => dispatch({ type: 'period', id })} label={label} kindLabels={KINDS} size="sm" testId={testId} />
      {compare && (
        <ChoiceGroup<Compare>
          label="Compare with"
          value={state.compare}
          onChange={(value) => dispatch({ type: 'compare', compare: value })}
          options={[
            { value: 'last-year', label: 'Last year' },
            { value: 'previous', label: 'Previous period' },
            { value: 'none', label: 'None' },
          ]}
          size="sm"
          testId={`${testId}-compare`}
        />
      )}
    </div>
  );
}
