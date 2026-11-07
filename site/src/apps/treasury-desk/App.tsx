import { useMemo, useReducer, useSyncExternalStore } from 'react';
import { useHotkeys } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, type FrameScreen } from '../shared/kit.tsx';
import { BankIcon, CompareIcon, TimelineIcon, TransferIcon } from '../shared/icons.tsx';
import { Overview } from './Overview.tsx';
import { TreasuryContext, SCREENS, derive, initialState, reducer, type Screen } from './store.ts';
import { shockLabel } from './treasury.ts';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import '../shared/app.css';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import './treasury.css';

// A treasury desk for one company: the position renders on the server; the forecast, the payments and the dollar
// exposure load when first opened.
const ForecastScreen = lazyScreen(() => import('./ForecastScreen.tsx'), 'The forecast');
const PaymentsScreen = lazyScreen(() => import('./PaymentsScreen.tsx'), 'Payments and receipts');
const FxScreen = lazyScreen(() => import('./FxScreen.tsx'), 'Dollar exposure');

const subscribeNever = () => () => {};

export default function TreasuryDesk() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [screen, go] = useScreen(SCREENS, 'position');
  const derived = useMemo(() => derive(state), [state]);
  useHotkeys([...SCREENS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })), { keys: 's', handler: () => dispatch({ type: 'stress', on: !state.stress }) }]);
  // The server HTML shows before this chunk hydrates and a key pressed in that gap is lost. False on the server and in
  // the hydration pass, true on the re-render after it, by which time the hotkey listener above is attached (React runs
  // the commit's effects before that re-render), so data-hydrated on the scenario note means "S will work".
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const breaches = derived.breaches.length + (derived.level === 'breach' && derived.breaches.length === 0 ? 1 : 0);
  const screens: FrameScreen<Screen>[] = [
    { id: 'position', title: 'Position and liquidity', short: 'Position', icon: <BankIcon />, badge: breaches > 0 ? breaches : undefined },
    { id: 'forecast', title: '13-week forecast', short: 'Forecast', icon: <TimelineIcon />, preload: ForecastScreen.preload },
    { id: 'payments', title: 'Payments and receipts', short: 'Payments', icon: <TransferIcon />, preload: PaymentsScreen.preload },
    { id: 'fx', title: 'Dollar exposure', short: 'Dollar', icon: <CompareIcon />, preload: FxScreen.preload },
  ];
  const context = useMemo(() => ({ state, derived, dispatch, go }), [state, derived, go]);

  return (
    <TreasuryContext.Provider value={context}>
      <AppFrame
        label="Treasury desk"
        screens={screens}
        current={screen}
        onSelect={go}
        toolbar={
          <>
            <p className="td-company">
              <strong>Sagarmatha Digital Pvt. Ltd.</strong> <span>Treasury, base currency NPR</span>
            </p>
            <p className="app-toolbar-end app-muted app-small" data-testid="td-scenario-note" data-hydrated={hydrated}>
              {state.stress ? 'Stress case' : 'Base case'} · dollar {shockLabel(state.fxBps).toLowerCase()}
            </p>
          </>
        }
      >
        {screen === 'position' && <Overview />}
        {screen === 'forecast' && <ForecastScreen />}
        {screen === 'payments' && <PaymentsScreen />}
        {screen === 'fx' && <FxScreen />}
      </AppFrame>
      <p className="kit-sr" role="status" aria-live="polite">
        {state.notice}
      </p>
    </TreasuryContext.Provider>
  );
}
