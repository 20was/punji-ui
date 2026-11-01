import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import * as fc from 'fast-check';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  ReconciliationMatcher, matchDifference, reconciliationSummary, suggestMatches, sumAmounts,
  type ReconcileItem, type ReconcileMatch,
} from '../src/index.ts';
import { seriousViolations } from './axe.ts';
import { NUM_RUNS } from './fc.ts';

const d = (day: number, month = 10) => ({ year: 2026, month, day });
const STATEMENT: ReconcileItem[] = [
  { id: 's1', date: d(3), description: 'Receipt Everest Stores', reference: 'RV-101', amount: 1_130_000n },
  { id: 's2', date: d(5), description: 'Cheque 000412', reference: 'CHQ-412', amount: -250_000n },
  { id: 's3', date: d(8), description: 'Rent October', amount: -13_500_000n },
  { id: 's4', date: d(30), description: 'Bank charges', amount: -50_000n },
  { id: 's5', date: d(31), description: 'Interest credited', amount: 120_000n },
];
const LEDGER: ReconcileItem[] = [
  { id: 'l1', date: d(2), description: 'Everest Stores receipt', reference: 'RV-101', amount: 1_130_000n },
  { id: 'l2', date: d(4), description: 'Stationery cheque', reference: 'CHQ-412', amount: -250_000n },
  { id: 'l3a', date: d(8), description: 'Rent, net of TDS', amount: -13_000_000n },
  { id: 'l3b', date: d(8), description: 'Rent, TDS adjustment', amount: -500_000n },
  { id: 'l6', date: d(29), description: 'Cheque 000418 not cleared', reference: 'CHQ-418', amount: -400_000n },
  { id: 'l7', date: d(31), description: 'Deposit in transit', amount: 2_000_000n },
];

describe('reconcile helpers', () => {
  it('suggests one-to-one matches by exact amount, reference first, within the window', () => {
    const suggestions = suggestMatches(STATEMENT, LEDGER);
    expect(suggestions.map((m) => [m.statementIds, m.ledgerIds])).toEqual([[['s1'], ['l1']], [['s2'], ['l2']]]);
    expect(suggestMatches(STATEMENT, LEDGER, { dateWindow: 0 })).toEqual([]);
    expect(suggestMatches(STATEMENT, LEDGER, { matched: [{ id: 'x', statementIds: ['s1'], ledgerIds: ['l1'] }] }).map((m) => m.id)).toEqual(['auto-s2']);
    expect(() => suggestMatches(STATEMENT, LEDGER, { dateWindow: -1 })).toThrow(RangeError);
  });

  it('writes the reconciliation statement exactly', () => {
    const matches: ReconcileMatch[] = [
      { id: 'a', statementIds: ['s1'], ledgerIds: ['l1'] },
      { id: 'b', statementIds: ['s2'], ledgerIds: ['l2'] },
      { id: 'c', statementIds: ['s3'], ledgerIds: ['l3a', 'l3b'] },
    ];
    expect(matchDifference(STATEMENT, LEDGER, matches[2]!)).toBe(0n);
    const ledgerBalance = 50_000_000n;
    // The bank has not seen the deposit in transit or cheque 418; the books have not seen charges or interest.
    const statementBalance = ledgerBalance - 2_000_000n + 400_000n - 50_000n + 120_000n;
    const s = reconciliationSummary({ statement: STATEMENT, ledger: LEDGER, matches, statementBalance, ledgerBalance });
    expect(s.depositsInTransit).toBe(2_000_000n);
    expect(s.outstandingPayments).toBe(400_000n);
    expect(s.unrecordedReceipts).toBe(120_000n);
    expect(s.unrecordedPayments).toBe(50_000n);
    expect(s.adjustedStatement).toBe(s.adjustedLedger);
    expect(s.reconciled).toBe(true);
    expect(reconciliationSummary({ statement: STATEMENT, ledger: LEDGER, matches, statementBalance: statementBalance + 1n, ledgerBalance }).difference).toBe(1n);
  });

  it('flags an unbalanced match, an id used twice and a non-bigint amount', () => {
    const off = reconciliationSummary({ statement: STATEMENT, ledger: LEDGER, matches: [{ id: 'x', statementIds: ['s3'], ledgerIds: ['l3a'] }], statementBalance: 0n, ledgerBalance: 0n });
    expect(off.unbalancedMatches).toEqual(['x']);
    expect(off.reconciled).toBe(false);
    expect(() => reconciliationSummary({ statement: STATEMENT, ledger: LEDGER, matches: [{ id: 'x', statementIds: ['s1'], ledgerIds: ['l1'] }, { id: 'y', statementIds: ['s1'], ledgerIds: ['l2'] }], statementBalance: 0n, ledgerBalance: 0n })).toThrow(RangeError);
    expect(() => matchDifference(STATEMENT, LEDGER, { statementIds: ['nope'], ledgerIds: [] })).toThrow(RangeError);
    expect(() => sumAmounts([{ id: 'z', amount: 1 as unknown as bigint }])).toThrow(TypeError);
  });

  it('always reconciles when every line is matched to its own copy', () => {
    fc.assert(fc.property(fc.array(fc.bigInt({ min: -(10n ** 12n), max: 10n ** 12n }), { maxLength: 30 }), fc.bigInt({ min: -(10n ** 12n), max: 10n ** 12n }), (amounts, balance) => {
      const items = amounts.map((amount, i) => ({ id: `i${i}`, date: d(1 + (i % 28)), amount }));
      const matches = suggestMatches(items, items, { dateWindow: 0 });
      expect(matches.length).toBe(items.length);
      const s = reconciliationSummary({ statement: items, ledger: items, matches, statementBalance: balance, ledgerBalance: balance });
      expect(s.reconciled).toBe(true);
    }), { numRuns: Math.min(NUM_RUNS, 200) });
  });
});

