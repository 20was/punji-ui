---
'@punji/ui': minor
---

Live charts are cheaper per tick. `CandlestickChart` re-checks and redraws only the candle that changed, so a tick on the forming candle at 1,000 candles commits in about 1 ms instead of 8 to 14 ms. `PerformanceChart` lists only the latest 500 dates in its hidden data table, so a 100,000-date series mounts in about 0.12 s instead of 8.4 s; the new optional `tableLimit` and `labels.truncated` (as on `CandlestickChart`) control this. `Sparkline` is memoised and stays server-safe, and `Live` caches its reduced-motion query. Measurements are in docs/PERFORMANCE.md. No API changes apart from the new optional props.
