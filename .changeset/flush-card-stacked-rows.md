---
'@punji/ui': patch
---

A table set flush in a Card (StockTable, FinancialTable or LedgerTable, bare or not) now keeps its stacked phone rows and totals on the card header's 16px inset, instead of letting text touch the card's borders. A flush Card also drops the border of a wrapped StockTable, FinancialTable or LedgerTable, as it already did for a bare DataTable.
