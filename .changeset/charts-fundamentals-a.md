---
'@punji/ui': minor
---

Add three beta fundamentals charts, each on `ChartA11yShell`. `@punji/ui/score-radar`: `ScoreRadar`, 3 to 8 caller-supplied scores (0 to a maximum per axis) as one shape coloured by the total on a low, middle and high token scale, with every score and the total printed and spoken, an optional dashed comparison shape, axis names that wrap instead of colliding down to 280px, and optional axis selection (`selected`, `defaultSelected`, `onSelectedChange`). `@punji/ui/fair-value-bar`: `FairValueBar`, a price against a fair value with configurable undervalued and overvalued zones and the gap printed as an exact signed percentage and a word, from decimal strings or `Money` in bigint. `@punji/ui/price-target-chart`: `PriceTargetChart`, a price history with analyst low, average and high targets fanning to a future date, spread labels that never collide and exact decimals. The scores, fair values and targets come from the app.
