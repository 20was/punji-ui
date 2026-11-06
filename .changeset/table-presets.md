---
"@punji/ui": minor
---

Table presets (beta): new `@punji/ui/table-presets` subpath with typed `ColumnDef[]` factories for holdings, stock quotes, ledger, bank statement, receivables aging and trial balance (`holdingsColumns`, `stockQuoteColumns`, `ledgerColumns`, `statementColumns`, `agingColumns`, `trialBalanceColumns`). Cells are formatted from exact bigint minor units, money columns total with a `sum` aggregate, and every head is replaceable through `labels`. `toFinancialColumns` (also in `@punji/ui/table-core`) turns a `ColumnDef[]` into the columns `FinancialTable` and `VirtualFinancialTable` take. The grouping, subtotals, totals and reconciliation engine the two tables use is now importable as `tableTotals` from `@punji/ui/table-totals`; the tables behave as before.