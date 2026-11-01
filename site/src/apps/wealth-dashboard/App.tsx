import { useCallback, useMemo, useReducer } from 'react';
import { Button } from '@punji/ui/button';
import { MarketStatus } from '@punji/ui/market-status';
import { MoneyDisplay } from '@punji/ui/money-display';
import { useHotkeys } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, useTicker, type FrameScreen } from '../shared/kit.tsx';
import { DividendIcon, GoalIcon, HoldingsIcon, HomeIcon, IssueIcon, PauseIcon, PlayIcon, TimelineIcon } from '../shared/icons.tsx';
import { timeAt } from '../shared/sim.ts';
import { Overview } from './Overview.tsx';
import { WealthContext, derive, initialState, npr, reducer, type Screen } from './store.ts';
import '../shared/app.css';
import './wealth.css';

// A personal wealth dashboard on the same simulated market as the terminal: net worth and allocation, holdings at
// live prices with CSV export, dividends by fiscal year, an IPO and share-issue centre (apply, then check the
// allotment), corporate actions, and savings goals. The overview renders on the server; the rest load on demand.
const HoldingsScreen = lazyScreen(() => import('./HoldingsScreen.tsx'), 'Holdings');
const DividendsScreen = lazyScreen(() => import('./DividendsScreen.tsx'), 'Dividends');
const IssuesScreen = lazyScreen(() => import('./IssuesScreen.tsx'), 'The IPO centre');
const ActionsScreen = lazyScreen(() => import('./ActionsScreen.tsx'), 'Corporate actions');
const GoalsScreen = lazyScreen(() => import('./GoalsScreen.tsx'), 'Goals');

const IDS: readonly Screen[] = ['overview', 'holdings', 'dividends', 'issues', 'actions', 'goals'];

export default function WealthDashboard() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [screen, go] = useScreen(IDS, 'overview');
  const derived = useMemo(() => derive(state), [state]);
  const tick = useCallback(() => dispatch({ type: 'tick' }), []);
  useTicker(tick, { intervalMs: 2000, running: state.running });
  useHotkeys([...IDS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })), { keys: 'p', handler: () => dispatch({ type: 'run', running: !state.running }) }]);

  const openIssues = state.applications.filter((a) => a.status === 'applied').length;
  const screens: FrameScreen<Screen>[] = [
    { id: 'overview', title: 'Overview', icon: <HomeIcon /> },
    { id: 'holdings', title: 'Holdings', icon: <HoldingsIcon />, preload: HoldingsScreen.preload },
    { id: 'dividends', title: 'Dividends', short: 'Income', icon: <DividendIcon />, preload: DividendsScreen.preload },
    { id: 'issues', title: 'IPO centre', short: 'IPO', icon: <IssueIcon />, badge: openIssues, preload: IssuesScreen.preload },
    { id: 'actions', title: 'Corporate actions', short: 'Actions', icon: <TimelineIcon />, preload: ActionsScreen.preload },
    { id: 'goals', title: 'Goals', icon: <GoalIcon />, preload: GoalsScreen.preload },
  ];
  const context = useMemo(() => ({ state, derived, dispatch, go }), [state, derived, go]);

  return (
    <WealthContext.Provider value={context}>
      <AppFrame
        label="Wealth dashboard"
        screens={screens}
        current={screen}
        onSelect={go}
        toolbar={
          <>
            <MarketStatus market="NEPSE" state="open" detail={timeAt(state.market.tick)} size="sm" />
            <p className="wd-networth-mini">
              <span>Net worth</span> <MoneyDisplay value={derived.netWorth} preset={npr} testId="wd-networth-toolbar" />
            </p>
            <div className="app-toolbar-end">
              <Button
                size="sm"
                variant="secondary"
                icon={state.running ? <PauseIcon /> : <PlayIcon />}
                aria-pressed={!state.running}
                onClick={() => dispatch({ type: 'run', running: !state.running })}
                title={`${state.running ? 'Pause' : 'Resume'} live prices (P)`}
              >
                {state.running ? 'Pause prices' : 'Resume prices'}
              </Button>
            </div>
          </>
        }
      >
        {screen === 'overview' && <Overview />}
        {screen === 'holdings' && <HoldingsScreen />}
        {screen === 'dividends' && <DividendsScreen />}
        {screen === 'issues' && <IssuesScreen />}
        {screen === 'actions' && <ActionsScreen />}
        {screen === 'goals' && <GoalsScreen />}
      </AppFrame>
      <p className="kit-sr" role="status" aria-live="polite">
        {state.notice}
      </p>
    </WealthContext.Provider>
  );
}
