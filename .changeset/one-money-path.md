---
"@punji/ui": minor
---

One money path: new `Money` value type (`money`, `isMoney`, `isSameCurrency`, `addMoney`, `subtractMoney`, `CurrencyCode`); `Figure` and `Delta` accept a `Money` value and an optional `formatter` and print it through `createMoneyFormatter`. `kind: 'rs'` and `compactRs` are deprecated (behaviour unchanged) in favour of the money formatter. Chart price props document their en-IN NPR default.
