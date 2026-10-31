---
"@punji/ui": patch
---

Fix component defects found in the final review: `CompanySearch` no longer renders an empty `listbox` while loading or with no match (the messages sit outside it, `aria-controls` stays valid); `Watchlist` rows no longer overflow a grid parent at 320 to 390px; `StockTable` (and `TrialBalance`, `StatementTable`, `LedgerTable`) draw the retry button only when `onRetry` is given; the select-all header cell of `DataTable` and `StockTable` has a visually hidden name in every layout; `EmptyState` gains `headingLevel` (default 2); `RetryNote` keeps its button at the end of the line when the message wraps, and `LinkTable` rows in a flush `Card` line up with the title.
