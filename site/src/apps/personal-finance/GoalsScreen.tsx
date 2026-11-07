import { useState, type FormEvent } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { CheckList, CheckRow } from '@punji/ui/check-row';
import { CurrencyInput } from '@punji/ui/currency-input';
import { MeterBar } from '@punji/ui/meter';
import { Select } from '@punji/ui/select';
import { npr, rs } from '../shared/books.ts';
import { GoalIcon } from '../shared/icons.tsx';
import { ScreenTitle } from '../shared/kit.tsx';
import { GOALS, NOW, monthlyNeeded, monthsBetween, monthsNeeded, percentOf } from './finance.ts';
import { useFinance } from './store.ts';

/** Goals with progress: each is a row with its percentage, a meter and one of three words (Reached, On track, Behind),
 *  and a form to put money towards one. */
export default function GoalsScreen() {
  const { state, dispatch } = useFinance();
  const [goalId, setGoalId] = useState(GOALS[0]!.id);
  const [text, setText] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (amount === null || amount <= 0n) return setProblem('Enter an amount above zero.');
    dispatch({ type: 'contribute', goalId, amount });
    setText('');
    setAmount(null);
    setProblem(null);
  };
  return (
    <div className="app-stack">
      <ScreenTitle>Goals</ScreenTitle>
      <CheckList label="Savings goals" testId="pf-goals">
        {GOALS.map((goal) => {
          const saved = state.saved[goal.id] ?? goal.saved;
          const left = monthsBetween(NOW, goal.due);
          const need = monthsNeeded(goal, saved);
          const done = saved >= goal.target;
          const onTrack = done || need <= left;
          const pct = percentOf(saved > goal.target ? goal.target : saved, goal.target);
          return (
            <CheckRow
              key={goal.id}
              icon={<GoalIcon />}
              tone={done ? 'gain' : onTrack ? 'info' : 'warn'}
              title={goal.name}
              line={done ? `Target ${rs(goal.target)} met.` : `${rs(saved)} of ${rs(goal.target)}, due ${left} ${left === 1 ? 'month' : 'months'} from now. ${onTrack ? `At ${rs(goal.monthly)} a month it is reached in time.` : `Save ${rs(monthlyNeeded(goal, saved))} a month to make it.`}`}
              trail={<MeterBar parts={[{ value: Number(saved > goal.target ? goal.target : saved), tone: done ? 'gain' : 'chart' }]} max={Number(goal.target)} />}
              figure={`${pct.toFixed(1)}%`}
              status={{ label: done ? 'Reached' : onTrack ? 'On track' : 'Behind plan', tone: done ? 'gain' : onTrack ? undefined : 'warn' }}
              variant="check"
              testId={`pf-goal-${goal.id}`}
            />
          );
        })}
      </CheckList>
      <Card title="Add to a goal" headingLevel={3}>
        <form className="pf-form" onSubmit={submit} noValidate>
          <Select label="Goal" labelPlacement="above" value={goalId} onChange={setGoalId} options={GOALS.map((g) => ({ value: g.id, label: g.name }))} testId="pf-goal-select" />
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
            testId="pf-goal-amount"
          />
          <Button type="submit" testId="pf-goal-add">
            Add
          </Button>
        </form>
      </Card>
    </div>
  );
}
