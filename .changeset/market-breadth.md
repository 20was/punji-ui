---
'@punji/ui': minor
---

Market breadth. New component `MarketBreadth` (`@punji/ui/market-breadth`): advances, declines and unchanged as one split
bar with the counts, their shares and the advance/decline ratio in words, optional extra counts (circuit hits, 52-week
highs and lows), loading and empty states, `red-up` convention and hatched declines in forced colours. Pure helpers on the
same subpath: `breadthOf(quotes)` and `advanceDeclineRatio`. Styles in `css/market-breadth.css`.
