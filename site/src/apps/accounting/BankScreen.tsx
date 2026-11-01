import { useEffect, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { ReconciliationMatcher } from '@punji/ui/reconciliation-matcher';
import { ScreenTitle } from '../shared/kit.tsx';
import { COMPANY, rs, shortDate } from '../shared/books.ts';
import { BOOKS, useAcct } from './store.ts';

/** The Ashwin 2083 statement from NIC Asia Bank against the bank account in the books: match, book the charges the
 *  books do not have, and read the reconciliation statement. */
export default function BankScreen() {
  const { state, derived, dispatch } = useAcct();
  const { statement } = BOOKS;
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(id);
  }, [loading]);
  return (
    <div className="app-stack">
      <ScreenTitle
        aside={
          <Button size="sm" variant="secondary" onClick={() => setLoading(true)} loading={loading} testId="ac-bank-refresh">
            Fetch the statement again
          </Button>
        }
      >
        Bank reconciliation
      </ScreenTitle>
      <Card
        title={`${statement.month.label}: ${COMPANY.bank}`}
        description={`${shortDate(statement.month.start!)} to ${shortDate(statement.month.end!)}. Opening ${rs(statement.opening)}, closing ${rs(statement.closing)} per the bank. Tick lines that agree on both sides, or accept the exact-amount suggestions.`}
        headingLevel={3}
      >
        <ReconciliationMatcher
          statement={statement.lines}
          ledger={derived.bankItems}
          matches={state.matches}
          onMatchesChange={(matches) => dispatch({ type: 'matches', matches })}
          statementBalance={statement.closing}
          ledgerBalance={derived.bankAtStatement}
          onCreateEntry={(item) => dispatch({ type: 'book', item })}
          formatDate={shortDate}
          headingLevel={4}
          state={loading ? 'loading' : 'ready'}
          labels={{ statement: 'NIC Asia Bank statement', ledger: 'Bank account in the books (1010)' }}
          newMatchId={(s) => `m-${s[0]}-${state.matches.length + 1}`}
          testId="ac-recon"
        />
      </Card>
    </div>
  );
}
