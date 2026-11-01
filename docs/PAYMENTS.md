# Payment fields

Inputs and pure checks for the identifiers people type when they pay or get paid: IBAN, card number, expiry and
security code, SWIFT/BIC, India IFSC and UPI ID, UK sort code and account number, US ABA routing number, and Nepal
bank account numbers.

| Export | Subpath | What it is |
| --- | --- | --- |
| `parseIban`, `parseCardNumber`, `parseCardExpiry`, `parseCardCvc`, `parseBic`, `parseIfsc`, `parseUpiVpa`, `parseSortCode`, `parseUkAccountNumber`, `parseAbaRouting`, `parseNepalBankAccount` | `@punji/ui/payments` | Pure checks (no React, no browser globals) |
| `detectCardBrand`, `formatCardNumber`, `maskCardNumber`, `luhnValid`, `ibanCheckDigits`, `formatIbanGroups`, `abaChecksumValid`, `compactPaymentInput` | `@punji/ui/payments` | Helpers |
| `CARD_BRANDS`, `IBAN_FORMATS`, `NEPAL_BANK_ACCOUNT_DEFAULT` | `@punji/ui/payments` | Replaceable data tables |
| `IbanInput`, `CardNumberInput`, `CardExpiryInput`, `CardCvcInput`, `BicInput`, `IfscInput`, `UpiInput`, `SortCodeInput`, `UkAccountNumberInput`, `AbaRoutingInput`, `NepalBankAccountInput` | `@punji/ui/payment-fields` | The inputs |

Styles: `@punji/ui/css/payment-fields.css` with `fields.css` (both in `styles.css`).

## The result

Every check returns `{ state, value, display, reason, cleaned }`:

- `state`: `'empty' | 'partial' | 'valid' | 'invalid'`. Partial means typing more can still make it valid.
- `value`: the canonical text to store and send (ASCII, uppercase where case does not matter, no separators).
- `display`: the grouped text to show (`GB82 WEST 1234 5698 7654 32`, `12-34-56`, `3782 822463 10005`).
- `reason`: why it is invalid (`characters`, `length`, `format`, `checksum`, `country`, `brand`, `month`,
  `expired`, `too-far`, `handle`, `provider`), else null.
- `cleaned`: true when invisible, bidi or control characters were removed from the input.

Kind-specific results add `country` and `length` (IBAN), `brand` (card), `month` and `year` (expiry), `parts`
(BIC), `handle` and `provider` (UPI) and `rule` (Nepal account).

Every check accepts pasted text: spaces, dashes, dots and slashes are dropped; digits of any script in
`DIGIT_SCRIPTS` (Devanagari, Bengali, Arabic-Indic and more) and full-width characters become ASCII; invisible
characters are removed. None of them throws.

## What each check does

| Check | Rule |
| --- | --- |
| IBAN | Country code, per-country length and BBAN structure from the SWIFT IBAN registry (85 countries in `IBAN_FORMATS`), ISO 7064 mod 97-10. A leading "IBAN" is dropped. `countries` restricts the accepted countries. |
| Card number | Brand by longest matching IIN prefix (`CARD_BRANDS`: Visa, Mastercard including 2-series, Amex, Discover, Diners, JCB, UnionPay, Maestro, RuPay, Mir), the brand's lengths and grouping, Luhn (not for UnionPay). `accept` limits brands. |
| Expiry | MM/YY, MMYY, MM/YYYY or M/YY. Valid through the end of the month, not more than `maxYears` (20) ahead. Pass `today` for stable tests and server rendering. |
| Security code | 3 digits, or the brand's `cvcLength` (4 for Amex). |
| SWIFT/BIC | 8 or 11 characters: 4 letters, an ISO 3166 country code (and XK), 2 location and an optional 3 branch characters. |
| IFSC | 4 letters, "0", 6 letters or digits. Shape only. |
| UPI ID | `handle@provider`, case-insensitive (stored lowercase); a pasted `upi://pay?pa=…` link is read for its address. ASCII only, which also refuses look-alike letters. `providers` limits the handles. |
| Sort code | 6 digits, shown as 12-34-56. |
| UK account | 8 digits; `padShort` pads 6 or 7. No sort-code modulus check (that needs Pay.UK's tables). |
| ABA routing | 9 digits, a Federal Reserve prefix (00 to 12, 21 to 32, 61 to 72, 80) and the 3-7-1 weighted check digit. |
| Nepal account | Against a `NepalBankAccountRule` you supply (`lengths`, `characters`, `pattern`, `groups`); default 8 to 20 digits. |

## The inputs

Each input takes `label`, `value` (the canonical value from the last result), `onValueChange(result)`, `hint`
(default: an example of the format), `error` (yours, replacing the built-in message), `fieldName`, `messages`,
`size`, `hideLabel`, `id`, `name`, `required`, `disabled`, `onBlur`, `className`, `testId` and `ref`, plus the
options of their check (`countries`, `accept`, `today`, `brand`, `providers`, `padShort`, `rule`).

- **Typing and paste.** A typed character that can never belong (a letter in a sort code, one digit too many) is
  refused with the caret kept in place. A paste is always accepted and then checked. Grouping is redrawn as you type
  and the caret stays after the same character.
- **Announcements.** One polite live region per field says when the value becomes complete ("IBAN complete. No
  typing slips found."), what was detected (card network, IBAN country name in the locale's language), that hidden
  characters were removed, and the problem when the field is left. Errors are shown under the field and linked with
  `aria-describedby`; they are not alerts.
- **Autofill.** `cc-number`, `cc-exp` and `cc-csc` on the card fields; `off` on bank identifiers, which have no
  autofill token. `inputmode` is `numeric` for digit-only fields, `email` for UPI (it brings up "@"), `text`
  otherwise. Spellcheck and autocorrect are off.
- **Recipient safety.** `UpiInput` takes `knownPayees`: an address that looks like a saved one without being it
  ("paypa1@ybl" next to "paypal@ybl") shows an alert, using `detectSpoofing`.

## Security boundary

1. **Card data stays out of the DOM.** `CardNumberInput` and `CardCvcInput` push the text into the input's `value`
   property only, never the attribute (React mirrors controlled values into the attribute, where CSS attribute
   selectors can read it), and render no value on the server. A valid card number shows as "•••• 4242" when the
   field is not focused (`maskWhenBlurred`, default true). Nothing logs.
2. **No PCI change.** Nothing here stores, tokenises or sends card data. If your provider offers hosted fields, use
   them; these inputs are for card forms inside your own PCI DSS scope.
3. **A valid check is not a verified account.** It means no typing slip was found. Use the bank, the scheme or
   Confirmation/Verification of Payee to confirm who holds the account.
4. **Bank data is yours.** The package ships no Nepali bank's account format as fact; pass rules from your own,
   maintained bank list.

## Localisation

Messages and field names come from `PAYMENT_FIELD_MESSAGES` and `PAYMENT_FIELD_NAMES`, overridden by a locale pack's
`paymentFields` namespace (see [LOCALISATION.md](LOCALISATION.md)) and then by the `messages` and `fieldName` props.

## Testing

`test/payments.test.ts` (registry IBAN examples for 55 countries, network test card numbers, property tests with
fast-check: computed IBAN check digits validate, every single-digit change to an IBAN, a Luhn number and an ABA
number is caught, mod-97 agrees with BigInt, masked cards never show more than four digits, no check throws) and
`test/payment-fields.test.tsx` (typing, paste, caret, announcements, autofill attributes, card number absent from the
markup and from server HTML, look-alike UPI alert, axe).
