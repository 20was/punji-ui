import { useState, type FormEvent } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { CurrencyInput } from '@punji/ui/currency-input';
import { MeterBar } from '@punji/ui/meter';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Select } from '@punji/ui/select';
import { daysBetween } from '@punji/ui/share-issues';
import { StatusPill } from '@punji/ui/status-pill';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE } from '../shared/sim.ts';
import { npr, rs, useWealth, type Goal } from './store.ts';

/** Whole months from the session date to a due date (30.44-day months), at least zero. */
const monthsUntil = (due: string) => Math.max(0, Math.floor(daysBetween(SESSION_DATE, due) / 30.44));
/** Months of saving `monthly` needed to close the gap, rounded up (bigint ceiling). */
const monthsNeeded = (goal: Goal) => {
  const gap = goal.target - goal.saved;
  if (gap <= 0n) return 0;
  if (goal.monthly <= 0n) return Infinity;
  return Number((gap + goal.monthly - 1n) / goal.monthly);
};
const percent = (goal: Goal) => (goal.target > 0n ? Number((goal.saved * 1000n) / goal.target) / 10 : 0);

/** Savings goals: progress, whether the monthly plan reaches each target in time, and a form to add a contribution. */
export default function GoalsScreen() {
  const { state, dispatch } = useWealth();
  const [goalId, setGoalId] = useState(state.goals[0]?.id ?? '');
  const [text, setText] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (amount === null || amount <= 0n) {
      setProblem('Enter an amount above zero.');
      return;
    }
    dispatch({ type: 'contribute', goalId, amount });
    setText('');
    setAmount(null);
    setProblem(null);
  };

  return (
    <div className="app-stack">
      <ScreenTitle>Goals</ScreenTitle>
      <ul className="wd-goals">
        {state.goals.map((goal) => {
          const left = monthsUntil(goal.due);
          const need = monthsNeeded(goal);
          const done = goal.saved >= goal.target;
          const onTrack = done || need <= left;
          return (
            <li key={goal.id}>
              <Card
                title={goal.name}
                description={`Target ${rs(goal.target)} by ${goal.due}`}
                headingLevel={3}
                action={<StatusPill tone={done ? 'gain' : onTrack ? 'info' : 'warn'} size="sm">{done ? 'Reached' : onTrack ? 'On track' : 'Behind plan'}</StatusPill>}
                testId={`wd-goal-${goal.id}`}
              >
                <p className="wd-goal-figure">
                  <MoneyDisplay value={goal.saved} preset={npr} /> <span className="app-muted">saved · {percent(goal).toFixed(1)}%</span>
                </p>
                <MeterBar parts={[{ value: Number(goal.saved > goal.target ? goal.target : goal.saved), tone: done ? 'gain' : 'chart' }]} max={Number(goal.target)} />
                <p className="app-small app-muted">
                  {done
                    ? 'The target is met.'
                    : `${rs(goal.target - goal.saved)} to go. At ${rs(goal.monthly)} a month that takes ${need} months; ${left} months remain${onTrack ? '.' : `, so save ${rs((goal.target - goal.saved + BigInt(Math.max(left, 1)) - 1n) / BigInt(Math.max(left, 1)))} a month to make it.`}`}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>
      <Card title="Add a contribution" headingLevel={3}>
        <form className="wd-goal-form" onSubmit={submit} noValidate>
          <Select label="Goal" labelPlacement="above" value={goalId} onChange={setGoalId} options={state.goals.map((g) => ({ value: g.id, label: g.name }))} />
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
            testId="wd-goal-amount"
          />
          <Button type="submit" testId="wd-goal-add">
            Add
          </Button>
        </form>
      </Card>
    </div>
  );
}
