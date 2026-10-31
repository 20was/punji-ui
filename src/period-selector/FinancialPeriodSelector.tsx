'use client';

/**
 * FinancialPeriodSelector: pick a reporting period (fiscal year, quarter,
 * month, or any kinds you define) from a list the caller supplies. With two
 * or more kinds a ChoiceGroup switches the kind and a Select picks the period;
 * switching kind keeps the same time span when the periods carry `start` and
 * `end`. Under the picker, the period's `detail` (for example its BS and AD
 * range) is read out as the Select's description.
 *
 * It has no fiscal-year rule of its own. `nepalFiscalYearPeriods`,
 * `nepalFiscalQuarterPeriods` and `nepalFiscalMonthPeriods` build lists from the
 * existing Nepal calendar helpers; for any other jurisdiction pass your own
 * list. Controlled: the caller owns `value`.
 */
import { useId } from 'react';

import { ChoiceGroup } from '../choice-group/ChoiceGroup.tsx';
import { Select, type ControlSize } from '../select/Select.tsx';
import type { CalendarDate } from '../nepal/date-only.ts';
import type { FinancialPeriod } from './periods.ts';

export * from './periods.ts';

export interface FinancialPeriodSelectorProps {
  periods: readonly FinancialPeriod[];
  /** The selected period's id. */
  value: string;
  onChange: (id: string, period: FinancialPeriod) => void;
  /** The accessible name of the picker, for example "Reporting period". */
  label: string;
  /** Names for the kinds, in the reader's language. A missing kind prints as its id. */
  kindLabels?: Record<string, string>;
  /** Name of the kind switch. Default `${label} type`. */
  kindGroupLabel?: string;
  /** Print the selected period's `detail` under the picker. Default true. */
  showDetail?: boolean;
  size?: ControlSize;
  testId?: string;
}

const order = (date: CalendarDate) => date.year * 10000 + date.month * 100 + date.day;

export function FinancialPeriodSelector({ periods, value, onChange, label, kindLabels, kindGroupLabel, showDetail = true, size = 'md', testId }: FinancialPeriodSelectorProps) {
  const auto = useId();
  const id = testId ?? auto;
  const selected = periods.find(period => period.id === value);
  const kinds = [...new Set(periods.map(period => period.kind))];
  const kind = selected?.kind ?? kinds[0] ?? '';
  const inKind = periods.filter(period => period.kind === kind);
  const detailId = `${id}-detail`;

  // The period of another kind that holds the selected period's first day, else the first of that kind.
  const switchKind = (next: string) => {
    const candidates = periods.filter(period => period.kind === next);
    const anchor = selected?.start;
    const match = anchor ? candidates.find(period => period.start && period.end && order(period.start) <= order(anchor) && order(anchor) <= order(period.end)) : undefined;
    const target = match ?? candidates[0];
    if (target) onChange(target.id, target);
  };

  return (
    <div className="pu-period" data-testid={testId}>
      {kinds.length > 1 && (
        <ChoiceGroup
          label={kindGroupLabel ?? `${label} type`}
          testId={`${id}-kind`}
          size="md"
          appearance="compact"
          value={kind}
          onChange={switchKind}
          options={kinds.map(item => ({ value: item, label: kindLabels?.[item] ?? item }))}
        />
      )}
      <Select
        label={label}
        size={size}
        value={selected?.id ?? ''}
        onChange={next => { const period = periods.find(item => item.id === next); if (period) onChange(next, period); }}
        options={inKind.map(period => ({ value: period.id, label: period.label }))}
        aria-describedby={showDetail && selected?.detail ? detailId : undefined}
        testId={testId ? `${testId}-select` : undefined}
      />
      {showDetail && selected?.detail && <p className="pu-period-detail" id={detailId}>{selected.detail}</p>}
    </div>
  );
}
