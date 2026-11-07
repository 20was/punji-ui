---
'@punji/ui': minor
---

Market primitives, to bring the library to parity with the punji-web kit (all `beta`, every amount exact `bigint` minor units):

- `MarketStatus` gains the `offline` state (its own icon and word; `MarketState` and `MarketStatusLabels` gain the key), an optional `index` slot for the market's index value and published change (arrow, sign and a spoken word, drawn outside the live status region) and `changeLabels`. `marketSessionSentence(session, options)` builds the one-line story ("Closed for Dashain · prices of 16 Oct · opens Wed 21 Oct, 11:00") from `getMarketSession` and a schedule. Existing uses render unchanged.
- `InstrumentHeader` (`@punji/ui/instrument-header`): symbol, name, price and change from `PriceChange`, for stocks and, with `figure`, indexes.
- `BrokerBadge` (`@punji/ui/broker-badge`), `HeadlineList` (`@punji/ui/headline-list`) and `displayCompanyName` (`@punji/ui/format`, beside `shortCompanyName`).
- `RatingScale` (`@punji/ui/rating-scale`), `RatingChip` (`@punji/ui/rating-chip`) and `RatingChangeRow`, `RatingChangeList`, `RatingChangeHead` (`@punji/ui/rating-change-row`): an N-step scale with a `from` step, `scaleBucket` for its tints.
- `MonthStrip` (`@punji/ui/month-strip`) and `BarList` (`@punji/ui/bar-list`, bar lengths exact for bigint amounts).
- Price alerts: `alertDistance` and `alertCloseness` (`@punji/ui/alert-distance`), `alertTarget` (`@punji/ui/alert-target`), `AlertRow` with `AlertRowCompact`, `AlertRowSkeleton`, `AlertListEmpty` and `AlertRowList` (`@punji/ui/alert-row`), and `AlertSummary` (`@punji/ui/alert-summary`).
