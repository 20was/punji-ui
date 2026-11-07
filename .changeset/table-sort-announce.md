---
'@punji/ui': patch
---

DataTable, FinancialTable, StockTable and HoldingsTable now announce a user's sort politely to screen readers ("Sorted by Amount, ascending"), with the words overridable through `sortLabels`. Nothing is announced on mount or when the sort changes without a press.
