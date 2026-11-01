import { useCallback, useMemo, useReducer, useState } from 'react';
import { Switch } from '@punji/ui/switch';
import { useHotkeys } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, useTicker, type FrameScreen } from '../shared/kit.tsx';
import { AccountsIcon, BellIcon, CardIcon, HomeIcon, LoanIcon, ProfileIcon, TransferIcon } from '../shared/icons.tsx';
import { Home } from './Home.tsx';
import { BankContext, SCREENS, derive, initialState, reducer, type AccountId, type Screen } from './store.ts';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import '../shared/app.css';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import './banking.css';

// A retail bank's app, phone first: balances and quick actions, statements with BS and AD dates, a transfer with a
// payee check, OTP and receipt, cards, loans and deposits, KYC and notifications. Home renders on the server; the
// other screens load on demand.
const AccountsScreen = lazyScreen(() => import('./AccountsScreen.tsx'), 'Accounts');
const TransferScreen = lazyScreen(() => import('./TransferScreen.tsx'), 'Transfer');
const CardsScreen = lazyScreen(() => import('./CardsScreen.tsx'), 'Cards');
const LoansScreen = lazyScreen(() => import('./LoansScreen.tsx'), 'Loans and deposits');
const ProfileScreen = lazyScreen(() => import('./ProfileScreen.tsx'), 'Profile and KYC');
const AlertsScreen = lazyScreen(() => import('./AlertsScreen.tsx'), 'Notifications');

export default function RetailBanking() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [screen, go] = useScreen(SCREENS, 'home');
  const [account, setAccount] = useState<AccountId>('savings');
  const derived = useMemo(() => derive(state), [state]);
  const tick = useCallback(() => dispatch({ type: 'tick' }), []);
  useTicker(tick, { intervalMs: 2500, running: state.kyc === 'under-review' });
  useHotkeys([
    ...SCREENS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })),
    { keys: 'h', handler: () => dispatch({ type: 'hide-balances', hide: !state.hideBalances }) },
  ]);
  const focusAccount = useCallback(
    (id: AccountId) => {
      setAccount(id);
      go('accounts');
    },
    [go],
  );

  const screens: FrameScreen<Screen>[] = [
    { id: 'home', title: 'Home', icon: <HomeIcon /> },
    { id: 'accounts', title: 'Accounts', icon: <AccountsIcon />, preload: AccountsScreen.preload },
    { id: 'transfer', title: 'Transfer', short: 'Send', icon: <TransferIcon />, preload: TransferScreen.preload },
    { id: 'cards', title: 'Cards', icon: <CardIcon />, preload: CardsScreen.preload },
    { id: 'loans', title: 'Loans and deposits', short: 'Loans', icon: <LoanIcon />, preload: LoansScreen.preload },
    { id: 'profile', title: 'Profile and KYC', short: 'Profile', icon: <ProfileIcon />, preload: ProfileScreen.preload },
    { id: 'alerts', title: 'Notifications', short: 'Alerts', icon: <BellIcon />, badge: derived.unread, preload: AlertsScreen.preload },
  ];
  const context = useMemo(() => ({ state, derived, dispatch, go, focusAccount, account }), [state, derived, go, focusAccount, account]);

  return (
    <BankContext.Provider value={context}>
      <AppFrame
        label="Retail banking"
        screens={screens}
        current={screen}
        onSelect={go}
        toolbar={
          <>
            <p className="rb-today">
              <span className="rb-today-bank">Punji Bank</span>
              <span className="app-muted">
                <time dateTime="2026-11-01">1 Nov 2026</time> · 15 Kartik 2083
              </span>
            </p>
            <div className="app-toolbar-end rb-switches">
              <Switch label="Hide balances" checked={state.hideBalances} onChange={(hide) => dispatch({ type: 'hide-balances', hide })} testId="rb-hide" />
              <Switch label="Offline (demo)" checked={state.offline} onChange={(offline) => dispatch({ type: 'offline', offline })} testId="rb-offline" />
            </div>
          </>
        }
        banner={
          state.offline ? (
            <p className="app-banner rb-offline" role="status">
              You are offline. Balances are as of your last sign-in; nothing you send will leave the app.
            </p>
          ) : null
        }
      >
        {screen === 'home' && <Home />}
        {screen === 'accounts' && <AccountsScreen />}
        {screen === 'transfer' && <TransferScreen />}
        {screen === 'cards' && <CardsScreen />}
        {screen === 'loans' && <LoansScreen />}
        {screen === 'profile' && <ProfileScreen />}
        {screen === 'alerts' && <AlertsScreen />}
      </AppFrame>
      <p className="kit-sr" role="status" aria-live="polite">
        {state.notice}
      </p>
    </BankContext.Provider>
  );
}
