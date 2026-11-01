# Global money and locales

The money formatter (`@punji/ui/money`) is currency-generic and exact: amounts are bigint minor units, the
integer and fraction are split with bigint, and only the sign, symbol and spacing come from Intl. This page covers
what goes beyond NPR: grouping, minor units, digit scripts, compact notation, ISO 4217 data and amounts in words.

## Grouping: lakh/crore or thousands

Grouping follows the locale (CLDR): `en-IN`, `hi`, `ne`, `bn-BD` and `ta-LK` print `12,34,567`; `en-US`, `en-PK`,
`en-LK` and `ar` print `1,234,567`. `MoneyFormatter#southAsian` is read from what Intl actually prints.

Local practice does not always match CLDR. Many Pakistani screens group in lakh and crore although CLDR's `en-PK`
does not, so `grouping` overrides the locale:

```ts
createMoneyFormatter({ currency: 'PKR', locale: 'en-PK', grouping: 'south-asian', exponent: 2 }).format(123456789n);
// 'Rs 12,34,567.89'
createMoneyFormatter({ currency: 'INR', locale: 'en-IN', grouping: 'western' }).format(123456789n);
// '₹1,234,567.89'
```

`grouping: 'south-asian'` also switches `formatCompact` to L / Cr / Arba / Kharba, and `parse` accepts the same
grouping back.

## Minor units: 0, 2, 3 (and 4)

The exponent comes from Intl: JPY 0, USD 2, KWD/BHD/OMR/JOD/TND/LYD 3. Where your ledger follows ISO 4217 and CLDR
prints fewer decimals because the coins are out of use (AFN, ALL, COP, HUF, IDR, IQD, IRR, KPW, LAK, LBP, MGA, MMK,
PKR, RSD, SOS, SYP, YER), pass `exponent`:

```ts
import { isoMinorUnits } from '@punji/ui/money/iso4217';
createMoneyFormatter({ currency: 'IQD', locale: 'en', exponent: isoMinorUnits('IQD') }).format(1234567n); // 'IQD 1,234.567'
```

## Digits of 18 scripts

Input (`parse`, `toCanonicalInput`, `parseLocalizedDecimal`, `parseNumber`, every money and number field) accepts
the decimal digits of `DIGIT_SCRIPTS`: Latin, Devanagari, Bengali, Arabic-Indic, Extended Arabic-Indic (Persian,
Urdu), Thai, Gujarati, Gurmukhi, Tamil, Telugu, Kannada, Malayalam, Odia, Myanmar, Khmer, Lao, Tibetan and
full-width. Output follows the locale or `numberingSystem`:

```ts
createMoneyFormatter({ currency: 'BDT', locale: 'bn-BD' }).format(123456789n);          // '১২,৩৪,৫৬৭.৮৯৳'
createMoneyFormatter({ currency: 'THB', locale: 'th-TH', numberingSystem: 'thai' }).format(123456789n); // '฿๑,๒๓๔,๕๖๗.๘๙'
createMoneyFormatter({ currency: 'KWD', locale: 'ar-KW' }).format(123456789n);          // Arabic-Indic digits, 3 decimals
toAsciiDigits('١٢٣ ১২৩ ๑๒๓'); // '123 123 123'
toScriptDigits('2026', 'beng'); // '২০২৬'
```

A test checks each digit set against Intl's own output for that numbering system.

## Compact notation, rounded once

`formatCompact` is display-rounded, but it rounds once, from the exact amount. South Asian grouping uses bigint
half-up rounding into L / Cr / Arba / Kharba (99.999 lakh becomes 1 Cr, not 100 L). Other locales pass the exact
decimal string to Intl's compact notation, which rounds the decimal itself, so no binary float is involved:

```ts
const usd = createMoneyFormatter({ currency: 'USD', locale: 'en' });
usd.formatCompact(99999999n);               // '$1M' (999,999.99)
usd.formatCompact(99999499n);               // '$999.99K'
usd.formatCompact(123456789012345678901n);  // '$1,234,567.89T' (beyond 2^53, still exact)
```

Never store or sum a compact figure.

## ISO 4217 data, loaded on demand

`@punji/ui/money/iso4217` (about 1.4 kB gzip) has the active currencies (List One, amendments through 2026: ZWG,
XCG, SLE in; HRK, BGN, ZWL, ANG, SLL out) with numeric codes and ISO minor units. Funds, metals and test codes are
left out. Names come from `Intl.DisplayNames` in the reader's language.

```ts
const { getIso4217, getIso4217ByNumeric, currencyName } = await import('@punji/ui/money/iso4217');
getIso4217('npr');          // { code: 'NPR', numeric: '524', minorUnits: 2 }
getIso4217ByNumeric(414);   // KWD
currencyName('NPR', 'ne');  // 'नेपाली रूपैयाँ'
```

## Amounts in words for any currency

`integerInWords` and `amountInWords` take `system: 'international'` (thousand, million, billion, trillion) beside the
default South Asian system, and `fractionAsDigits` for the cheque style "and 50/100". `currencyAmountInWords` names
the units:

```ts
currencyAmountInWords(125050n, 'USD');  // 'One Thousand Two Hundred Fifty Dollars and Fifty Cents Only'
currencyAmountInWords(1234567n, 'KWD'); // '... Dinars and Five Hundred Sixty-Seven Fils Only'
currencyAmountInWords(1050n, 'BRL');    // 'Ten Brazilian Reals and 50/100 Only'
```

NPR, INR, PKR, LKR and BDT read in lakh and crore; currencies without built-in unit words use Intl's English plural
name and a "50/100" fraction. English only; for other languages pass `numberWords` and `scaleWords`, or your own text.
