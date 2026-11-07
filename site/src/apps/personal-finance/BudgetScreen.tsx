import { useState, type FormEvent } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { CurrencyInput } from '@punji/ui/currency-input';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { MeterBar } from '@punji/ui/meter';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { Select } from '@punji/ui/select';
import { StatusBanner } from '@punji/ui/status-banner';
import { npr, rs } from '../shared/books.ts';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount, formatPlainAggregate, nprMoney } from '../shared/moneyCells.tsx';
import { BUDGET_MONTH, CATEGORIES, INCOME, type Category } from './finance.ts';
import { useFinance } from './store.ts';

interface Line {
  category: Category;
  actual: bigint;
  left: bigint;
}

/** Budget against what was spent, by category, to the paisa. A category over its budget is said in words in the
 *  table and as a banner, and a bill paid on the Bills screen lands here. */
export default function BudgetScreen() {
  const { state, dispatch } = useFinance();
  const [categoryId, setCategoryId] = useState('groceries');
  const [text, setText] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const lines: Line[] = CATEGORIES.map((category) => {
    const actual = state.spent[category.id] ?? category.actual;
    return { category, actual, left: category.budget - actual };
  });
  const over = lines.filter((l) => l.left < 0n);
  const budgeted = CATEGORIES.reduce((n, c) => n + c.budget, 0n);
  const spent = lines.reduce((n, l) => n + l.actual, 0n);
  const columns: FinancialColumn<Line>[] = [
    { key: 'name', label: 'Category', rowHeader: true, render: (l) => <strong>{l.category.name}</strong> },
    { key: 'budget', label: 'Budget', kind: 'money', num: true, value: (l) => nprMoney(l.category.budget), aggregate: 'sum', formatAggregate: formatPlainAggregate, render: (l) => <Amount value={l.category.budget} plain /> },
    { key: 'actual', label: 'Spent', kind: 'money', num: true, value: (l) => nprMoney(l.actual), aggregate: 'sum', formatAggregate: formatPlainAggregate, render: (l) => <Amount value={l.actual} plain /> },
    {
      key: 'left',
      label: 'Left',
      kind: 'money',
      num: true,
      value: (l) => nprMoney(l.left),
      aggregate: 'sum',
      formatAggregate: (v) => formatPlainAggregate(v),
      render: (l) => (l.left < 0n ? <strong>{`! Over by ${rs(-l.left)}`}</strong> : <Amount value={l.left} plain />),
    },
    {
      key: 'bar',
      label: 'Used',
      render: (l) => (
        <MeterBar
          parts={[
            { value: Number(l.actual < l.category.budget ? l.actual : l.category.budget), tone: 'chart' },
            { value: Number(l.actual > l.category.budget ? l.actual - l.category.budget : 0n), tone: 'loss' },
          ]}
          max={Number(l.actual > l.category.budget ? l.actual : l.category.budget)}
          marker={Number(l.category.budget)}
        />
      ),
    },
  ];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (amount === null || amount <= 0n) return setProblem('Enter an amount above zero.');
    dispatch({ type: 'spend', categoryId, amount });
    setText('');
    setAmount(null);
    setProblem(null);
  };
  return (
    <div className="app-stack">
      <ScreenTitle>Budget</ScreenTitle>
      <MetricRow label={`Budget for ${BUDGET_MONTH}`} count={4} testId="pf-budget-kpis">
        <MetricTile label="Income" value={<Amount value={INCOME} plain />} note="Salary, monthly" compact />
        <MetricTile label="Budgeted" value={<Amount value={budgeted} plain testId="pf-budgeted" />} note={`${rs(INCOME - budgeted)} unallocated`} compact />
        <MetricTile label="Spent so far" value={<Amount value={spent} plain testId="pf-spent" />} note="To 15 November" compact />
        <MetricTile tone="inverse" label="Categories over" value={<span data-testid="pf-over-count">{over.length}</span>} note={over.length === 0 ? 'All within budget' : over.map((l) => l.category.name).join(', ')} compact />
      </MetricRow>
      {over.length > 0 && (
        <section className="pf-banners" aria-label="Categories over budget" data-testid="pf-over">
          {over.map((l) => (
            <StatusBanner key={l.category.id} tone="warn" title={`${l.category.name} is over budget`} testId={`pf-over-${l.category.id}`}>
              {rs(l.actual)} spent against {rs(l.category.budget)}, {rs(-l.left)} over.
            </StatusBanner>
          ))}
        </section>
      )}
      <Card title="Budget against actual" description={`${BUDGET_MONTH}, month to date. The bar shows the budget as a tick; the part past it is what is over.`} headingLevel={3} flush testId="pf-budget">
        <FinancialTable
          caption={`Budget against actual spending, ${BUDGET_MONTH} (NPR)`}
          columns={columns}
          rows={lines}
          rowKey={(l) => l.category.id}
          emptyTitle="No categories"
          expectedTotals={{ budget: nprMoney(budgeted), actual: nprMoney(spent) }}
          totalsLabels={{ total: 'All categories' }}
        />
      </Card>
      <Card title="Record spending" headingLevel={3}>
        <form className="pf-form" onSubmit={submit} noValidate>
          <Select label="Category" labelPlacement="above" value={categoryId} onChange={setCategoryId} options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))} testId="pf-spend-category" />
          <CurrencyInput
            label="Amount"
            preset={npr}
            value={text}
            onValueChange={(change) => {
              setText(change.value);
              setAmount(change.minorUnits);
              setProblem(null);
            }}
            error={problem ?? undefined}
            testId="pf-spend-amount"
          />
          <Button type="submit" testId="pf-spend-add">
            Record
          </Button>
        </form>
      </Card>
    </div>
  );
}
