# Trust and safety

Money-movement patterns that most design systems leave to each bank: reading the amount back, checking the payee's
name, deliberate friction for risky actions, session timeouts, scam warnings and secret fields. Built for the fraud
that actually happens on payment screens (authorised push payment scams, look-alike payee names, coached victims)
and for the rules that now require some of it (UK Confirmation of Payee, EU Verification of Payee since October
2025, WCAG 2.2.1 Timing Adjustable, WCAG 3.3.8 Accessible Authentication).

| Export | Subpath | What it is |
| --- | --- | --- |
| `detectSpoofing`, `skeleton`, `areConfusable` | `@punji/ui/trust` | Pure name checks after Unicode UTS #39 |
| `TransferReview`, `ConfirmAmount` | `@punji/ui/transfer-review` | The confirm step: amount in figures and words, checked recipient, changed fields |
| `PayeeVerification` | `@punji/ui/payee-verification` | Match / close match / no match / unavailable result |
| `HoldToConfirm` | `@punji/ui/hold-to-confirm` | Press-and-hold or cooling-off friction |
| `SessionTimeoutWarning` | `@punji/ui/session-timeout` | WCAG 2.2.1 sign-out warning |
| `ScamWarning`, `SCAM_SCENARIOS` | `@punji/ui/scam-warning` | Scenario-specific scam interstitial |
| `SecureField`, `secureFieldAttributes` | `@punji/ui/secure-field` | Secret inputs with the right autofill and no value in the DOM |

Styles: `@punji/ui/css/trust.css` (also in `styles.css`). The components also use `button.css`, `checkbox.css`,
`fields.css` and `overlay.css` when you import CSS per component.

**What this is not.** Nothing here decides whether a payment is fraud, verifies a payee or moves money. Your risk
engine decides when to show `ScamWarning` and `HoldToConfirm`; your bank or scheme answers the payee check; your
server re-checks amounts, payees and limits. These components make those decisions visible and hard to skip.

## Security boundary

1. **The amount is read back from the same bigint.** `ConfirmAmount` prints the figure with the exact money formatter
   and the words with `currencyAmountInWords`, both from the `amount` prop, so they cannot disagree. Words are
   automatic for English locales; pass `words` in other languages.
2. **Names are shown cleaned and checked.** `TransferReview` and `PayeeVerification` render names inside `<bdi>` after
   removing bidi controls, invisible characters and controls (`detectSpoofing(name).display`). A name with high-risk
   tricks, or one that looks like a saved payee without being it, blocks the confirm until the person ticks that
   they checked it. The custom `confirm` slot is not rendered until then.
3. **The spoofing check is a filter, not a verdict.** The confusable table is a focused subset (Cyrillic, Greek,
   Armenian, Cherokee and Latin look-alikes of Latin letters and digits), not the whole of `confusables.txt`.
   `risk: 'none'` means no known trick was found.
4. **Friction is a click away from bypass on a compromised device.** `HoldToConfirm` and the cooling-off delay stop
   accidents and give a coached person a moment; they are not authentication. Keep step-up checks on the server.
5. **Secrets stay out of the DOM.** `SecureField` pushes the value into the input's `value` property, never the
   `value` attribute that React writes for controlled inputs (CSS attribute selectors such as
   `input[value^="a"]` can read that out a character at a time). Nothing is written to data attributes, titles or
   labels, and the component never logs. Paste is allowed.
6. **The session timer only warns.** `SessionTimeoutWarning` shows what your server says (`expiresAt`); the server
   ends the session.

## Components

### detectSpoofing

`detectSpoofing(name, { known })` returns `{ risk, issues, scripts, display, skeleton, lookalikeOf? }`.

| Issue | Severity | Example |
| --- | --- | --- |
| `bidi-control` | high (overrides, isolates) / review (marks) | `Sita` + U+202E + `amrahs` |
| `invisible` | high | `Pay` + U+200B + `pal`; ZWJ/ZWNJ outside the scripts that need them |
| `control` | high | C0 and C1 controls |
| `confusable-characters` | high | Latin mixed with Cyrillic `а` (U+0430) |
| `lookalike` | high | `Paypa1` when `known` has `Paypal` |
| `whole-script-confusable` | review | `Рома`: every letter Cyrillic but Latin-looking |
| `mixed-script` | review | `Ramराम` (outside the UTS #39 highly restrictive sets) |
| `compatibility-form` | review | full-width or mathematical letters |
| `stacked-marks` | review | four or more combining marks in a row |
| `unusual-space` | review | no-break, doubled, leading or trailing spaces |

Single-script names in any script pass, and the zero-width joiner and non-joiner are accepted beside Devanagari,
Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu, Kannada, Malayalam, Sinhala, Arabic, Syriac, Mongolian, Khmer and
Myanmar letters, where spelling needs them. `skeleton(text)` folds look-alikes (NFKC, mapped to Latin, lowercased, "rn"
read as "m"); `areConfusable(a, b)` is true when two different names share a skeleton.

### TransferReview and ConfirmAmount

Props: `amount`, `currency`, `money` (locale, digits, grouping, exponent), `recipient` (`name`, `account`,
`institution`), `knownPayees`, `fee` (adds a total), `previousAmount`, `words`, `details` (`{ id, label, value,
previous?, changed? }`), `verification` (slot), `onConfirm` or `confirm` (slot), `onEdit`, `busy`, `labels`.
Changed rows say "Changed (was …)" in text. The confirm button is `aria-disabled` while blocked, so it stays
focusable.

### PayeeVerification

`result`: `'checking' | 'match' | 'close-match' | 'no-match' | 'unavailable'`, with `enteredName`, `accountName`,
`onUseAccountName`, `onEdit`, `onProceed` (leave it out to block after no match). A match is a status; the other
results are alerts. Continuing after no match or unavailable needs the acknowledgement checkbox.

### HoldToConfirm

`mode: 'hold'` (default, `holdMs` 500 to 10000, default 1500) or `'cooling-off'` (`delaySeconds` 1 to 120, default
5). Holding Space or Enter works; key repeat is ignored; releasing early cancels and is announced. Remount with a new
React `key` to start again. Offer cooling-off rather than hold where people may not be able to hold a press.

### SessionTimeoutWarning

`expiresAt` (epoch ms), `warnBefore` (at least 20000, default 120000), `onExtend`, `onSignOut`, `onExpire`. An
`alertdialog`; focus starts on "Stay signed in" and returns; Esc stays signed in; the countdown is announced on
opening and at 60, 30 and 10 seconds only.

### ScamWarning

`scenario`: `'safe-account' | 'investment' | 'impersonation' | 'purchase' | 'romance' | 'urgent-request'`, or your
own `copy` (`{ summary, questions }`). `onCancel` is the primary action; `onProceed` (optional) needs the
acknowledgement, and `coolingOffSeconds` adds a delay after it. The heading takes focus on open.

### SecureField

`kind`: `current-password`, `new-password`, `one-time-code`, `pin`, `cc-number`, `cc-csc`, `cc-exp`,
`account-number`, `secret-answer`. Sets `type`, `autocomplete`, `inputmode`, `pattern`, and turns off spellcheck,
autocorrect and autocapitalise. Masked kinds get a Show/Hide button that hides again on blur and after
`revealSeconds` (default 30). `secureFieldAttributes(kind)` returns the same attributes for your own input.

## Testing

`test/trust.test.ts` (pure helpers) and `test/trust-components.test.tsx` (behaviour, keyboard, timers and axe for
every component). The SecureField test types a password and asserts it is nowhere in `innerHTML`.
