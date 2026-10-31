# Banking and payments display components

Six display components and a pure module for banking and wallet screens: `AccountNumber`, `BankAccountCard`,
`TransactionList` (with `TransactionRow` and `TransactionStatus`), `PaymentReceipt`, `PaymentTimeline` and
`BeneficiarySelector`, with `@punji/ui/banking` (`maskAccountNumber`, `formatAccountNumber`, `isValidIban`,
`formatTransactionReference`, `formatTimestamp`, `transactionsToCsv`, ...). Each component has a subpath
(`@punji/ui/account-number`, ...); all styles are in `@punji/ui/css/banking.css` (and `styles.css`).

**What this is not.** These are display components. They are not a payments SDK, a transfer form, a bank or wallet
integration or a fraud control. Nothing here submits money, calls a network, holds a session, knows a bank, a
country's account-number length or a payment scheme, or applies a limit or a fee. Bank and wallet names ("NIC Asia
Bank", "eSewa") in the examples are display strings in invented data; the library carries no list of institutions.
Currency is any ISO 4217 code (default NPR with lakh/crore grouping via `nepalMoneyPreset`).

## The security boundary

1. **Client-side validation and masking never replace server-side checks.** A browser can be edited by anyone. The
   server must authenticate the user, authorise each account and payee, validate every amount, fee, limit and status,
   and decide what a number's full value is shown to whom. `isValidIban` and the mask are conveniences for the reader,
   not controls.
2. **Masking is display-only.** `maskAccountNumber` hides characters on screen. The full number is still in your
   props and JavaScript memory because you passed it in. Fetch it on demand and authorise on the server; do not
   rely on the mask.
3. **A masked number is never in the DOM.** `AccountNumber`, `BankAccountCard`, `PaymentReceipt` and
   `BeneficiarySelector` render only the last digits (at most `visible`, never more than half the number). The full
   number is not in text, `title`, `aria-label`, `data-*`, `value` or `id` attributes. The tests assert this on
   `container.innerHTML`. Once the reader reveals it, it is ordinary page text: visible to screen sharing and the
   accessibility tree.
4. **Reveal is explicit and short.** The toggle is a real button with `aria-pressed`. It hides again after
   `autoHideMs` (default 30 s) and whenever the tab becomes hidden. `onRevealedChange(true | false)` is the place to
   write an audit event; it never receives the number.
5. **Copying is opt-in and explicit.** `copyable` adds a button; the clipboard is touched only inside that button's
   click (`useClipboard`), never on mount, hover, focus or reveal. The **clipboard privacy trade-off**: a copied
   account number stays on the system clipboard until something replaces it, readable by other apps and by
   clipboard-history tools, and this package cannot clear it. Offer copy only where the reader expects the number to
   leave the app.
6. **Untrusted text stays text.** Counterparty, reference, category and notes are escaped by React. References also
   lose control, zero-width and bidirectional characters (`formatTransactionReference`). `transactionsToCsv` goes
   through `toCsv`, so a cell starting with `=`, `+`, `-`, `@`, tab or CR gets a leading apostrophe (formula
   neutralisation stays on). That reduces spreadsheet risk; it does not replace validating stored data on the server.
7. **Time is an instant in a named zone.** `PaymentReceipt` and `PaymentTimeline` print timestamps in the zone you
   give (`Asia/Kathmandu` by default) and include the zone name. An ISO string with no offset is refused (shown as a
   dash) because it would be read in the host's zone. Ledger-style entry dates (`TransactionList`) are calendar dates
   and are never read in the host's time zone.
8. **Receipts and QR codes.** The QR slot renders what you pass; the package has no QR encoder and adds no
   dependency. Generate the payload on the server, and never put a full account number in it unless the payee must
   have it.

## Numeric contract

Amounts are `bigint` minor units (paisa, cents), like the rest of the package ([FINANCIAL.md](FINANCIAL.md)).
`BankTransaction.amount` is signed from the account holder's view: negative is money out (debit, "Dr"), positive is
money in (credit, "Cr"). Balances are the figures the bank states; nothing sums a page of rows.
`PaymentReceipt` shows the `total` you pass, or `amount + fees` in exact bigint arithmetic when you omit it; compare
it with the server's.

## Helpers (`@punji/ui/banking`)

| Function | Notes |
| --- | --- |
| `maskAccountNumber(value, { visible = 4, groupSize, maskChar, separator })` | Drops separators, keeps the last `visible` characters, never more than half the number ("1234" gives "••34"), keeps the length, returns '' for empty or non-string input. |
| `accountNumberTail(value, visible)` | The last characters under the same cap. |
| `formatAccountNumber(value, { groupSize = 4, separator })` | Display grouping of the full number. |
| `spokenAccountNumber(value, groupSize)` | "0 1 2 3, 4 5 6 7" for screen readers. |
| `isValidIban(value)`, `formatIban(value)`, `normalizeIban(value)` | Generic ISO 13616 shape (two letters, two digits, 15 to 34 characters) and ISO 7064 mod-97. It knows no country or per-country length. Passing means no typing slip, not that the account exists. |
| `formatTransactionReference(value, { groupSize, maxLength })` | Strips control and bidirectional characters, collapses whitespace, shortens from the middle. |
| `formatTimestamp(instant, { timeZone, locale, parts })` | `{ text, iso }` or `null`. Unknown zone falls back to UTC (named in the text). |
| `transactionsToCsv(transactions, { currency, balance, headers, ...CsvOptions })` | Exact decimal amounts, ISO dates, direction in words. |

