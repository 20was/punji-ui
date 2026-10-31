---
'@punji/ui': minor
---

Accounting display components and exact ledger helpers, currency-agnostic and with no tax or jurisdiction logic: `DebitCredit`, `LedgerTable`, `JournalEntryView`, `TrialBalance`, `StatementTable`, `PaymentStatus` and `FinancialPeriodSelector` (with `nepalFiscalYearPeriods`, `nepalFiscalQuarterPeriods`, `nepalFiscalMonthPeriods`), plus the pure `@punji/ui/ledger` module (`isBalanced`, `journalTotals`, `runningBalance`, `accountBalance`, `trialBalance`, `rollUp`, `findRollUpMismatches`, `ledgerToCsv`). All amounts are bigint minor units; invalid amounts throw. StatementTable never sums a subtotal for you and warns in development when a given subtotal disagrees with `rollUp`. See docs/ACCOUNTING.md. The check-pack unpacked budget rises from 810 to 890 KiB and the Everything and styles.css size budgets by about 6 kB and 0.7 kB gzip.
