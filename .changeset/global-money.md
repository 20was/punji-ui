---
'@punji/ui': minor
---

Global money: `createMoneyFormatter` takes `grouping` (`locale`, `south-asian` or `western`, so PKR or any locale can use lakh/crore) and `exponent` (ISO minor units where CLDR differs); lakh/crore detection now reads what Intl prints (bn-BD, ta-LK); `formatCompact` rounds once from the exact decimal string instead of a float. Input accepts digits of 18 scripts (`DIGIT_SCRIPTS`, `toAsciiDigits`, `toScriptDigits`: Bengali, Thai, Arabic-Indic, Persian, Gujarati, Tamil and more) in `parseMoney`, `parseLocalizedDecimal` and `parseNumber`. New lazy subpath `@punji/ui/money/iso4217` (active ISO 4217 codes, numeric codes, minor units, `currencyName`). `integerInWords`/`amountInWords` take `system: 'international'` and `fractionAsDigits`; new `currencyAmountInWords` for any currency. The docs site now publishes `/components.json`, a machine-readable manifest of every component (imports, props, examples, accessibility notes), linked from llms.txt.
