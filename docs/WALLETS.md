# Wallets and payments

Pieces for digital wallet and QR payment screens (the eSewa, Khalti and NepalPay/Fonepay QR kind of app), built on
the banking display components in [BANKING.md](BANKING.md):

| Export | Subpath | What it is |
| --- | --- | --- |
| `buildMerchantQr`, `parseMerchantQr`, `verifyMerchantQrCrc`, `crc16Ccitt`, `encodeTlv`, `parseTlv` | `@punji/ui/emvco-qr` | Pure EMVCo merchant-presented QR payloads |
| `encodeQr`, `qrSvgPath` | `@punji/ui/qr-code/matrix` | Pure QR Code Model 2 encoder |
| `QrCode` | `@punji/ui/qr-code` | The encoder drawn as one SVG path (also re-exports `encodeQr`, `qrSvgPath`) |
| `PaymentQrCard` | `@punji/ui/payment-qr-card` | Scan-to-pay / receive-money card |
| `AmountKeypad` | `@punji/ui/amount-keypad` | On-screen amount entry |
| `PinPad`, `shuffleDigits` | `@punji/ui/pin-pad` | Transaction PIN (MPIN) pad |
| `parseNepalMobile`, `normalizeNepalMobile`, `detectNepalOperator`, `formatNepalMobile`, `isValidNepalMobile`, `NEPAL_MOBILE_OPERATORS` | `@punji/ui/nepal/mobile` | Pure Nepal mobile number helpers |
| `MobileNumberInput` | `@punji/ui/mobile-number-input` | Nepal mobile number field with operator detection |

Styles: `@punji/ui/css/wallet.css` (also in `styles.css`). `PaymentQrCard` also needs `button.css`, `fields.css` and
`money.css` when you import CSS per component.

**What this is not.** Like the banking components, nothing here moves money, calls a network or knows an acquirer.
The merchant account template inside a QR payload (GUID, merchant id) comes from your acquirer or switch. Balances,
limits, fees, PIN checks and operator confirmation belong to your server.

## Security boundary

1. **Client checks are conveniences.** `max` on `AmountKeypad`, the CRC check and the mobile number shape guide the
   person; the server validates the amount, balance, limit, payee and number again.
2. **The PIN never reaches the DOM.** `PinPad` renders dots only: no digit text, no `value`, no hidden input. Its
   single Tab stop is always the first key, so the markup does not even record the last key pressed (the test compares
   the full markup after two different PINs). The PIN is in your state: keep it in memory, send it over TLS, clear it
   after the request, never log it.
3. **Shuffle is for onlookers.** `shuffle` uses `crypto.getRandomValues` (Fisher-Yates) and draws again when
   `shuffleKey` changes. It defeats shoulder surfing and smudge patterns, not malware on the device. The order is drawn
   after mount (keys are disabled for that first frame) so server and client markup agree.
4. **The card shows the payload, not props.** `PaymentQrCard` reads the merchant, city and amount from the payload it
   draws, so the words cannot disagree with the code. A payload that fails to parse or its CRC is not drawn; an
   expired code is hidden, not greyed.
5. **No account numbers in codes** unless the payer must have them. Use the scheme's merchant id.

## Numeric contract

Amounts are `bigint` minor units everywhere ([FINANCIAL.md](FINANCIAL.md)). `buildMerchantQr` writes them with
`minorUnitsToDecimal` at the currency exponent (NPR, INR, USD known; pass `exponent` otherwise) and refuses zero,
negative and over-13-character amounts. `parseMerchantQr` reads them with `parseMinorUnits`, which refuses excess
precision instead of rounding. `AmountKeypad` keeps an ASCII decimal string and refuses a key that would add a digit
past the exponent. No floats.

## EMVCo merchant QR (`@punji/ui/emvco-qr`)

A payload is TLV objects (two-digit id, two-digit length, value) ending with `6304` and a CRC-16/CCITT-FALSE (poly
0x1021, init 0xFFFF) over everything before the CRC value. Lengths count characters (code points); the CRC is over the
UTF-8 bytes, which is what the specification's own sample (with Chinese text in template 64, CRC `A13A`) needs and
what the tests check.

`buildMerchantQr(input)` writes, in id order: 00, 01 (static `11` without an amount, dynamic `12` with one, or your
`pointOfInitiation`), the merchant account templates, 52, 53, 54, 55 to 57 (tip), 58, 59, 60, 61, 62 (additional
data: bill number, mobile, store, loyalty, reference, customer, terminal, purpose, consumer data request), 64
(alternate language), then your `extra` objects (65 to 99), then 63. It throws `RangeError` for anything the format
cannot carry (name over 25, city over 15, a template value over 99, a payload over 512 characters).

