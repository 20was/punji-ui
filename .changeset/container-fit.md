---
'@punji/ui': patch
---

Components now fit the space they are given, not the screen. `PortfolioAllocation` and `ShareBar` legends choose their columns from their container, so sector names stay readable in a 350px card. `StatGrid` and `FinancialSummary` switch from two to `cols` columns at 520px of their own width. `TrialBalance` and `JournalEntryView` tighten their cells, and `LedgerTable` stacks each entry into a card, when their container is under 340px. `MetricTile` figures shrink with the row's width and wrap as a last resort instead of overflowing on phones. `Tile` draws five-letter symbols (NABIL). New: `PageHeader` `headingLevel` (1 to 6, default 1) for headers embedded in a page that has its own h1, and a `stacked` `Button` (icon over a short centred label) for quick-action tiles. `PerformanceChart` documents and tests that only a series with missing data breaks its line.
