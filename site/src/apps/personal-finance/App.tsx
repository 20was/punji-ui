import { useMemo, useReducer } from 'react';
import { useHotkeys } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, type FrameScreen } from '../shared/kit.tsx';
import { BillIcon, GoalIcon, HomeIcon, ScaleIcon } from '../shared/icons.tsx';
import { Overview } from './Overview.tsx';
import { FinanceContext, SCREENS, initialState, reducer, type Screen } from './store.ts';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import '../shared/app.css';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import './finance.css';

// A household's personal finance: net worth renders on the server; goals, the budget and the bills load when first
// opened.
const GoalsScreen = lazyScreen(() => import('./GoalsScreen.tsx'), 'Goals');
const BudgetScreen = lazyScreen(() => import('./BudgetScreen.tsx'), 'The budget');
const BillsScreen = lazyScreen(() => import('./BillsScreen.tsx'), 'Recurring bills');

export default function PersonalFinance() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [screen, go] = useScreen(SCREENS, 'overview');
  useHotkeys(SCREENS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })));
  const screens: FrameScreen<Screen>[] = [
    { id: 'overview', title: 'Overview', short: 'Home', icon: <HomeIcon /> },
    { id: 'goals', title: 'Goals', short: 'Goals', icon: <GoalIcon />, preload: GoalsScreen.preload },
    { id: 'budget', title: 'Budget', short: 'Budget', icon: <ScaleIcon />, preload: BudgetScreen.preload },
    { id: 'bills', title: 'Recurring bills', short: 'Bills', icon: <BillIcon />, preload: BillsScreen.preload },
  ];
  const context = useMemo(() => ({ state, dispatch, go }), [state, go]);

  return (
    <FinanceContext.Provider value={context}>
      <AppFrame
        label="Personal finance"
        screens={screens}
        current={screen}
        onSelect={go}
        toolbar={
          <>
            <p className="pf-who">
              <strong>Household of Sita and Ram Adhikari</strong> <span>Kathmandu</span>
            </p>
            <p className="app-toolbar-end app-muted app-small">15 November 2026</p>
          </>
        }
      >
        {screen === 'overview' && <Overview />}
        {screen === 'goals' && <GoalsScreen />}
        {screen === 'budget' && <BudgetScreen />}
        {screen === 'bills' && <BillsScreen />}
      </AppFrame>
      <p className="kit-sr" role="status" aria-live="polite">
        {state.notice}
      </p>
    </FinanceContext.Provider>
  );
}