function Harness({ onBook }: { onBook?: (item: ReconcileItem) => void }) {
  const [matches, setMatches] = useState<ReconcileMatch[]>([]);
  const ledgerBalance = 50_000_000n;
  return (
    <ReconciliationMatcher
      statement={STATEMENT}
      ledger={LEDGER}
      matches={matches}
      onMatchesChange={setMatches}
      statementBalance={ledgerBalance - 2_000_000n + 400_000n - 50_000n + 120_000n}
      ledgerBalance={ledgerBalance}
      onCreateEntry={onBook}
      testId="rm"
    />
  );
}

describe('ReconciliationMatcher', () => {
  it('matches many-to-one when the totals agree, undoes it, and reconciles with suggestions', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    expect(await seriousViolations(container)).toEqual([]);
    await user.click(screen.getByTestId('rm-s-s3'));
    await user.click(screen.getByTestId('rm-l-l3a'));
    expect(screen.getByTestId('rm-difference').textContent).toContain('5,000.00');
    await user.click(screen.getByTestId('rm-match'));
    expect(screen.getByRole('status').textContent).toMatch(/Select at least one line/);
    expect(screen.getByText('Nothing matched yet.', { exact: false })).toBeTruthy();
    await user.click(screen.getByTestId('rm-l-l3b'));
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(screen.getByRole('status').textContent).toBe('Matched 1 statement line with 2 ledger entries.');
    expect(screen.queryByTestId('rm-s-s3')).toBeNull();
    expect(screen.getByTestId('rm-matches').textContent).toContain('Rent October');
    await user.click(screen.getByTestId('rm-unmatch-m-s3'));
    expect(screen.getByTestId('rm-s-s3')).toBeTruthy();
    await user.click(screen.getByTestId('rm-auto'));
    expect(screen.getByRole('status').textContent).toBe('2 suggestions accepted.');
    // The rent is on both sides, unticked, so the statement already agrees; a paisa more on the bank side would not.
    expect(screen.getByText(/Reconciled/)).toBeTruthy();
    await user.click(screen.getByTestId('rm-s-s3'));
    await user.click(screen.getByTestId('rm-l-l3a'));
    await user.click(screen.getByTestId('rm-l-l3b'));
    await user.click(screen.getByTestId('rm-match'));
    expect(screen.getByTestId('rm-adjusted-statement').textContent).toBe(screen.getByTestId('rm-adjusted-ledger').textContent);
    expect(screen.getByText(/Reconciled/)).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('offers to book a statement-only line, and its scroll regions are focusable', async () => {
    const onBook = vi.fn<(item: ReconcileItem) => void>();
    const user = userEvent.setup();
    render(<Harness onBook={onBook} />);
    await user.click(screen.getByRole('button', { name: 'Book: Bank charges' }));
    expect(onBook).toHaveBeenCalledWith(STATEMENT[3]);
    const lists = document.querySelectorAll('.pu-recon-list');
    expect(lists).toHaveLength(2);
    for (const list of lists) expect(list.getAttribute('tabindex')).toBe('0');
  });

  it('shows loading, error and invalid states', async () => {
    const onRetry = vi.fn<() => void>();
    const user = userEvent.setup();
    const { rerender } = render(<ReconciliationMatcher statement={[]} ledger={[]} matches={[]} onMatchesChange={() => {}} state="loading" />);
    expect(screen.getByRole('status').textContent).toBe('Loading the statement…');
    rerender(<ReconciliationMatcher statement={[]} ledger={[]} matches={[]} onMatchesChange={() => {}} state="error" onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    rerender(<ReconciliationMatcher statement={[STATEMENT[0]!, STATEMENT[0]!]} ledger={[]} matches={[]} onMatchesChange={() => {}} />);
    expect(screen.getByRole('alert').textContent).toMatch(/id used twice/);
    rerender(<ReconciliationMatcher statement={[]} ledger={[]} matches={[]} onMatchesChange={() => {}} />);
    expect(screen.getAllByText('Every line is matched.')).toHaveLength(2);
  });
});
