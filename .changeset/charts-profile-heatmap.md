---
'@punji/ui': minor
---

`VolumeProfile` and a grouped `MarketHeatmap` (both beta in this release's charts wave).

- `VolumeProfile` and `ProfileRail` (`@punji/ui/volume-profile`): volume at price from bars with decimal-string prices and exact `bigint` or integer-string volumes. The Point of Control, the value area (default 70%, built outward from the Point of Control one band at a time as in TradingView's Volume Profile help), VAH and VAL lines tagged in words, and an optional buy and sell split (solid against hatched). `ProfileRail` is the narrow version, cut from a `priceDomain` you pass, to sit beside a price chart on the same price scale. `volumeProfile(bars, { rows, valueArea, range })` is the pure, exact computation; the bands always add back up to the volume given.
- `MarketHeatmap` groups: give `HeatmapItem` a `group` path (sector, industry) and an optional `href` and the map becomes a nested treemap with group headers showing the size-weighted change, drill-in and drill-out with breadcrumbs (`path`, `defaultPath`, `onPathChange`), tiles as real links through `LinkProvider` or `linkComponent`, tiny tiles folded into "+N more", one tab stop with arrow-key roving, and a sorted list under `listBelow` (560px) so a phone gets legible rows. Items without `group` render exactly as before.
