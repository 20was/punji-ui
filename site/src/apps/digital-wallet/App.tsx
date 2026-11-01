import { useCallback, useMemo, useReducer, useState } from 'react';
import { Switch } from '@punji/ui/switch';
import { useHotkeys } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, useTicker, type FrameScreen } from '../shared/kit.tsx';
import { BillIcon, GiftIcon, HistoryIcon, HomeIcon, ScanIcon, SendIcon } from '../shared/icons.tsx';
import { Home } from './Home.tsx';
import { SCREENS, WalletContext, initialState, reducer, type BillTab, type Screen } from './store.ts';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import '../shared/app.css';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import './wallet.css';

// A Nepali digital wallet, phone first: load money, scan a merchant QR and pay, send to a mobile number, pay bills and
// top up, the history with each payment's timeline, and rewards. Every payment is confirmed with a PIN. Home renders
// on the server; the other screens load on demand.
const ScanScreen = lazyScreen(() => import('./ScanScreen.tsx'), 'Scan and pay');
const SendScreen = lazyScreen(() => import('./SendScreen.tsx'), 'Send money');
const BillsScreen = lazyScreen(() => import('./BillsScreen.tsx'), 'Bills and top-up');
const HistoryScreen = lazyScreen(() => import('./HistoryScreen.tsx'), 'History');
const RewardsScreen = lazyScreen(() => import('./RewardsScreen.tsx'), 'Rewards');

export default function DigitalWallet() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [screen, go] = useScreen(SCREENS, 'home');
  const [billTab, setBillTab] = useState<BillTab>('electricity');
  const pending = state.txs.some((t) => t.status === 'pending' && t.settleAt !== undefined);
  const tick = useCallback(() => dispatch({ type: 'tick' }), []);
  useTicker(tick, { intervalMs: 2500, running: pending });
  useHotkeys([...SCREENS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })), { keys: 'h', handler: () => dispatch({ type: 'hide', hide: !state.hideBalance }) }]);
  const openBills = useCallback(
    (tab: BillTab) => {
      setBillTab(tab);
      go('bills');
    },
    [go],
  );

  const screens: FrameScreen<Screen>[] = [
    { id: 'home', title: 'Home', icon: <HomeIcon /> },
    { id: 'scan', title: 'Scan and pay', short: 'Scan', icon: <ScanIcon />, preload: ScanScreen.preload },
    { id: 'send', title: 'Send money', short: 'Send', icon: <SendIcon />, preload: SendScreen.preload },
    { id: 'bills', title: 'Bills and top-up', short: 'Bills', icon: <BillIcon />, preload: BillsScreen.preload },
    { id: 'history', title: 'History', icon: <HistoryIcon />, badge: state.txs.filter((t) => t.status === 'pending').length, preload: HistoryScreen.preload },
    { id: 'rewards', title: 'Rewards', icon: <GiftIcon />, preload: RewardsScreen.preload },
  ];
  const context = useMemo(() => ({ state, dispatch, go, billTab, openBills }), [state, go, billTab, openBills]);

  return (
    <WalletContext.Provider value={context}>
      <AppFrame
        label="Digital wallet"
        screens={screens}
        current={screen}
        onSelect={go}
        toolbar={
          <>
            <p className="dw-brand">
              <span className="dw-brand-name">Punji Wallet</span>
              <span className="app-muted">KYC verified · 9802000021</span>
            </p>
            <div className="app-toolbar-end dw-switches">
              <Switch label="Hide balance" checked={state.hideBalance} onChange={(hide) => dispatch({ type: 'hide', hide })} testId="dw-hide" />
              <Switch label="Offline (demo)" checked={state.offline} onChange={(offline) => dispatch({ type: 'offline', offline })} testId="dw-offline" />
            </div>
          </>
        }
        banner={
          state.offline ? (
            <p className="app-banner dw-offline" role="status">
              You are offline. Payments will not go through until you are back online.
            </p>
          ) : null
        }
      >
        {screen === 'home' && <Home />}
        {screen === 'scan' && <ScanScreen />}
        {screen === 'send' && <SendScreen />}
        {screen === 'bills' && <BillsScreen />}
        {screen === 'history' && <HistoryScreen />}
        {screen === 'rewards' && <RewardsScreen />}
      </AppFrame>
      <p className="kit-sr" role="status" aria-live="polite">
        {state.notice}
      </p>
    </WalletContext.Provider>
  );
}
