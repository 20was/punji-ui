---
'@punji/ui': minor
---

Add `FxRateDisplay` and exact FX helpers from `@punji/ui/fx-rate` (beta): the `FxRate` type (a decimal-string rate with time, source and buy/sell/mid kind), `convertMoney` (bigint-only, explicit rounding, honours each currency's minor-unit exponent), `invertRate`, `invertFxRate`, `parseFxRate`, `isValidFxRate` and `formatFxRate`. The component prints "1 USD = NPR 133.40" with its time and source, as a single rate, an exact inverse or a buy and sell pair, and speaks it with currency names. Words come from the new `fxRate` locale messages.