`parseMerchantQr(text)` never throws. It returns `{ ok: true, value }` or `{ ok: false, code, message }` with `code`
one of `empty`, `malformed`, `crc`, `format`, `missing` (a mandatory object: merchant account, 52, 53, 58, 59, 60) or
`amount`. Objects may appear in any order. Template ids (26 to 51, 62, 64, 80 to 99) get `children` when their value
is TLV.

## QR encoder (`@punji/ui/qr-code/matrix`)

`encodeQr(text, { errorCorrection = 'M', minVersion, maxVersion, mask, boostErrorCorrection = true })` implements
ISO/IEC 18004 Model 2 in byte mode (UTF-8): versions 1 to 40, levels L, M, Q, H, Reed-Solomon over GF(256),
interleaving, all eight masks with the standard penalty score, format and version information. About 2.6 kB gzipped,
no dependency. Byte mode only: payment payloads mix case and punctuation, so numeric or alphanumeric segments would
save little. The tests compare whole grids bit for bit with an independent encoder (segno) across versions 1 to 39,
all four levels, multi-block codes, version information and UTF-8.

`QrCode` draws the grid as one `<path>` (runs merged) inside a light background with a 4-module quiet zone, dark on
light in both themes. It has no hooks and renders on the server. `role="img"` with `label` as its name.

## PaymentQrCard

Props: `payload`, `merchantName` (display override), `detail` (default the payload's city), `state` (`ready`,
`loading`, `expired`, `error`), `errorMessage`, `onRefresh`, `onAmountChange` (turns on Add / Change / Remove
amount), `money` (default `nepalMoneyPreset`; the payload's currency wins when known), `qrSize` (224),
`errorCorrection`, `renderQr(payload, label)`, `actions`, `footer`, `headingLevel` (3), `labels`.

The amount fallback opens a `CurrencyInput` that takes focus; "Show code" calls `onAmountChange(minor)` and you pass
back a new payload (`buildMerchantQr({ ...base, amount })`). A11y: an `article` named by its heading; the QR is named
"QR code to pay {merchant} {amount}"; expired, damaged and error states are alerts; loading is a busy status.

## AmountKeypad

Props: `value` / `onValueChange` (`{ value, minorUnits, state }`), `currency` or `preset`, `locale`,
`numberingSystem`, `label`, `max`, `maxIntegerDigits` (9), `allowDecimal`, `quickAmounts`, `digits`, `hint`,
`error`, `disabled`, `labels`.

Keyboard: one Tab stop; arrows, Home, End move between keys; digits (also Devanagari), `.` or `,`, Backspace type
while focus is in the pad; Delete or Escape clears. A11y: the figure is an `output` with `aria-live="polite"` and
speaks the full amount after each key; refusals are a status message; keys are at least 56px tall.

## PinPad

Props: `label`, `length` (4 to 8, default 4), `value` / `defaultValue` / `onChange`, `onComplete` (once, at the last
digit), `shuffle`, `shuffleKey`, `random` (test seam), `digits`, `hint`, `error`, `extraKey` (bottom-left cell),
`disabled`, `labels`.

Keyboard as AmountKeypad. A11y: progress is a polite status ("2 of 4 digits entered"), dots are hidden, an error is
an alert. Devanagari key faces keep ASCII names so the spoken key is the same in both scripts.

## Nepal mobile numbers (`@punji/ui/nepal/mobile`, `MobileNumberInput`)

`normalizeNepalMobile` converts Devanagari digits, drops spaces, dashes, dots and brackets, removes `+977`, `00977`
(or `977` before ten digits) and a leading trunk `0`. `parseNepalMobile` returns `{ state, national, e164, operator,
reason }`: `partial` while digits could still become valid, `valid` at ten digits with a known prefix, `invalid` with
`reason` `characters`, `start`, `prefix` or `length`. `formatNepalMobile` groups as `984-1234567`.

The prefix table `NEPAL_MOBILE_OPERATORS` is data: NTC 984, 985, 986, 974, 975, 976; Ncell 980, 981, 982, 970;
SmartCell 961, 962, 988. Pass `operators` (or `allowUnknownPrefix`) for a new range. A prefix shows who the range was
issued to; confirm with your top-up aggregator before you charge.

`MobileNumberInput` shows `+977` as a fixed prefix and the operator badge inside the field, refuses letters and an
11th digit, keeps the caret after the same digit when grouping changes, announces the operator in a polite live
region and explains an invalid number once the field is left (`invalidMessage` for your own words). `type="tel"`,
`autoComplete="tel-national"`.

## Testing

`test/wallet.test.ts`: CRC check value, TLV, the EMVCo specification sample, every parse error code, build round trips
(including a property test over amounts and names), QR grids against reference fingerprints, version and capacity
limits, finder and timing patterns, mobile number rules and the shuffle permutation. `test/wallet-components.test.tsx`:
rendering, keyboard, announcements, the PIN-not-in-markup check, the add-amount flow and axe. The visual gate has five
fixtures (`test/visual/fixtures-wallet.tsx`).
