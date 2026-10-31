---
"@punji/ui": minor
---

Add ten components migrated from Punji Web, each with a subpath export, stylesheet and size budget: `RetryNote`, `MeterBar`/`RangeBar`/`ShareBar`/`ShareLegend`/`ShareDonut`/`DistributionBar` (`meter`), `SummaryFigure`, `StatusDisc`/`CheckList`/`CheckRow` (`check-row`), `InlineState`, `KeyStats`, `FactList`, `StepList`, `CardLink` and `LinkTable`/`LinkTableRow`/`StockLabel`. Link-capable components use the `linkComponent` adapter and never import a router. New tokens (both themes): `--pu-color-chart`, `--pu-color-track`, `--pu-color-series-4` to `-12`, and `--pu-color-inverse-*`. The `.kit-inv` inverse tone now has CSS, so `Card tone="inverse"` renders its inverse surface. See `docs/COMPONENTS.md`.