## AccountNumber

**Use** for an account or wallet identifier in a card, a receipt or a settings row. **Do not use** to protect a
secret: it is a display nicety (see above).

Props: `value`, `label`, `visible` (4), `groupSize` (4), `revealable` (true), `autoHideMs` (30000; 0 or `null` to
keep it shown), `copyable` (false), `onRevealedChange`, `labels`, `className`, `testId`.

Keyboard: Tab to the eye button, Enter or Space toggles; Tab to copy, Enter or Space copies.
A11y: the visible mask is `aria-hidden`; the spoken text is "Account number: ending in 2 3 4 5". The toggle keeps one
name and shows state with `aria-pressed`. Copy results are announced in a polite status region.

## BankAccountCard

**Use** for an accounts overview or an account header. **Do not use** to compute a balance or decide a status.

Props: `institution`, `holder`, `accountNumber`, `accountType`, `balance`, `money`, `status` (`active` | `frozen` |
`closed`, each with a distinct icon and words), `balanceToggle`, `defaultBalanceHidden` (true with the toggle),
`numberProps`, `actions`, `loading`, `error`, `onRetry`, `headingLevel` (3), `labels`.

While the balance is hidden the amount is not in the DOM. A missing balance is a dash with a spoken "No value",
never zero. Keyboard: the number and balance buttons are Tab stops. A11y: a section named by its heading; facts are
a description list; loading is `aria-busy` with a status; an error is an alert.

## TransactionList

**Use** for an account statement or wallet history. **Do not use** for a ledger with debit and credit columns
(`LedgerTable`) or when you need sorting, selection or resizing (`DataTable`).

Props: `transactions`, `calendar` (`'ad'` or `'bs'`, BS covers 1975 to 2099), `language` (`'en'` | `'ne'`), `money`,
`showBalance`, `showCompletedStatus`, `pageSize`, `page` / `onPageChange`, `loading`, `error`, `onRetry`, `labels`,
`statusLabels`. Consecutive entries with the same `date` share an `h3` heading; the list does not sort.
Rows are `<li>` with the entry `id` as the key (and `data-tx-id`), so a page change keeps rows stable. For very long
lists render `TransactionRow` inside your own virtualiser; row height is roughly constant (56 px minimum).

Direction is never colour alone: an arrow, "Dr" or "Cr", and the spoken words "debit" or "credit". Failed and
reversed amounts are struck through and muted. Only pending, failed and reversed entries show a status pill unless
`showCompletedStatus` is set. Paging uses `Pagination` (one-based).

## PaymentReceipt

**Use** for a confirmation or receipt page the reader can print. Props: `amount`, `fees`, `total`, `money`, `from`,
`to` (`{ name, institution, accountNumber }`, masked), `reference` (with a copy button), `timestamp`, `timeZone`,
`locale`, `status`, `note`, `qr`, `qrLabel`, `printable`, `labels`, `headingLevel`. Print CSS removes the buttons and
background and avoids a page break inside the receipt. Printing calls `window.print()` only when the Print button is
pressed.

## PaymentTimeline

**Use** under a receipt or on a payment detail page. Props: `steps` (`{ id, label, state, timestamp, detail }`
where `state` is `complete`, `current`, `upcoming`, `failed` or `reversed`), `label`, `timeZone`, `locale`,
`stateLabels`. An ordered list; the current step has `aria-current="step"`; each state is words plus a distinct icon.
The component never advances a step: your server owns the state.

## BeneficiarySelector

**Use** as the "pay to" field of a flow you build; it only chooses. Props: `beneficiaries`, `value`, `onChange`,
`label`, `visible`, `loading`, `error`, `labels`. Groups: favourites, recent, then the rest. Filtering is in memory
over name, nickname and institution (not account numbers), so pass tens of payees, not tens of thousands; search on the
server for more.

Keyboard: focus opens the list; typing filters; Down/Up move (wrapping); Home/End jump; Enter chooses; Escape closes;
Tab moves on. A11y: `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` and
`aria-activedescendant`; groups are `role="group"`; masked numbers are `aria-hidden` and read as "account ending in".
It reuses the package's combobox conventions but not `CompanySearch` itself, which is tied to stock symbols.

## Testing

`test/banking.test.ts` covers the pure helpers (including property tests that masking never reveals more than asked).
`test/banking-components.test.tsx` asserts on `container.innerHTML` that the full number never appears while masked,
that the clipboard is touched only on the button press, keyboard behaviour, states and axe. The visual gate has nine
fixtures (`test/visual/fixtures-banking.tsx`) and two browser interaction tests.
