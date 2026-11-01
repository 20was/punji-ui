import { useCallback, useMemo, useReducer, useState } from 'react';
import { Switch } from '@punji/ui/switch';
import { useHotkeys } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, useTicker, type FrameScreen } from '../shared/kit.tsx';
import { GoalIcon, HoldingsIcon, PositionsIcon, ShieldIcon, TaxIcon } from '../shared/icons.tsx';
import { FundsScreen } from './FundsScreen.tsx';
import { InvestContext, SCREENS, initialState, reducer, type Screen } from './store.ts';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import '../shared/app.css';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import './invest.css';

// Mutual funds and insurance in one app, phone first: a fund explorer with riskometers and NAV history, a SIP planner
// that orders and allots units at NAV, the portfolio with XIRR, policies with premiums, cover gap, claims and nominees,
// and the investments that reduce taxable income. Funds render on the server; the other screens load on demand.
const SipScreen = lazyScreen(() => import('./SipScreen.tsx'), 'SIP planner');
const PortfolioScreen = lazyScreen(() => import('./PortfolioScreen.tsx'), 'Portfolio');
const InsuranceScreen = lazyScreen(() => import('./InsuranceScreen.tsx'), 'Insurance');
const TaxScreen = lazyScreen(() => import('./TaxScreen.tsx'), 'Tax saving');

export default function InvestInsure() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [screen, go] = useScreen(SCREENS, 'funds');
  const [fundId, openFund] = useState<string | null>(null);
  const [plan, setPlan] = useState<{ fundId: string; kind: 'sip' | 'lumpsum'; monthly?: bigint }>({ fundId: 'himal-growth', kind: 'sip' });
  const busy = state.orders.some((o) => o.nextAt !== undefined) || state.claims.some((c) => c.nextAt !== undefined);
  const tick = useCallback(() => dispatch({ type: 'tick' }), []);
  useTicker(tick, { intervalMs: 2000, running: busy });
  useHotkeys(SCREENS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })));
  const invest = useCallback(
    (id: string, kind: 'sip' | 'lumpsum' = 'sip', monthly?: bigint) => {
      setPlan({ fundId: id, kind, monthly });
      go('sip');
    },
    [go],
  );
  const pending = state.orders.filter((o) => o.nextAt !== undefined).length + state.claims.filter((c) => c.nextAt !== undefined).length;
  const due = state.policies.filter((p) => p.status === 'grace').length;

  const screens: FrameScreen<Screen>[] = [
    { id: 'funds', title: 'Mutual funds', short: 'Funds', icon: <HoldingsIcon /> },
    { id: 'sip', title: 'SIP planner', short: 'SIP', icon: <GoalIcon />, preload: SipScreen.preload },
    { id: 'portfolio', title: 'Portfolio', icon: <PositionsIcon />, badge: pending || undefined, preload: PortfolioScreen.preload },
    { id: 'insurance', title: 'Insurance', icon: <ShieldIcon />, badge: due || undefined, preload: InsuranceScreen.preload },
    { id: 'tax', title: 'Tax saving', short: 'Tax', icon: <TaxIcon />, preload: TaxScreen.preload },
  ];
  const context = useMemo(() => ({ state, dispatch, go, fundId, openFund, invest, plan }), [state, go, fundId, invest, plan]);

  return (
    <InvestContext.Provider value={context}>
      <AppFrame
        label="Invest and insure"
        screens={screens}
        current={screen}
        onSelect={go}
        toolbar={
          <>
            <p className="ii-brand">
              <span className="ii-brand-name">Punji Invest</span>
              <span className="app-muted">Sita Sharma · KYC verified · NAVs as of 1 Nov 2026</span>
            </p>
            <div className="app-toolbar-end ii-switch">
              <span id="ii-fail-label" className="app-small">
                Fail the next request (demo)
              </span>
              <Switch labelledBy="ii-fail-label" checked={state.fail} onChange={(fail) => dispatch({ type: 'fail', fail })} testId="ii-fail" />
            </div>
          </>
        }
      >
        {screen === 'funds' && <FundsScreen />}
        {screen === 'sip' && <SipScreen />}
        {screen === 'portfolio' && <PortfolioScreen />}
        {screen === 'insurance' && <InsuranceScreen />}
        {screen === 'tax' && <TaxScreen />}
      </AppFrame>
      <p className="kit-sr" role="status" aria-live="polite">
        {state.notice}
      </p>
    </InvestContext.Provider>
  );
}
