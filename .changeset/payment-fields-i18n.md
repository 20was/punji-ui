---
'@punji/ui': minor
---

Global payment-field kit and a locale layer for component copy.

`@punji/ui/payments` (pure): `parseIban` (per-country structure from the SWIFT registry, mod-97), `parseCardNumber` (IIN brand ranges, lengths, grouping, Luhn), `parseCardExpiry`, `parseCardCvc`, `parseBic`, `parseIfsc`, `parseUpiVpa` (reads pasted `upi://` links), `parseSortCode`, `parseUkAccountNumber`, `parseAbaRouting` (check digit) and `parseNepalBankAccount` (per-bank rules you supply), with `maskCardNumber`, `detectCardBrand`, `ibanCheckDigits` and replaceable `CARD_BRANDS` and `IBAN_FORMATS`. Every check accepts spaces, dashes and Devanagari or other scripts' digits, removes invisible characters and reports it.

`@punji/ui/payment-fields`: `IbanInput`, `CardNumberInput`, `CardExpiryInput`, `CardCvcInput`, `BicInput`, `IfscInput`, `UpiInput` (flags look-alikes of saved payees), `SortCodeInput`, `UkAccountNumberInput`, `AbaRoutingInput` and `NepalBankAccountInput`: grouping as you type with the caret kept, the right `inputmode` and `autocomplete`, polite announcements, and card data kept out of DOM attributes and server HTML. Styles in `css/payment-fields.css`.

`@punji/ui/locale`: `PunjiLocaleProvider`, `useLocaleMessages`, `mergeMessages`, `localAmountInWords` and typed `PunjiMessages`, with Nepali, Hindi and Bengali packs on `@punji/ui/locale/ne`, `/hi` and `/bn` (machine-drafted, need native review; not on the root export). The trust kit, `DataTable`, `Pagination`, `Calendar`, `DatePicker`, `IdNumberInput` and `PanInput` read the provider; their own props still win. `amountInWords` takes a new `minusWord` option. Size budgets for the touched subpaths rise by the locale hook (about 60 to 110 B gzip each); Everything to 182.74 kB, styles.css to 39.84 kB, pack cap 2414 KiB.
