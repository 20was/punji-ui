---
'@punji/ui': patch
---

`ListSectionHeader` with `caption` and `level={3}` now gets the caption style (it was only applied to an h2, so an h3 caption printed as a full-size heading). In a stacked `StockTable` on a phone, the change ("+48.54 (+2.31%)") wraps its percent under the amount instead of running into the volume beside it.

`TransactionHistory` now uses its own `pu-txh` classes: it shared `pu-tx` with the banking `TransactionList` row, whose flex layout (later in `styles.css`) laid the history's filters, table and pager out side by side.
