---
'@punji/ui': minor
---

Portfolio and investment compositions, props only and with no fetching: `HoldingsTable`, `PortfolioAllocation`, `PortfolioOverview`, `DividendHistory` and `TransactionHistory`, with the pure `@punji/ui/portfolio` helpers `holdingsSummary` (exact bigint holdings from positions and quotes, null for a missing quote), `sortHoldings`, `holdingsToCsv`, `allocateHoldings` (Other bucketing, shares that add up to 100), `transactionLedger` (per-sale realised P&L), `filterTransactions`, `positionsFromTransactions`, `dividendsByFiscalYear` (Nepal fiscal years) and `dividendEntriesFromTransactions`. `DataTable` gains an optional `footer` totals row. Each component has a subpath export; styles are in `styles.css`. See docs/PORTFOLIO.md.
