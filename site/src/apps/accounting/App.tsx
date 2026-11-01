import { useMemo, useReducer } from 'react';
import { useHotkeys } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, type FrameScreen } from '../shared/kit.tsx';
import { BankIcon, ClockIcon, ExportIcon, HomeIcon, JournalIcon, LedgerIcon, ScaleIcon, StatementIcon, TaxIcon } from '../shared/icons.tsx';
import { COMPANY } from '../shared/books.ts';
import { Dashboard } from './Dashboard.tsx';
import { AcctContext, derive, initialState, reducer, type Screen } from './store.ts';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import '../shared/app.css';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import './accounting.css';

// An accounting and ERP app for one Nepali company: the dashboard renders on the server; the ledger, journal entry,
// trial balance, statements, bank reconciliation, aging, TDS and exports load on demand.
const LedgerScreen = lazyScreen(() => import('./LedgerScreen.tsx'), 'The ledger');
const JournalScreen = lazyScreen(() => import('./JournalScreen.tsx'), 'Journal entry');
const TrialScreen = lazyScreen(() => import('./TrialScreen.tsx'), 'The trial balance');
const StatementsScreen = lazyScreen(() => import('./StatementsScreen.tsx'), 'The statements');
const BankScreen = lazyScreen(() => import('./BankScreen.tsx'), 'Bank reconciliation');
const AgingScreen = lazyScreen(() => import('./AgingScreen.tsx'), 'Aging');
const TdsScreen = lazyScreen(() => import('./TdsScreen.tsx'), 'The TDS summary');
const ExportsScreen = lazyScreen(() => import('./ExportsScreen.tsx'), 'Exports');

const IDS: readonly Screen[] = ['dashboard', 'ledger', 'journal', 'trial', 'statements', 'bank', 'aging', 'tds', 'exports'];

export default function AccountingApp() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [screen, go] = useScreen(IDS, 'dashboard');
  const derived = useMemo(() => derive(state), [state]);
  useHotkeys(IDS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })));
  const unmatched = derived.bankItems.length - state.matches.reduce((n, m) => n + m.ledgerIds.length, 0);
  const screens: FrameScreen<Screen>[] = [
    { id: 'dashboard', title: 'Dashboard', short: 'Home', icon: <HomeIcon /> },
    { id: 'ledger', title: 'Accounts and ledger', short: 'Ledger', icon: <LedgerIcon />, preload: LedgerScreen.preload },
    { id: 'journal', title: 'Journal entry', short: 'Journal', icon: <JournalIcon />, preload: JournalScreen.preload },
    { id: 'trial', title: 'Trial balance', short: 'Trial', icon: <ScaleIcon />, preload: TrialScreen.preload },
    { id: 'statements', title: 'P&L and balance sheet', short: 'P&L', icon: <StatementIcon />, preload: StatementsScreen.preload },
    { id: 'bank', title: 'Bank reconciliation', short: 'Bank', icon: <BankIcon />, badge: unmatched > 0 ? unmatched : undefined, preload: BankScreen.preload },
    { id: 'aging', title: 'Receivables and payables', short: 'Aging', icon: <ClockIcon />, preload: AgingScreen.preload },
    { id: 'tds', title: 'TDS summary', short: 'TDS', icon: <TaxIcon />, preload: TdsScreen.preload },
    { id: 'exports', title: 'Exports', short: 'Export', icon: <ExportIcon />, preload: ExportsScreen.preload },
  ];
  const context = useMemo(() => ({ state, derived, dispatch, go }), [state, derived, go]);

  return (
    <AcctContext.Provider value={context}>
      <div className="ac-app">
        <AppFrame
          label="Accounting"
          screens={screens}
          current={screen}
          onSelect={go}
          toolbar={
            <>
              <p className="ac-company">
                <strong>{COMPANY.name}</strong> <span>PAN {COMPANY.pan}</span>
              </p>
              <p className="app-toolbar-end app-muted app-small">15 Kartik 2083 (1 Nov 2026) · FY 2083/84</p>
            </>
          }
        >
          {screen === 'dashboard' && <Dashboard />}
          {screen === 'ledger' && <LedgerScreen />}
          {screen === 'journal' && <JournalScreen />}
          {screen === 'trial' && <TrialScreen />}
          {screen === 'statements' && <StatementsScreen />}
          {screen === 'bank' && <BankScreen />}
          {screen === 'aging' && <AgingScreen />}
          {screen === 'tds' && <TdsScreen />}
          {screen === 'exports' && <ExportsScreen />}
        </AppFrame>
      </div>
      <p className="kit-sr" role="status" aria-live="polite">
        {state.notice}
      </p>
    </AcctContext.Provider>
  );
}
