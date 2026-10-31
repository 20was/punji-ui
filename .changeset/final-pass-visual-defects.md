---
"@punji/ui": patch
---

Fix layout defects found by the extended visual gate and the new docs-site layout check: `StockTable` stacked rows (LTP clipped at the card edge, rows flush to the box border, the trend head misaligned with its lines, no scrolling with `maxHeight` under 640px), `Watchlist` trend lines now line up in one column, `LedgerTable` stacked description without the reference column, and `MarketHeatmap` tile labels now end in an ellipsis instead of being cut off.
