---
"@punji/ui": minor
---

Add currency-generic money: `@punji/ui/money` (exact bigint minor-unit formatting and parsing for any currency, display-rounded lakh/crore or K/M/B compact, `nepalMoneyConfig` preset), plus `MoneyDisplay`, `PriceChange` (sign, arrow and spoken direction; green-up or red-up) and `CurrencyInput` (live locale grouping, Devanagari digits, per-currency precision, exact string and minor-unit output). `PriceField` now honours a caller's `inputMode`. No new dependency.
