---
"@punji/ui": minor
---

Add seven more components migrated from Punji Web, each with a subpath export, stylesheet and size budget: `HeadlineFigure`/`FigureChip` (in `summary-figure`), `SplitBar`/`DivergingBar`/`NetBar`/`NetBarHead` (`bars`), `Sparkline`, `ColumnChart`/`ColumnLegend` (`column-chart`, stacked columns with negative, empty, all-zero, constant and outlier handling and a visually hidden data table), `Breakdown`/`BreakdownRow`, `Pagination` and `MetricTile`/`MetricRow` (`metric-tile`). `Pagination` and `DataTable`'s footer now share one clamped, one-based model with `usePagination`: new `pageOfIndex` and `tablePagination` helpers, and `DataTable` clamps an out-of-range `pageIndex` instead of printing it. No new tokens. See `docs/COMPONENTS.md`.
