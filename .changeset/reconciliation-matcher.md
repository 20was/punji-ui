---
'@punji/ui': minor
---

Bank reconciliation. New component `ReconciliationMatcher` (`@punji/ui/reconciliation-matcher`): bank statement lines
beside ledger entries, matched one-to-one, one-to-many or many-to-many when they agree to the paisa, exact-amount
suggestions within a date window, undo, a "Book" action for statement-only lines, and the reconciliation statement
(balance per bank plus deposits in transit less outstanding payments, against balance per books plus unrecorded
receipts less unrecorded charges). Pure helpers on the same subpath: `suggestMatches`, `reconciliationSummary`,
`matchDifference` and `sumAmounts`, all signed bigint minor units. Styles in `css/reconciliation.css`.
