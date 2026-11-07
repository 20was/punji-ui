---
"@punji/ui": patch
---

Financial charts (PerformanceChart, CandlestickChart, DepthChart and the money charts) no longer overflow a narrow page for the frames between a lazy chart mounting and its first width measurement: the plot svg is capped at its container width (`max-width: 100%`).
