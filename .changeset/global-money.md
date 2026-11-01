---
'@punji/ui': minor
---

Global money. `createMoneyFormatter` takes `grouping` (`locale`, `south-asian` or `western`, so PKR or any locale can use lakh/crore) and `exponent` (for ISO minor units where CLDR differs); lakh/crore detection now reads what Intl prints (bn-BD, ta-LK); `formatCompact` rounds once from the exact decimal string instead of a float. `parseMoney`, `parseLocalizedDecimal` and `parseNumber` accept the digits of 18 scripts (Devanagari, Bengali, Thai, Arabic-Indic, Persian, Gujarati, Tamil and more), with `DIGIT_SCRIPTS`, `toAsciiDigits` and `toScriptDigits` exported. New lazy subpath `@punji/ui/money/iso4217`: active ISO 4217 codes, numeric codes, minor units and `currencyName`. The amount-in-words helpers in `@punji/ui/tax` also spell international numbering (`system: 'international'`: thousand, million, billion), can print the fraction as figures (`fractionAsDigits`), and `currencyAmountInWords` names any currency's units.
