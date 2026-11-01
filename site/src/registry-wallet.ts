// Pages for the wallet and payment pieces: EMVCo merchant QR, QrCode, PaymentQrCard, AmountKeypad, PinPad and
// MobileNumberInput. Kept apart from registry.ts so they merge cleanly with pages added in parallel. Pure data (no JSX).
import type { ApiRef, PageDef } from './registry.ts';

const ui = (module: string, ...names: string[]): ApiRef[] => names.map((name) => ({ name, module }));

export const WALLET_PAGES: readonly PageDef[] = [
  {
    slug: 'emvco-qr',
    title: 'EMVCo merchant QR',
    navTitle: 'EMVCo QR',
    group: 'banking',
    kind: 'utility',
    description: 'Build and parse EMVCo merchant QR payloads (the NepalPay and Fonepay scan-to-pay format): TLV, CRC-16 check, bigint amounts, clear errors.',
    lead: 'Build the text inside a scan-to-pay code, or read a scanned one back, with an exact amount and a checked CRC.',
    summary:
      'Pure helpers for EMVCo merchant-presented QR payloads, the format behind NepalPay QR, Fonepay and most national QR schemes. `buildMerchantQr` turns typed fields into a payload with its CRC; `parseMerchantQr` checks a scanned one (structure, CRC, payload format, mandatory objects) and returns the fields, or an error code and a sentence to show. Amounts are bigint minor units. No React, no browser globals, no dependency.',
    use: [
      'A "receive money" or shop counter screen: build the payload on your server (or in the browser for a preview) and draw it with `QrCode` or `PaymentQrCard`.',
      'A scanner screen: `parseMerchantQr` on the decoded text, then show the merchant and amount for the person to confirm.',
      '`verifyMerchantQrCrc` to reject a damaged or edited code before you read it.',
    ],
    avoid: [
      'Inventing a merchant account template. The GUID and sub-fields (ids 26 to 51) come from your acquirer or switch; this module only lays them out.',
      'Trusting a parsed payload as a real merchant. A payload that parses is well formed; the payment network decides whether the merchant exists.',
    ],
    api: [...ui('emvco-qr', 'buildMerchantQr', 'parseMerchantQr', 'verifyMerchantQrCrc', 'crc16Ccitt', 'encodeTlv', 'parseTlv', 'MerchantQrInput', 'ParsedMerchantQr', 'MerchantQrParseResult')],
    examples: [
      { id: 'build', title: 'Build a payload', note: 'Change the amount: the payload, its CRC and the code change together. Leave it empty for a static code.' },
      { id: 'parse', title: 'Read a scanned payload', note: 'The EMVCo specification sample. Edit one character to see the CRC error.' },
    ],
    keyboard: ['Not interactive: pure functions.'],
    accessibility: ['The parse errors are plain sentences ("The code is damaged: its checksum does not match.") ready to show in an alert.'],
    responsive: ['Not applicable: pure functions.'],
    notes: {
      title: 'Limits',
      points: [
        'Builds the root objects 00 to 64 and lets you add 65 to 99. Lengths are counted in characters (code points) and the CRC is over UTF-8 bytes, so Nepali text in template 64 round-trips.',
        'Values longer than the specification allows (name 25, city 15, amount 13 characters) throw a RangeError instead of being cut.',
        'Currency exponents are known for NPR, INR and USD; pass `exponent` for any other three-digit code.',
      ],
    },
    related: ['qr-code', 'payment-qr-card', 'banking-helpers'],
  },
  {
    slug: 'qr-code',
    title: 'QrCode',
    group: 'banking',
    kind: 'component',
    description: 'A dependency-free QR code in one SVG path: byte mode, versions 1 to 40, four error correction levels. Dark on light in both themes; renders on the server.',
    lead: 'Draw any text as a QR code, with no dependency, in about 3 kB.',
    summary:
      'Draws text as a QR code. The encoder (`encodeQr`, also on `@punji/ui/qr-code/matrix`) implements ISO/IEC 18004 byte mode for versions 1 to 40 and levels L, M, Q and H, chooses the smallest version and the best mask, and raises the error correction when there is room. The component draws the grid as one SVG path with a 4-module quiet zone, dark on light in both themes, because many scanners cannot read an inverted code. It uses no hooks, so it renders on the server.',
    use: ['A payment code (with `PaymentQrCard` for the full screen), a link to an app, a receipt reference.', '`qrSvgPath` to draw the same grid in a canvas, a PDF or a server-rendered image.'],
    avoid: ['Light modules on a dark background. Keep `foreground` dark and `background` light.', 'Text that only the code carries: write the merchant and amount beside it too.'],
    api: [...ui('qr-code', 'QrCode', 'encodeQr', 'qrSvgPath', 'QrMatrix', 'QrEncodeOptions')],
    examples: [{ id: 'basic', title: 'Sizes and levels', note: 'The same text at levels L and H: higher error correction needs more modules.' }],
    keyboard: ['Not interactive.'],
    accessibility: ['`role="img"` with a name from `label` ("QR code to pay Himalayan Momo"). The encoded text is not read out; put the readable facts next to the code.'],
    responsive: ['`size` sets the width and height; the SVG scales down inside a narrow container. Keep a code at least about 2 cm wide on a phone.'],
    related: ['emvco-qr', 'payment-qr-card'],
  },
  {
    slug: 'payment-qr-card',
    title: 'PaymentQrCard',
    group: 'banking',
    kind: 'component',
    description: 'A scan-to-pay card that shows what its EMVCo payload says: merchant, city and amount. Refuses a damaged code, hides an expired one, and can add an amount.',
    lead: 'The receive-money screen: the code, the merchant and the amount, which can never disagree because all three come from the payload.',
    summary:
      'The "scan to pay" card for a shop counter or a "receive money" screen. It reads the EMVCo payload and shows the merchant name, city and amount from it, so the words beside the code always match the code. A payload that does not parse or fails its CRC shows an error instead of a QR nobody can pay; an expired dynamic code is hidden, not greyed. With `onAmountChange`, a static code gets an "Add amount" fallback; you build the new payload and pass it back.',
    use: [
      'A merchant or person receiving money: show their static code, or a dynamic one with the bill amount.',
      '`state="expired"` with `onRefresh` when your server issues short-lived dynamic codes.',
      '`renderQr` to draw the code with your own renderer or a server image; `actions` for share and download.',
    ],
    avoid: ['Building the payload from the props you also display: build it once (`buildMerchantQr` or your server) and pass only the payload.', 'Treating the shown amount as authoritative. The payer\'s app reads the payload; your server confirms the payment.'],
    api: [...ui('payment-qr-card', 'PaymentQrCard', 'PaymentQrCardLabels')],
    examples: [
      { id: 'static', title: 'Static code with Add amount', note: 'Add an amount: a new payload is built and the code changes. Remove it to go back to the static code.' },
      { id: 'dynamic', title: 'Dynamic bill and Nepali name', note: 'The amount is in the code. merchantName shows the Nepali name; the payload keeps the Latin one.' },
      { id: 'states', title: 'Expired, damaged, loading', note: 'An expired or damaged code is never drawn.' },
    ],
    keyboard: ['Tab reaches Add amount, Change amount, Remove amount and your actions. In the amount form, Enter shows the new code and Cancel closes it.'],
    accessibility: [
      'An `article` named by its heading. The QR image is named "QR code to pay {merchant} {amount}".',
      'Expired, damaged and error states are alerts; loading is a busy status.',
      'The amount field takes focus when the person opens it, and is a `CurrencyInput` (exact, Devanagari digits accepted).',
    ],
    responsive: ['Up to 22rem wide and centred; the QR scales down in a narrow column.'],
    notes: {
      title: 'Security boundary',
      points: [
        'The card never invents a payload: it draws exactly the string you pass, after checking its CRC.',
        'Do not put a full bank account number in a payload unless the payer must have it; the merchant account template should carry the scheme\'s merchant id.',
      ],
    },
    related: ['emvco-qr', 'qr-code', 'payment-receipt', 'amount-keypad'],
  },
  {
    slug: 'amount-keypad',
    title: 'AmountKeypad',
    group: 'banking',
    kind: 'component',
    description: 'An on-screen amount keypad for wallets: exact decimal entry in paisa, lakh and crore grouping, quick amounts, a max that refuses keys and says why.',
    lead: 'The enter-amount screen of a wallet app: big figure, exact paisa, and keys that refuse what the limit or the currency does not allow.',
    summary:
      'An on-screen number pad for send money, pay at a shop and top-up screens. It builds an exact ASCII decimal string at the currency\'s minor-unit digits and reports the amount as bigint minor units. The figure is large and grouped in lakh and crore for NPR. A key that would pass `max`, add a third decimal or overflow is refused, and the reason is announced. Quick amounts set the whole figure. It does not check a balance or a fee.',
    use: ['Phone-first amount entry where the system keyboard would cover the screen.', '`max` from your server: the balance or the per-transaction limit.', '`quickAmounts` for top-ups (Rs 100, 200, 500) and tips.'],
    avoid: ['Desktop forms: use `CurrencyInput`, which works with any keyboard.', 'Treating `max` as the check. The server checks the amount, the balance and the limit again.'],
    api: [...ui('amount-keypad', 'AmountKeypad', 'AmountKeypadChange', 'AmountKeypadLabels')],
    examples: [
      { id: 'basic', title: 'Send money', note: 'Type with the keys or your keyboard. A third decimal is refused and announced.' },
      { id: 'topup', title: 'Top-up with quick amounts and a limit', note: 'Amounts above the Rs 5,000 limit are refused; the chip above it is disabled.' },
    ],
    keyboard: [
      'The keypad is one Tab stop. Arrow keys move between keys (Up and Down by row), Home and End jump, Enter or Space presses.',
      'With focus in the keypad, digit keys (also Devanagari), the point or comma and Backspace type directly; Delete or Escape clears.',
    ],
    accessibility: [
      'The figure is an `output` with `aria-live="polite"`: after each key a screen reader hears the whole amount ("NPR 1,250.50").',
      'Refusals ("The most you can enter is NPR 5,000.00.") are a status message. The backspace key and the quick amounts have names.',
      'Keys are at least 56px tall, wider than the 44px minimum target.',
    ],
    responsive: ['Up to 22rem wide; the figure shrinks from 40px on narrow phones.'],
    related: ['mobile-number-input', 'currency-input', 'pin-pad', 'payment-qr-card'],
  },
  {
    slug: 'pin-pad',
    title: 'PinPad',
    group: 'banking',
    kind: 'component',
    description: 'A transaction PIN pad that never writes the digits to the page: dots, a spoken count, an optional crypto-random key order and a fingerprint slot.',
    lead: 'Enter a wallet MPIN on screen without the digits ever reaching the DOM, with an optional shuffled layout.',
    summary:
      'An on-screen pad for a transaction PIN (MPIN). Each digit shows as a filled dot; the digits themselves are never written to the page, not as text, a value or a hidden input, and the Tab stop never moves to the last key pressed. A screen reader hears "2 of 4 digits entered". `shuffle` draws a random key order with `crypto.getRandomValues`, against shoulder surfing and smudges; change `shuffleKey` to draw again. `onComplete` fires once with the full PIN.',
    use: ['Confirming a payment, a transfer or a top-up with the wallet PIN.', '`extraKey` for a fingerprint or face button in the empty bottom-left cell.', '`shuffle` with `shuffleKey={attempt}` after a wrong PIN.'],
    avoid: ['Login passwords or codes sent by SMS: use `OtpInput`, which supports autofill.', 'Checking the PIN in the browser. Send it to your server, clear the value and show the result.'],
    api: [...ui('pin-pad', 'PinPad', 'PinPadLabels', 'shuffleDigits')],
    examples: [
      { id: 'basic', title: 'Confirm a payment', note: 'Demo PIN 2580. A wrong PIN shows an error and clears.' },
      { id: 'shuffled', title: 'Shuffled keys and fingerprint', note: 'The order changes after each attempt. The fingerprint key is your own button.' },
    ],
    keyboard: ['One Tab stop on the first key; arrows, Home and End move. Digit keys (also Devanagari) and Backspace work while focus is in the pad; Delete or Escape clears.'],
    accessibility: ['Progress is a polite status ("3 of 4 digits entered"); the dots are hidden from screen readers. An error is an alert.', 'Digits keep their names in Devanagari mode, so the spoken key is the same in both scripts.'],
    responsive: ['Up to 20rem wide, centred; keys are at least 56px tall.'],
    notes: {
      title: 'Security boundary',
      points: [
        'The PIN lives in your state. Keep it in memory only, send it over TLS, clear it after the request, and never log it.',
        'Shuffling defeats someone watching the screen or the smudges; it does not stop malware on the device.',
      ],
    },
    related: ['otp-input', 'amount-keypad'],
  },
  {
    slug: 'mobile-number-input',
    title: 'MobileNumberInput',
    group: 'banking',
    kind: 'component',
    description: 'A Nepal mobile number field: +977 prefix, pasted country codes and Devanagari digits, 984-1234567 grouping and NTC, Ncell or SmartCell detection.',
    lead: 'Type or paste a Nepal mobile number and see the operator as soon as three digits are in, for top-ups and send-to-mobile.',
    summary:
      'A field for a Nepal mobile number. It shows +977 as a fixed prefix, accepts a pasted +977 or 00977 number, spaces, dashes and Devanagari digits, groups the digits as 984-1234567 and names the operator (NTC, Ncell, SmartCell) from the first three digits. `onValueChange` gives the state, the national digits, the E.164 form and the operator. The prefix table is data in `@punji/ui/nepal/mobile`, so a new range is a prop, not a release.',
    use: ['Mobile top-up and data packs: choose the operator\'s products from `result.operator`.', 'Wallet sign-up and "send to mobile".', '`parseNepalMobile` and `formatNepalMobile` on the server for the same rules.'],
    avoid: ['Proving a number exists or who owns it: send an OTP.', 'Landlines and other countries: this is Nepal mobile only.'],
    api: [...ui('mobile-number-input', 'MobileNumberInput'), ...ui('nepal/mobile', 'parseNepalMobile', 'normalizeNepalMobile', 'detectNepalOperator', 'formatNepalMobile', 'isValidNepalMobile', 'NEPAL_MOBILE_OPERATORS', 'MobileOperator', 'NepalMobileResult')],
    examples: [
      { id: 'basic', title: 'Top-up number', note: 'Try 9801234567, paste +977 9841234567, or type 990 to see the prefix message.' },
      { id: 'devanagari', title: 'Devanagari and a custom table', note: 'Digits shown in Devanagari; the value stays ASCII. The table adds an invented 990 range.' },
    ],
    keyboard: ['A normal text field. Letters and an 11th digit are refused; the caret stays after the same digit when the grouping changes.'],
    accessibility: [
      'A native label; hint and error use `aria-describedby`, the error is an alert and sets `aria-invalid`.',
      'The operator is announced in a polite live region ("Operator: Ncell"); the visible badge is hidden from screen readers to avoid reading it twice.',
      '`type="tel"` and `autoComplete="tel-national"` bring up the phone keypad and offer the saved number.',
    ],
    responsive: ['Fills its container; the operator badge stays inside the field.'],
    notes: {
      title: 'Limits',
      points: [
        'The prefix shows which operator the range was issued to. A ported number, if Nepal adopts number portability, keeps its old prefix; confirm with your top-up aggregator.',
        'The default table: NTC 984, 985, 986, 974, 975, 976; Ncell 980, 981, 982, 970; SmartCell 961, 962, 988. Pass `operators` to change it.',
      ],
    },
    related: ['otp-input', 'amount-keypad', 'field'],
  },
];
