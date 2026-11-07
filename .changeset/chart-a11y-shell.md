---
'@punji/ui': minor
---

Add `ChartA11yShell` and `ChartDataTable` from `@punji/ui/chart-a11y` (beta): the keyboard cursor, polite live region, spoken summary and hidden data table that the owned charts share, as one wrapper any renderer can wear. `ColumnChart`, `PerformanceChart` and `DepthChart` now use it with no change to their markup or behaviour. New beta charts built on it, with exact bigint `Money` and a sign, shape and word for every gain and loss: `WaterfallChart` (`@punji/ui/waterfall-chart`), `CashFlowChart` (`@punji/ui/cash-flow-chart`) and `NetWorthChart` (`@punji/ui/net-worth-chart`). Add `RangeSelector` (`@punji/ui/range-selector`): 1D, 1W, 1M, YTD, 1Y and All as a segmented control, with `filterByRange` and `rangeStart` to cut data to the window.
