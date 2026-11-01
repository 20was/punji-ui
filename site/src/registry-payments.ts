// Pages for the global payment-field kit: the inputs (IbanInput, CardNumberInput and the rest) and the pure checks
// behind them. Kept apart from registry.ts so they merge cleanly with pages added in parallel. Pure data (no JSX).
import type { ApiRef, PageDef } from './registry.ts';

const ui = (module: string, ...names: string[]): ApiRef[] => names.map((name) => ({ name, module }));

export const PAYMENT_PAGES: readonly PageDef[] = [
  {
    slug: 'payment-fields',
    title: 'Payment fields',
    group: 'banking',
    kind: 'component',
    description: 'React inputs for IBAN, card number, expiry and CVC, SWIFT/BIC, IFSC, UPI ID, UK sort code, US routing and Nepal bank accounts: checked, grouped, paste-safe.',
    lead: 'IBAN, card, SWIFT, IFSC, UPI, sort code, ABA and Nepal account fields that group as you type, accept any paste and catch typing slips.',
    summary:
      'Eleven inputs for the identifiers people type when they pay or get paid. Each accepts a paste with spaces, dashes or Devanagari and other scripts\' digits, removes invisible characters (and says so), groups the text the way it is printed, keeps the caret in place, and sets the right `inputmode` and `autocomplete` (`cc-number`, `cc-exp`, `cc-csc` for cards). Problems are explained once the field is left; validity and what was detected (card network, IBAN country) are announced politely. The card number and security code are never written to a DOM attribute, even on the server, and a valid card number shows as "•••• 4242" when the field is not focused. `UpiInput` flags an address that looks like a saved payee\'s without being it, with the same check as `TransferReview`.',
    use: [
      'Payee and beneficiary forms: `IbanInput` with `BicInput` for international transfers, `SortCodeInput` with `UkAccountNumberInput`, `AbaRoutingInput`, `IfscInput`, `NepalBankAccountInput`.',
      'Card forms you host yourself, inside your PCI DSS scope: `CardNumberInput` with `CardExpiryInput` and `CardCvcInput` (pass the detected `brand` so the code length follows it).',
      '`UpiInput` with `knownPayees` set to the person\'s saved UPI IDs.',
      '`NepalBankAccountInput` with a `rule` per bank, from your own bank list.',
    ],
    avoid: [
      'Treating a valid check as a verified account. It catches typing slips; the bank, the scheme or Confirmation of Payee says whether the account exists and whose it is.',
      'Card fields outside your PCI scope: if your provider offers hosted fields, use them.',
      'Logging `onValueChange` results for card fields.',
    ],
    api: [
      ...ui('payment-fields', 'IbanInput', 'CardNumberInput', 'CardExpiryInput', 'CardCvcInput', 'BicInput', 'IfscInput', 'UpiInput', 'SortCodeInput', 'UkAccountNumberInput', 'AbaRoutingInput', 'NepalBankAccountInput'),
      ...ui('payment-fields', 'PaymentFieldProps', 'CardNumberInputProps', 'CardCvcInputProps', 'UkAccountNumberInputProps', 'UpiInputProps', 'NepalBankAccountInputProps', 'PaymentFieldMessages', 'PAYMENT_FIELD_MESSAGES', 'PAYMENT_FIELD_NAMES'),
    ],
    examples: [
      { id: 'international', title: 'IBAN and SWIFT/BIC', note: 'Paste "GB82 WEST 1234 5698 7654 32": grouped, country announced, mod-97 checked.' },
      { id: 'card', title: 'Card number, expiry and code', note: 'Amex groups 4-6-5 and needs a 4-digit code. Leave the field to see the masked number.' },
      { id: 'india', title: 'UPI ID and IFSC', note: 'Paste a upi:// link. "paypa1@ybl" looks like the saved "paypal@ybl", so it is flagged.' },
      { id: 'uk-us', title: 'UK sort code, account and US routing number', note: 'Sort codes group as 12-34-56; the routing number\'s check digit is tested.' },
      { id: 'nepal', title: 'Nepal bank account', note: 'A per-bank rule you supply, shown in Devanagari digits; the stored value is ASCII.' },
    ],
    keyboard: ['Standard text input. A typed character that can never belong (a letter in a sort code, a 17th card digit) is refused and the caret stays put; a paste is always accepted and then checked.'],
    accessibility: [
      'A real label, hint and error tied with `aria-describedby`; `aria-invalid` once a problem is shown.',
      'One polite live region per field announces validity, the detected network or country, removed hidden characters and the problem when the field is left. Errors are not alerts; only the look-alike payee warning is.',
      'The card network badge is decorative; its name is announced.',
    ],
    responsive: ['Full width of their container. The badge sits inside the field and truncates rather than overflowing.'],
    notes: {
      title: 'Security boundary',
      points: [
        'Card number and security code reach the input\'s `value` property only, never its attribute (CSS attribute selectors could read it), and are left out of server-rendered HTML. The components never log.',
        'Nothing here stores, tokenises or sends card data. Your PCI DSS obligations are unchanged.',
        'Nepal account rules are yours to supply: banks change formats, and the package ships no bank\'s format as fact.',
      ],
    },
    related: ['payment-validation', 'secure-field', 'transfer-review', 'beneficiary-selector', 'localisation'],
  },
  {
    slug: 'payment-validation',
    title: 'Payment validation',
    navTitle: 'Payment checks',
    group: 'banking',
    kind: 'utility',
    description: 'Pure TypeScript checks for IBAN mod-97, card Luhn and brand by IIN range, expiry, SWIFT/BIC, IFSC, UPI, UK sort code, ABA routing and Nepal accounts.',
    lead: 'The checks behind the payment fields, usable on the server: IBAN mod-97, Luhn, IIN brand ranges, ABA check digit, BIC, IFSC and UPI.',
    summary:
      'Pure functions with no React and no browser globals, so the same checks run in the browser and on your server. Every parser accepts pasted text (spaces, dashes, any script\'s digits, invisible characters removed) and returns `{ state, value, display, reason, cleaned }`: `state` is empty, partial, valid or invalid; `value` is the canonical text to store; `display` is the grouped text to show. IBANs are checked against the per-country structure from the SWIFT registry and mod-97; cards by IIN range, length and Luhn, with a masked form that never shows more than four digits; expiry against a `today` you can pass; ABA routing numbers by their weighted check digit. Brand and country tables are data you can replace.',
    use: ['Server-side validation of the same fields, with the same answers as the inputs.', '`maskCardNumber` for receipts and saved-card lists.', '`CARD_BRANDS` and `IBAN_FORMATS` extended with your own entries when a scheme changes, without waiting for a release.'],
    avoid: ['Using a valid result as proof the account exists.', 'Checking card numbers outside your PCI DSS scope.'],
    api: [
      ...ui('payments', 'parseIban', 'formatIbanGroups', 'ibanLength', 'ibanCheckDigits', 'IBAN_FORMATS', 'parseCardNumber', 'detectCardBrand', 'formatCardNumber', 'maskCardNumber', 'parseCardExpiry', 'parseCardCvc', 'CARD_BRANDS', 'luhnValid'),
      ...ui('payments', 'parseBic', 'isCountryCode', 'parseIfsc', 'parseUpiVpa', 'parseSortCode', 'parseUkAccountNumber', 'parseAbaRouting', 'abaChecksumValid', 'parseNepalBankAccount', 'NEPAL_BANK_ACCOUNT_DEFAULT', 'compactPaymentInput', 'mod97'),
      ...ui('payments', 'PaymentCheck', 'PaymentState', 'PaymentReason', 'IbanCheck', 'CardBrand', 'CardNumberCheck', 'CardExpiryCheck', 'BicCheck', 'UpiCheck', 'NepalBankAccountRule', 'NepalBankAccountCheck'),
    ],
    examples: [{ id: 'checks', title: 'Each check', note: 'Pasted, mistyped and Devanagari inputs, with the state, reason and display.' }],
    keyboard: ['Not interactive: pure functions.'],
    accessibility: ['Map `reason` to a sentence in the reader\'s language; `PAYMENT_FIELD_MESSAGES` and the locale packs have one for each.'],
    responsive: ['Not applicable: pure functions.'],
    notes: {
      title: 'Limits',
      points: [
        'UK account numbers are not modulus-checked against the sort code (that needs Pay.UK\'s weight tables); use Confirmation of Payee.',
        'RuPay shares IIN ranges with Discover (65) and JCB (353, 356), which report as Discover or JCB. UnionPay numbers are not Luhn-checked.',
        'IFSC and UPI checks are shape only: there is no public check digit.',
      ],
    },
    related: ['payment-fields', 'banking-helpers', 'kyc-helpers'],
  },
];
