import type { ReactNode } from 'react';
import { BankAccountCard } from '@punji/ui/bank-account-card';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { MoneyDisplay } from '@punji/ui/money-display';
import { StatusPill } from '@punji/ui/status-pill';
import { TransactionList } from '@punji/ui/transaction-list';
import { ScreenTitle } from '../shared/kit.tsx';
import { AccountsIcon, BellIcon, CardIcon, LoanIcon, ProfileIcon, TransferIcon } from '../shared/icons.tsx';
import { ACCOUNTS, BANK, HOLDER, LOAN, LOAN_EMI, npr, useBank, type Screen } from './store.ts';

/** A figure that respects "Hide balances": dots on screen, "hidden" for a screen reader. */
export function Amount({ value, hidden, testId }: { value: bigint; hidden: boolean; testId?: string }) {
  if (hidden)
    return (
      <span data-testid={testId} data-hidden="true">
        <span aria-hidden="true">Rs ••••••</span>
        <span className="kit-sr">hidden</span>
      </span>
    );
  return <MoneyDisplay value={value} preset={npr} testId={testId} />;
}

/** Balances, quick actions, what is coming up and the latest entries across accounts. */
export function Home() {
  const { state, derived, go, focusAccount } = useBank();
  const hide = state.hideBalances;
  const recent = [...state.statements.savings.slice(0, 6), ...state.statements.current.slice(0, 3)]
    .map((t, i) => ({ t, i }))
    .toSorted((a, b) => (a.t.date === b.t.date ? a.i - b.i : a.t.date < b.t.date ? 1 : -1))
    .slice(0, 5)
    .map(({ t }) => t);
  const fd = state.deposits[0];
  const actions: { id: Screen; label: string; icon: ReactNode }[] = [
    { id: 'transfer', label: 'Send money', icon: <TransferIcon /> },
    { id: 'accounts', label: 'Statements', icon: <AccountsIcon /> },
    { id: 'cards', label: 'Cards', icon: <CardIcon /> },
    { id: 'loans', label: 'Loans and FDs', icon: <LoanIcon /> },
    { id: 'profile', label: 'KYC', icon: <ProfileIcon /> },
    { id: 'alerts', label: 'Alerts', icon: <BellIcon /> },
  ];

  return (
    <div className="app-stack">
      <ScreenTitle>Namaste, Sita</ScreenTitle>
      <section className="rb-hero" aria-labelledby="rb-total-label">
        <p className="rb-hero-label" id="rb-total-label">
          Total in your accounts
        </p>
        <p className="rb-hero-value">
          <Amount value={derived.total} hidden={hide} testId="rb-total" />
        </p>
        <p className="rb-hero-sub">
          {ACCOUNTS.length} accounts · {state.offline ? 'offline, as of your last sign-in' : 'updated just now'}
        </p>
        <ul className="rb-actions" aria-label="Quick actions">
          {actions.map((a) => (
            <li key={a.id}>
              <button type="button" className="rb-action" onClick={() => go(a.id)} data-testid={`rb-action-${a.id}`}>
                <span className="rb-action-icon" aria-hidden="true">
                  {a.icon}
                </span>
                <span>{a.label}</span>
                {a.id === 'alerts' && derived.unread > 0 && <span className="rb-action-badge">{derived.unread}<span className="kit-sr"> unread</span></span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="rb-accounts">
        {ACCOUNTS.map((a) => (
          <BankAccountCard
            key={`${a.id}-${hide ? 'h' : 's'}`}
            institution={a.name}
            accountType={`${a.type}${a.rate !== '0.00' ? ` · ${a.rate}% a year` : ''}`}
            holder={HOLDER}
            accountNumber={a.number}
            balance={state.balances[a.id]}
            money={npr}
            status="active"
            balanceToggle
            defaultBalanceHidden={hide}
            numberProps={{ label: `${a.name} account number`, copyable: true, autoHideMs: 15000 }}
            actions={
              <>
                <Button size="sm" variant="secondary" onClick={() => focusAccount(a.id)} testId={`rb-statement-${a.id}`}>
                  Statement
                </Button>
                <Button size="sm" variant="ghost" onClick={() => go('transfer')}>
                  Send
                </Button>
              </>
            }
            testId={`rb-account-${a.id}`}
          />
        ))}
      </div>

      <div className="app-grid is-halves">
        <Card title="Recent activity" headingLevel={3} action={<Button size="sm" variant="ghost" onClick={() => go('accounts')}>All</Button>}>
          <TransactionList transactions={recent} labels={{ list: 'Recent activity' }} testId="rb-recent" />
        </Card>
        <Card title="Coming up" headingLevel={3}>
          <ul className="rb-upcoming">
            <li>
              <span>
                <strong>Home loan EMI</strong>
                <span className="app-muted app-small">15 Nov · from Premium Savings · {state.loanPaid} of {LOAN.months} paid</span>
              </span>
              <Amount value={LOAN_EMI} hidden={hide} />
            </li>
            {fd && (
              <li>
                <span>
                  <strong>Fixed deposit matures</strong>
                  <span className="app-muted app-small">{fd.maturityDate} · {fd.ratePercent}% for {fd.months} months</span>
                </span>
                <Amount value={fd.principal} hidden={hide} />
              </li>
            )}
            <li>
              <span>
                <strong>KYC</strong>
                <span className="app-muted app-small">{state.kyc === 'update-due' ? 'Re-verification due this month' : state.kyc === 'under-review' ? 'Submitted; we are checking it' : 'Verified'}</span>
              </span>
              <StatusPill size="sm" tone={state.kyc === 'verified' ? 'gain' : state.kyc === 'under-review' ? 'info' : 'warn'}>
                {state.kyc === 'verified' ? 'Verified' : state.kyc === 'under-review' ? 'In review' : 'Update due'}
              </StatusPill>
            </li>
          </ul>
          <div className="rb-links">
            <Button size="sm" variant="secondary" onClick={() => go('loans')}>
              Loans and deposits
            </Button>
            {state.kyc === 'update-due' && (
              <Button size="sm" variant="ghost" onClick={() => go('profile')}>
                Update KYC
              </Button>
            )}
          </div>
        </Card>
      </div>
      <p className="app-small app-muted">{BANK} is a demo bank. Names, numbers and balances are invented.</p>
    </div>
  );
}
