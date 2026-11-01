import { useMemo, useReducer } from 'react';
import { MoneyDisplay } from '@punji/ui/money-display';
import { useHotkeys } from '@punji/ui/use-hotkeys';
import { AppFrame, lazyScreen, useScreen, type FrameScreen } from '../shared/kit.tsx';
import { CalculatorIcon, InvoiceIcon, JournalIcon, PayrollIcon, PeopleIcon, ReceiptIcon } from '../shared/icons.tsx';
import { COMPANY, npr } from '../shared/books.ts';
import { InvoicesScreen } from './InvoicesScreen.tsx';
import { BizContext, derive, initialState, reducer, type Screen } from './store.ts';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import '../shared/app.css';
// oxlint-disable-next-line import/no-unassigned-import -- the app's layout styles
import './business.css';

// Billing and payroll for the same company as the accounting app: the invoice list renders on the server; writing an
// invoice, customers, payments, the payroll run and the tax calculator load on demand.
const CreateScreen = lazyScreen(() => import('./CreateScreen.tsx'), 'The invoice editor');
const CustomersScreen = lazyScreen(() => import('./CustomersScreen.tsx'), 'Customers');
const PaymentsScreen = lazyScreen(() => import('./PaymentsScreen.tsx'), 'Payments');
const PayrollScreen = lazyScreen(() => import('./PayrollScreen.tsx'), 'Payroll');
const TaxScreen = lazyScreen(() => import('./TaxScreen.tsx'), 'The income tax calculator');

const IDS: readonly Screen[] = ['invoices', 'create', 'customers', 'payments', 'payroll', 'tax'];

export default function BusinessApp() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [screen, go] = useScreen(IDS, 'invoices');
  const derived = useMemo(() => derive(state), [state]);
  useHotkeys([...IDS.map((id, i) => ({ keys: String(i + 1), handler: () => go(id) })), { keys: 'n', handler: () => go('create') }]);
  const overdue = derived.rows.filter((r) => r.status === 'overdue').length;
  const screens: FrameScreen<Screen>[] = [
    { id: 'invoices', title: 'Invoices', icon: <InvoiceIcon />, badge: overdue || undefined },
    { id: 'create', title: 'New invoice', short: 'New', icon: <JournalIcon />, preload: CreateScreen.preload },
    { id: 'customers', title: 'Customers', icon: <PeopleIcon />, preload: CustomersScreen.preload },
    { id: 'payments', title: 'Payments received', short: 'Payments', icon: <ReceiptIcon />, preload: PaymentsScreen.preload },
    { id: 'payroll', title: 'Payroll', icon: <PayrollIcon />, preload: PayrollScreen.preload },
    { id: 'tax', title: 'Income tax', short: 'Tax', icon: <CalculatorIcon />, preload: TaxScreen.preload },
  ];
  const context = useMemo(() => ({ state, derived, dispatch, go }), [state, derived, go]);

  return (
    <BizContext.Provider value={context}>
      <AppFrame
        label="Billing and payroll"
        screens={screens}
        current={screen}
        onSelect={go}
        toolbar={
          <>
            <p className="bz-company">
              <strong>{COMPANY.name}</strong> <span>PAN/VAT {COMPANY.pan}</span>
            </p>
            <p className="app-toolbar-end bz-mini">
              <span>Outstanding</span> <MoneyDisplay value={derived.outstanding} preset={npr} testId="bz-outstanding-toolbar" />
            </p>
          </>
        }
      >
        {screen === 'invoices' && <InvoicesScreen />}
        {screen === 'create' && <CreateScreen />}
        {screen === 'customers' && <CustomersScreen />}
        {screen === 'payments' && <PaymentsScreen />}
        {screen === 'payroll' && <PayrollScreen />}
        {screen === 'tax' && <TaxScreen />}
      </AppFrame>
      <p className="kit-sr" role="status" aria-live="polite">
        {state.notice}
      </p>
    </BizContext.Provider>
  );
}
