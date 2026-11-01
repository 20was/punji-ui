import { useEffect, useRef, useState } from 'react';
import { Button } from '@punji/ui/button';
import { ChipRow } from '@punji/ui/controls';
import { RiskMeter } from '@punji/ui/risk-meter';
import { Select } from '@punji/ui/select';
import { EmptyState } from '@punji/ui/states';
import { ScreenTitle, lazyScreen } from '../shared/kit.tsx';
import { CATEGORY_LABEL, FUNDS, fundReturn, latestNav, navText, type Fund, type FundCategory, type ReturnPeriod } from './data.ts';
import { Pct } from './bits.tsx';
import { useInvest } from './store.ts';

const FundDetail = lazyScreen(() => import('./FundDetail.tsx'), 'Fund details');

type Filter = 'all' | FundCategory;
type Sort = 'r3' | 'r5' | 'r1' | 'expense' | 'risk';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'r3', label: '3-year return, highest first' },
  { value: 'r5', label: '5-year return, highest first' },
  { value: 'r1', label: '1-year return, highest first' },
  { value: 'expense', label: 'Expense ratio, lowest first' },
  { value: 'risk', label: 'Risk, lowest first' },
];
const num = (v: string | null) => (v === null ? -Infinity : Number(v));
const compare: Record<Sort, (a: Fund, b: Fund) => number> = {
  r1: (a, b) => num(fundReturn(b.id, 1)) - num(fundReturn(a.id, 1)),
  r3: (a, b) => num(fundReturn(b.id, 3)) - num(fundReturn(a.id, 3)),
  r5: (a, b) => num(fundReturn(b.id, 5)) - num(fundReturn(a.id, 5)),
  expense: (a, b) => Number(a.expenseRatio) - Number(b.expenseRatio),
  risk: (a, b) => a.risk - b.risk,
};

/** The fund explorer: filter by category, sort by return, cost or risk, and open a fund. */
export function FundsScreen() {
  const { fundId, openFund } = useInvest();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('r3');
  // Back from a fund puts focus on the fund it came from, so a keyboard user keeps their place in the list.
  const openedFrom = useRef<string | null>(null);
  useEffect(() => {
    if (!fundId && openedFrom.current) document.querySelector<HTMLElement>(`[data-testid="ii-fund-${openedFrom.current}"]`)?.focus();
    openedFrom.current = fundId;
  }, [fundId]);
  if (fundId) return <FundDetail />;
  const categories = Object.keys(CATEGORY_LABEL) as FundCategory[];
  const shown = FUNDS.filter((f) => filter === 'all' || f.category === filter).toSorted((a, b) => compare[sort](a, b) || a.name.localeCompare(b.name));

  return (
    <div className="app-stack">
      <ScreenTitle aside={<span className="app-muted app-small">{FUNDS.length} open-ended funds · NAV as of 1 Nov 2026</span>}>Mutual funds</ScreenTitle>
      <div className="ii-filters">
        <ChipRow
          label="Category"
          prefix="ii-cat"
          value={filter}
          onChange={setFilter}
          wrap
          options={[{ value: 'all', label: 'All', count: FUNDS.length }, ...categories.map((c) => ({ value: c, label: CATEGORY_LABEL[c], count: FUNDS.filter((f) => f.category === c).length }))]}
        />
        <Select label="Sort by" labelPlacement="above" size="md" value={sort} onChange={(v) => setSort(v as Sort)} options={SORTS} testId="ii-sort" />
      </div>
      {shown.length === 0 ? (
        <EmptyState title="No funds in this category" body="Choose another category or show all funds." headingLevel={3} action={<Button size="sm" onClick={() => setFilter('all')}>Show all funds</Button>} testId="ii-funds-empty" />
      ) : (
        <ul className="ii-funds" aria-label="Funds" data-testid="ii-funds">
          {shown.map((f) => (
            <li key={f.id}>
              <button type="button" className="ii-fund" onClick={() => openFund(f.id)} onMouseEnter={() => void FundDetail.preload()} onFocus={() => void FundDetail.preload()} data-testid={`ii-fund-${f.id}`}>
                <span className="ii-fund-head">
                  <span className="ii-fund-name">{f.name}</span>
                  <span className="ii-fund-sub">
                    {f.house} · {CATEGORY_LABEL[f.category]}
                    {f.taxSaving ? ' · Tax saving' : ''}
                  </span>
                </span>
                <RiskMeter level={f.risk} variant="bar" />
                <span className="ii-fund-returns">
                  {([1, 3, 5] as ReturnPeriod[]).map((y) => (
                    <span key={y}>
                      <span className="ii-k">{y}Y</span>
                      <Pct value={fundReturn(f.id, y)} />
                    </span>
                  ))}
                  <span>
                    <span className="ii-k">Expense</span>
                    {f.expenseRatio}%
                  </span>
                  <span>
                    <span className="ii-k">NAV</span>
                    {navText(latestNav(f.id))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="app-small app-muted">Returns are annualised from the NAV (XIRR of one unit bought then and valued now), before tax. Past returns do not promise future ones. Synthetic funds.</p>
    </div>
  );
}
