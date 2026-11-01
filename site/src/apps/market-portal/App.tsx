import { useCallback, useMemo, useReducer } from 'react';
import { Button } from '@punji/ui/button';
import { InlineState } from '@punji/ui/inline-state';
import { MarketStatus } from '@punji/ui/market-status';
import { useHotkeys, type Hotkey } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, useTicker, type FrameScreen } from '../shared/kit.tsx';
import { BuildingIcon, CalendarIcon, CompareIcon, FilterIcon, HomeIcon, PauseIcon, PlayIcon, StarIcon, TradesIcon } from '../shared/icons.tsx';
import { portalTime } from './market.ts';
import { Overview } from './Overview.tsx';
import { PortalContext, SCREENS, derive, initialState, reducer, signedPct, type Screen } from './store.ts';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import '../shared/app.css';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import './portal.css';

// A public market intelligence portal on a simulated NEPSE session: the overview renders on the server; the screener,
// floorsheet, company page, calendars, comparison and watchlist load when first opened.
const ScreenerScreen = lazyScreen(() => import('./ScreenerScreen.tsx'), 'The screener');
const FloorsheetScreen = lazyScreen(() => import('./FloorsheetScreen.tsx'), 'The floorsheet');
const CompanyScreen = lazyScreen(() => import('./CompanyScreen.tsx'), 'The company page');
const CalendarsScreen = lazyScreen(() => import('./CalendarsScreen.tsx'), 'Calendars');
const CompareScreen = lazyScreen(() => import('./CompareScreen.tsx'), 'Compare');
const WatchlistScreen = lazyScreen(() => import('./WatchlistScreen.tsx'), 'The watchlist');

export default function MarketPortal() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [screen, go] = useScreen(SCREENS, 'overview');
  const derived = useMemo(() => derive(state), [state]);
  const tick = useCallback(() => dispatch({ type: 'tick' }), []);
  useTicker(tick, { intervalMs: 1500, running: state.running && !state.feedDown && !derived.closed });
  const open = useCallback(
    (symbol: string) => {
      dispatch({ type: 'select', symbol });
      go('company');
    },
    [go],
  );
  const hotkeys: Hotkey[] = [...SCREENS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })), { keys: 'p', handler: () => dispatch({ type: 'run', running: !state.running }) }];
  useHotkeys(hotkeys);

  const alertsFired = state.alerts.filter((a) => a.status === 'triggered').length;
  const screens: FrameScreen<Screen>[] = [
    { id: 'overview', title: 'Market overview', short: 'Market', icon: <HomeIcon /> },
    { id: 'screener', title: 'Screener', short: 'Screen', icon: <FilterIcon />, preload: ScreenerScreen.preload },
    { id: 'floorsheet', title: 'Floorsheet', short: 'Floor', icon: <TradesIcon />, preload: FloorsheetScreen.preload },
    { id: 'company', title: state.symbol, short: 'Company', icon: <BuildingIcon />, preload: CompanyScreen.preload },
    { id: 'calendars', title: 'Calendars', short: 'Dates', icon: <CalendarIcon />, preload: CalendarsScreen.preload },
    { id: 'compare', title: 'Compare', icon: <CompareIcon />, preload: CompareScreen.preload },
    { id: 'watchlist', title: 'Watchlist', short: 'Watch', icon: <StarIcon />, badge: alertsFired, preload: WatchlistScreen.preload },
  ];
  const context = useMemo(() => ({ state, derived, dispatch, go, open }), [state, derived, go, open]);
  const { index } = derived;
  const dir = index.change > 0 ? 'up' : index.change < 0 ? 'down' : 'flat';
  const marketState = derived.closed ? 'closed' : 'open';

  return (
    <PortalContext.Provider value={context}>
      <AppFrame
        label="Market portal"
        screens={screens}
        current={screen}
        onSelect={go}
        toolbar={
          <>
            <MarketStatus market="NEPSE" state={marketState} detail={derived.closed ? 'Closed at 15:00' : portalTime(state.market.tick)} size="sm" testId="mp-status" />
            <p className="mp-index" aria-label={`NEPSE index ${index.value.toFixed(2)}, ${dir === 'flat' ? 'unchanged' : `${dir} ${Math.abs(index.change).toFixed(2)} points, ${Math.abs(index.changePercent).toFixed(2)} percent`}`} data-testid="mp-index">
              <span className="mp-index-name">NEPSE</span>
              <span className="mp-index-value">{index.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="mp-index-change" data-dir={dir}>
                {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■'} {signedPct(index.changePercent)}
              </span>
            </p>
            <div className="app-toolbar-end">
              <Button
                size="sm"
                variant="secondary"
                icon={state.running ? <PauseIcon /> : <PlayIcon />}
                aria-pressed={!state.running}
                onClick={() => dispatch({ type: 'run', running: !state.running })}
                title={`${state.running ? 'Pause' : 'Resume'} live prices (P)`}
                disabled={derived.closed}
                testId="mp-feed"
              >
                {state.running ? 'Pause' : 'Resume'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'feed', down: !state.feedDown })} aria-pressed={state.feedDown} testId="mp-outage">
                {state.feedDown ? 'Restore feed' : 'Drop feed (demo)'}
              </Button>
            </div>
          </>
        }
        banner={
          state.feedDown ? (
            <div className="app-banner">
              <InlineState
                icon="offline"
                tone="error"
                role="alert"
                layout="row"
                title="The price feed stopped"
                body={`Figures are as of ${portalTime(state.market.tick)}. They agree with each other, but they are not live.`}
                actions={
                  <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'feed', down: false })} testId="mp-retry">
                    Reconnect
                  </Button>
                }
                testId="mp-feed-down"
              />
            </div>
          ) : null
        }
      >
        {screen === 'overview' && <Overview />}
        {screen === 'screener' && <ScreenerScreen />}
        {screen === 'floorsheet' && <FloorsheetScreen />}
        {screen === 'company' && <CompanyScreen />}
        {screen === 'calendars' && <CalendarsScreen />}
        {screen === 'compare' && <CompareScreen />}
        {screen === 'watchlist' && <WatchlistScreen />}
      </AppFrame>
      <p className="kit-sr" role="status" aria-live="polite">
        {state.notice}
      </p>
    </PortalContext.Provider>
  );
}
