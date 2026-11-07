import { useCallback, useMemo, useState } from 'react';
import { useHotkeys } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, type FrameScreen } from '../shared/kit.tsx';
import { HistoryIcon, StatementIcon } from '../shared/icons.tsx';
import { StatementScreen } from './StatementScreen.tsx';
import { MONTHS, checkStatement, declaredOf, statementOf, stepMonth } from './statements.ts';
import { SCREENS, StatementsContext, type Screen, type View } from './store.ts';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import '../shared/app.css';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout and print styles
import './statements.css';

// Monthly account statements: the statement renders on the server; the archive loads when first opened. Printing
// uses the browser's print dialog and the @media print rules in statements.css.
const ArchiveScreen = lazyScreen(() => import('./ArchiveScreen.tsx'), 'The archive');

export default function AccountStatements() {
  const [view, setViewState] = useState<View>({ holderId: 'savings', monthId: MONTHS.at(-1)!.id, drift: false });
  const [notice, say] = useState('');
  const [screen, go] = useScreen(SCREENS, 'statement');
  const setView = useCallback((next: Partial<View>) => setViewState((v) => ({ ...v, ...next })), []);
  const statement = statementOf(view.holderId, view.monthId);
  const reconciled = checkStatement(statement, declaredOf(statement, view.drift)).reconciled;
  const print = useCallback(() => {
    if (!reconciled) return say('Not printed: the statement does not reconcile.');
    if (screen !== 'statement') go('statement');
    say('Opening the print dialog.');
    // Wait one frame so the statement is on screen before the browser lays out the page.
    requestAnimationFrame(() => window.print());
  }, [reconciled, screen, go]);
  useHotkeys([
    ...SCREENS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })),
    { keys: 'p', handler: print },
    { keys: '[', handler: () => setView({ monthId: stepMonth(view.monthId, -1) }) },
    { keys: ']', handler: () => setView({ monthId: stepMonth(view.monthId, 1) }) },
  ]);
  const screens: FrameScreen<Screen>[] = [
    { id: 'statement', title: 'Statement', short: 'Statement', icon: <StatementIcon /> },
    { id: 'archive', title: 'All statements', short: 'Archive', icon: <HistoryIcon />, preload: ArchiveScreen.preload },
  ];
  const context = useMemo(() => ({ view, setView, go, say }), [view, setView, go]);

  return (
    <StatementsContext.Provider value={context}>
      <AppFrame
        label="Statements"
        screens={screens}
        current={screen}
        onSelect={go}
        toolbar={
          <>
            <p className="st-who">
              <strong>{statement.holder.name}</strong> <span>{statement.holder.product} {statement.holder.account}</span>
            </p>
            <p className="app-toolbar-end app-muted app-small">{statement.month.label}</p>
          </>
        }
      >
        {screen === 'statement' && <StatementScreen onPrint={print} />}
        {screen === 'archive' && <ArchiveScreen />}
      </AppFrame>
      <p className="kit-sr" role="status" aria-live="polite">
        {notice}
      </p>
    </StatementsContext.Provider>
  );
}
