import { useCallback, useMemo, useReducer, useState } from 'react';
import { Button } from '@punji/ui/button';
import { MarketStatus } from '@punji/ui/market-status';
import { TradingHaltBanner } from '@punji/ui/trading-halt';
import { formatHotkey, useHotkeys, type Hotkey } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, useTicker, type FrameScreen } from '../shared/kit.tsx';
import { ChartIcon, CommandIcon, OrdersIcon, PauseIcon, PlayIcon, PositionsIcon, TradesIcon, WatchIcon } from '../shared/icons.tsx';
import { timeAt } from '../shared/sim.ts';
import { MarketWatch } from './MarketWatch.tsx';
import { TerminalContext, derive, initialState, reducer, type Screen } from './store.ts';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import '../shared/app.css';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import './terminal.css';

// A TMS-class trading terminal on a simulated NEPSE session: market watch, a symbol with its chart, depth and book,
// an order ticket that places orders into the order book, positions and P&L, and the trade book. The market watch
// renders on the server; the other screens load when first opened.
const SymbolScreen = lazyScreen(() => import('./SymbolScreen.tsx'), 'The symbol screen');
const OrdersScreen = lazyScreen(() => import('./OrdersScreen.tsx'), 'Orders');
const PositionsScreen = lazyScreen(() => import('./PositionsScreen.tsx'), 'Positions');
const TradesScreen = lazyScreen(() => import('./TradesScreen.tsx'), 'Trades');
const Palette = lazyScreen(() => import('./Palette.tsx'), 'The command palette');

const IDS: readonly Screen[] = ['watch', 'symbol', 'orders', 'positions', 'trades'];
const PALETTE_KEYS = 'mod+k, /';

export default function TradingTerminal() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [screen, go] = useScreen(IDS, 'watch');
  const [palette, setPalette] = useState(false);
  const derived = useMemo(() => derive(state), [state]);
  const tick = useCallback(() => dispatch({ type: 'tick' }), []);
  useTicker(tick, { intervalMs: 1500, running: state.running && !state.feedDown });

  const ticket = useCallback(
    (side: 'buy' | 'sell') => {
      dispatch({ type: 'ticket', side });
      go('symbol');
    },
    [go],
  );
  const hotkeys: Hotkey[] = [
    { keys: PALETTE_KEYS, handler: () => setPalette(true) },
    { keys: '?', handler: () => setPalette(true) },
    ...IDS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })),
    { keys: 'b', handler: () => ticket('buy') },
    { keys: 's', handler: () => ticket('sell') },
    { keys: 'p', handler: () => dispatch({ type: 'run', running: !state.running }) },
  ];
  useHotkeys(hotkeys, { enabled: !palette });

  const screens: FrameScreen<Screen>[] = [
    { id: 'watch', title: 'Market watch', short: 'Watch', icon: <WatchIcon /> },
    { id: 'symbol', title: state.symbol, short: 'Chart', icon: <ChartIcon />, preload: SymbolScreen.preload },
    { id: 'orders', title: 'Orders', icon: <OrdersIcon />, badge: derived.openOrders, preload: OrdersScreen.preload },
    { id: 'positions', title: 'Positions', icon: <PositionsIcon />, preload: PositionsScreen.preload },
    { id: 'trades', title: 'Trades', icon: <TradesIcon />, preload: TradesScreen.preload },
  ];
  const halt = state.market.halt;
  const context = useMemo(() => ({ state, derived, dispatch, go }), [state, derived, go]);
  const index = derived.index;
  const sign = index.change > 0 ? '+' : index.change < 0 ? '−' : '';

  return (
    <TerminalContext.Provider value={context}>
      <AppFrame
        label="Trading terminal"
        screens={screens}
        current={screen}
        onSelect={go}
        toolbar={
          <>
            <MarketStatus market="NEPSE" state={derived.halted ? 'halted' : 'open'} detail={timeAt(state.market.tick)} size="sm" testId="tt-status" />
            <p className="tt-index" aria-label={`NEPSE index ${index.value.toFixed(2)}, ${index.change >= 0 ? 'up' : 'down'} ${Math.abs(index.change).toFixed(2)} points, ${Math.abs(index.changePercent).toFixed(2)} percent`}>
              <span className="tt-index-name">NEPSE</span>
              <span className="tt-index-value">{index.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="tt-index-change" data-dir={index.change > 0 ? 'up' : index.change < 0 ? 'down' : 'flat'}>
                {sign}
                {Math.abs(index.change).toFixed(2)} ({sign}
                {Math.abs(index.changePercent).toFixed(2)}%)
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
                testId="tt-feed"
              >
                {state.running ? 'Pause feed' : 'Resume feed'}
              </Button>
              <Button size="sm" variant="secondary" icon={<CommandIcon />} onClick={() => setPalette(true)} title={`Commands (${formatHotkey(PALETTE_KEYS, false)})`} testId="tt-palette">
                Commands
              </Button>
            </div>
          </>
        }
        banner={
          halt ? (
            <div className="app-banner">
              {halt.kind === 'circuit-breaker' ? (
                <TradingHaltBanner
                  kind="circuit-breaker"
                  changePercent={halt.changePercent}
                  resumesAt={timeAt(halt.untilTick)}
                  detail="Open orders stay in the book; new orders, changes and cancellations wait until trading resumes."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'resume' })}>
                      Resume now (demo)
                    </Button>
                  }
                  testId="tt-halt"
                />
              ) : (
                <TradingHaltBanner kind="resumed" resumesAt={timeAt(halt.untilTick)} onDismiss={() => dispatch({ type: 'dismiss-halt' })} testId="tt-halt" />
              )}
            </div>
          ) : null
        }
      >
        {screen === 'watch' && <MarketWatch />}
        {screen === 'symbol' && <SymbolScreen />}
        {screen === 'orders' && <OrdersScreen />}
        {screen === 'positions' && <PositionsScreen />}
        {screen === 'trades' && <TradesScreen />}
      </AppFrame>
      <p className="kit-sr" role="status" aria-live="polite">
        {state.notice}
      </p>
      {palette && <Palette onClose={() => setPalette(false)} />}
    </TerminalContext.Provider>
  );
}
