// The bank reconciliation page: ReconciliationMatcher and its pure helpers. Kept apart from registry.ts so it merges
// cleanly with pages added in parallel. Pure data (no JSX).
import type { ApiRef, PageDef } from './registry.ts';

const ui = (module: string, ...names: string[]): ApiRef[] => names.map((name) => ({ name, module }));

export const RECONCILIATION_PAGES: readonly PageDef[] = [
  {
    slug: 'reconciliation-matcher',
    title: 'ReconciliationMatcher',
    description: 'Bank reconciliation in React: match statement lines to ledger entries one-to-one or many-to-one, accept exact suggestions, and see the reconciliation statement.',
    lead: 'Statement lines beside ledger entries: tick, match when they agree to the paisa, and read what is left to reconcile.',
    group: 'accounting',
    kind: 'component',
    summary:
      'A bank statement beside the bank account in the books. Tick lines on both sides and match them when their totals agree exactly (one-to-one, one-to-many or many-to-many, such as a payroll paid as five transfers), accept the exact-amount suggestions within a date window (`suggestMatches`), undo a match, and read the reconciliation statement: balance per bank plus deposits in transit less outstanding payments, against balance per books plus receipts and less charges the books do not have yet (`reconciliationSummary`). Amounts are signed bigint minor units from the account holder\'s side, so money in is positive on both lists. It is controlled: you keep the matches. `onCreateEntry` puts a "Book" action on statement-only lines so you can post them.',
    use: [
      'Month-end bank reconciliation in an accounting app; card, wallet or payment-gateway settlement against the books.',
      'Keep `matches` on your server with the statement, so a reconciliation can be reopened and audited.',
    ],
    avoid: [
      'Deciding what a bank error is or posting journals itself: it reports the difference and offers the action; your books do the posting.',
      'Very long statements (thousands of lines) in one go: filter by date or amount first.',
    ],
    api: [
      ...ui('reconciliation-matcher', 'ReconciliationMatcher', 'suggestMatches', 'reconciliationSummary', 'matchDifference', 'sumAmounts', 'ReconcileItem', 'ReconcileMatch', 'ReconciliationSummary'),
    ],
    examples: [{ id: 'statement', title: 'A month\'s statement', note: 'Two exact suggestions, a rent standing order against two ledger lines, and reconciling items on both sides.' }],
    keyboard: [
      'Tab moves through the lines; Space ticks one. Ctrl+Enter or ⌘Enter anywhere in the matcher matches the ticked lines.',
      'Each list is a focusable region that scrolls with the arrow keys when it is longer than `maxHeight`.',
    ],
    accessibility: [
      'Each list and the matched list have their own heading; every line is a labelled checkbox with its date and signed amount.',
      'Matching, accepting suggestions and undoing are announced in a polite live region. "Match selected" says why when the totals differ instead of being silently disabled.',
      'Reconciled or not is said in words with the difference, not by colour alone.',
    ],
    responsive: ['The two lists sit side by side from 720px of its own width and stack below that (a container query, so it works in a narrow panel).'],
    notes: {
      title: 'Limits',
      points: [
        'Suggestions are one-to-one on exact amounts; group matches are made by hand.',
        'The statement balances are yours: pass the statement\'s closing balance and the book balance on the same date.',
      ],
    },
    related: ['ledger-table', 'journal-entry', 'transaction-list', 'statement-upload', 'accounting'],
  },
];
