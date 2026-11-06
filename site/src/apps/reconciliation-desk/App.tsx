import { useMemo, useReducer } from 'react';
import { useHotkeys } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, type FrameScreen } from '../shared/kit.tsx';
import { FilterIcon, HomeIcon, IssueIcon, StatementIcon } from '../shared/icons.tsx';
import { Overview } from './Overview.tsx';
import { BANK, PERIOD } from './recon.ts';
import { ReconContext, SCREENS, derive, initialState, reducer, type Screen } from './store.ts';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import '../shared/app.css';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import './recon.css';

// A back-office reconciliation desk for one bank account and one month: the overview renders on the server; the
// queue, the matched list and the report load when first opened.
const QueueScreen = lazyScreen(() => import('./QueueScreen.tsx'), 'The unmatched queue');
const MatchedScreen = lazyScreen(() => import('./MatchedScreen.tsx'), 'Matched lines');
const ReportScreen = lazyScreen(() => import('./ReportScreen.tsx'), 'The report');

export default function ReconciliationDesk() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [screen, go] = useScreen(SCREENS, 'overview');
  const derived = useMemo(() => derive(state), [state]);
  useHotkeys(SCREENS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })));
  const open = derived.summary.unmatchedStatement.length;
  const screens: FrameScreen<Screen>[] = [
    { id: 'overview', title: 'Overview', short: 'Home', icon: <HomeIcon /> },
    { id: 'queue', title: 'Unmatched queue', short: 'Queue', icon: <FilterIcon />, badge: open > 0 ? open : undefined, preload: QueueScreen.preload },
    { id: 'matched', title: 'Matched', short: 'Matched', icon: <IssueIcon />, preload: MatchedScreen.preload },
    { id: 'report', title: 'Report and export', short: 'Report', icon: <StatementIcon />, preload: ReportScreen.preload },
  ];
  const context = useMemo(() => ({ state, derived, dispatch, go }), [state, derived, go]);

  return (
    <ReconContext.Provider value={context}>
      <AppFrame
        label="Reconciliation desk"
        screens={screens}
        current={screen}
        onSelect={go}
        toolbar={
          <>
            <p className="rc-account">
              <strong>{BANK.name}</strong> <span>{BANK.account}</span>
            </p>
            <p className="app-toolbar-end app-muted app-small">
              {PERIOD.label} · {derived.reconciled ? 'Reconciled' : `${derived.exceptions.length} open ${derived.exceptions.length === 1 ? 'exception' : 'exceptions'}`}
            </p>
          </>
        }
      >
        {screen === 'overview' && <Overview />}
        {screen === 'queue' && <QueueScreen />}
        {screen === 'matched' && <MatchedScreen />}
        {screen === 'report' && <ReportScreen />}
      </AppFrame>
      <p className="kit-sr" role="status" aria-live="polite">
        {state.notice}
      </p>
    </ReconContext.Provider>
  );
}
