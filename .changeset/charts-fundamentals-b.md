---
'@punji/ui': minor
---

Three beta statement charts on `ChartA11yShell`, every amount exact (`bigint` minor units or decimal strings), each with a sign, a shape and a word for every gain and loss:

- `SankeyChart` (`@punji/ui/sankey-chart`): a generic `nodes` and `links` flow with widths proportional to the exact amounts (layout on bigint ratios, rounded only at pixel output), each node labelled with its amount and share of a base node, a profit or loss with a triangle and the word, and a stacked list of the same flows at narrow widths so labels never collide. `incomeStatementFlow` builds the revenue sources, revenue, cost of revenue, operating expenses, tax and net income (or net loss) flow with every node balanced in bigint; `sankeyModel` gives the exact totals.
- `EarningsChart` (`@punji/ui/earnings-chart`): estimate against actual per period as dots or bars, beat or miss with sign, word and surprise percent, an upcoming period with its estimate alone. Decimal strings or `Money`; `earningsRows` gives the exact rows.
- `BalanceHistoryChart` (`@punji/ui/balance-history-chart`): debt against equity over periods with optional cash and a labelled debt-to-equity line. `balanceRows` gives the exact rows.
