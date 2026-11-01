# Share issues and corporate actions

Seven components and a pure module for depository, broker and investor apps in Nepal: browsing open issues,
applying for one, checking allotment across a family's BOIDs, showing a demat account, following book-close and
AGM dates, and confirming an EDIS transfer. Each component has its own subpath; all styles are in
`@punji/ui/css/share-issues.css` (and `styles.css`).

| Component | Subpath | Built on |
|---|---|---|
| `IssueCard`, `IssueList` | `@punji/ui/issue-card` | `StatusPill`, `MoneyDisplay`, `ChipRow`, `EmptyState` |
| `ApplyIssueForm` | `@punji/ui/apply-issue-form` | `NumberField` (steppers), `Field`, `Checkbox`, `OtpInput`, `Button`, `MoneyDisplay` |
| `BoidInput` | `@punji/ui/boid-input` | `Field` |
| `AllotmentChecker` | `@punji/ui/allotment-checker` | `Select`, `Checkbox`, `TextAreaField`, `StatusPill`, `RetryNote` |
| `DematAccountCard` | `@punji/ui/demat-account-card` | `StatusPill`, `Skeleton`, `RetryNote` |
| `CorporateActionTimeline` | `@punji/ui/corporate-action-timeline` | (own list, like `PaymentTimeline`) |
| `EdisConfirmation` | `@punji/ui/edis-confirmation` | `Checkbox`, `OtpInput`, `Button` |
| pure helpers | `@punji/ui/share-issues` | `calculations/rounding` only |

Dates in the components are printed in Bikram Sambat with the Gregorian date beside them (`primaryCalendar="ad"`
swaps the order); `language="ne"` and `digits="deva"` give Nepali month names and Devanagari digits. The BS
conversion lives in the components, so `@punji/ui/share-issues` stays free of the calendar converter (about 3 kB
gzip). Sample data: `fixtures/share-issues-data.ts` (invented companies and BOIDs), shared by the site, the tests and
the visual fixtures.

**What this is not.** Nothing here calls CDSC, a registrar, a bank or a broker, holds a session, or stores a PIN.
Every check is a convenience for the reader before anything is sent; your server and the depository check the
application, the BOID, the PIN, the CRN and every amount again. Eligibility (reserved tranches, one application per
person), extended or cancelled issues and fee rules are your data.

## Numeric contract

- Money is `bigint` paisa: `pricePerUnit`, the amount to block (`issueAmount(kitta, price)`), right prices, cash
  dividends, costs. Units (kitta) are `bigint`. Percentages are decimal strings (`'12.5'` is 12.5%), or a ratio
  `{ offered, held }` for an entitlement. Nothing passes through a float.
- Every step that can leave a fraction takes a `RoundingMode`: entitled units default to `'floor'` (fractional
  units are not issued), prices and WACC to `'half-even'`.
- Dates are Gregorian `YYYY-MM-DD` civil days, never read in the host time zone. Pass `today` from your server's
  business day so the status, the days left and the timeline agree between server and browser.

## Helpers (`@punji/ui/share-issues`)

| Function | Notes |
|---|---|
| `issueStatus(issue, today)` | `'upcoming'`, `'open'`, `'closing-today'` (the last day) or `'closed'`. Throws on a malformed date or a close before the open. |
| `sortIssues(issues, today)` | Open first (closing soonest first), then upcoming (opening soonest), then closed (most recent). Stable, returns a new array. |
| `parseKitta(text)` | Devanagari digits, spaces and grouping commas accepted; `null` for anything but a whole number. |
| `checkKitta(input, rules)` | `{ ok: true, kitta }` or `{ ok: false, problem }` with `empty`, `invalid`, `below-min`, `above-max`, `not-multiple`. The multiple rule is `kitta % multiple === 0` (default 10; `1n` for none). `kittaRulesOf(issue)` builds the rules; `kittaMessage(problem, rules)` is the English sentence. |
| `nearestValidKitta(kitta, rules)` | The closest kitta that meets the rules (ties go down), or `null` when none exists. |
| `checkBoid(text, { prefix })` | 16 digits after Devanagari conversion and dropping spaces and hyphens; the prefix defaults to CDSC's `130` (`null` checks the length only). Problems: `empty`, `invalid-character`, `too-short`, `too-long`, `prefix`, with the digit count. |
| `boidParts(boid)` | `dpId` (first 8), `dpCode` (DP ID without the 3-digit depository prefix), `clientId` (last 8). |
| `formatBoid(boid, { style, mask, visible })` | `'split'` ("13013700 00012345", default), `'groups'` of four, or `'plain'`; masking keeps at most 8 digits. `spokenBoid` reads blocks of four. |
| `entitledUnits(quantity, entitlement, rounding)` | Bonus or right units on a holding. |
| `adjustedPrice({ price, bonus, right, rightPrice, cashDividend, rounding })` | `(price − cash + right% × rightPrice) / (1 + bonus% + right%)`, exact until one rounding. `rightPrice` defaults to Rs 100; `cashDividend` defaults to zero (the bonus-and-right formula); pass it only if your rule deducts cash. |
| `costBasisSteps(start, actions, options)` | Average cost through `buy` (total paid, fees in), `sell` (removes the average cost of the units sold), `bonus` (units at `unitCost`, default zero; some tax computations use par) and `right` (units subscribed, default the full entitlement, at their price). Each step has units, cost, quantity, total cost and `wacc`. `costBasisAfter` gives the final position; `wacc(cost, quantity)` is the single division. |
| `corporateTimeline(events, today)` | Date order (equal dates keep input order), each with `phase` (`past`, `today`, `upcoming`), `days` from today and `next` on the first event that is today or later. Throws on a duplicate id. |

## Components

**IssueCard / IssueList.** The card names the kind and tranche, the company and symbol, the status in words with a
dot (not colour alone), the days left ("Closes in 3 days", "Last day to apply", "Closed 7 days ago"), the open and
close dates, the units on offer, the price per unit and the kitta rule. `action` is your button. `IssueList` orders by
status (or `order="given"`), shows kind chips with counts when more than one kind is present, announces the count
after a filter, renders cards in a `<ul>` grid and has an empty state. `renderAction(issue, status)` places an Apply
button only where it makes sense.

**ApplyIssueForm.** Step one: kitta (a spin button stepping by the multiple, clamped to the minimum and maximum), the
amount to block as a polite live output, bank accounts as radios (last four digits only), the CRN (prefilled from the
account until edited), the declaration. Continue shows every problem and focuses the first. Step two: a review and a
PIN (masked boxes, default 4) or a code (`verification="otp"`, default 6, with `onResend`). `onSubmit` receives
`{ issueId, kitta, amount, accountId, crn, secret }`; return a promise to stay busy. A rejected promise only ends the
busy state: report the reason through `error`. Each step's heading takes focus when the step changes.

**BoidInput.** Controlled; `onValueChange({ value, check })` where `value` is ASCII digits. Letters are refused at
input; problems appear after the field is left (or pass `error`). The hint shows the DP split once complete.

**AllotmentChecker.** Saved accounts ticked by default; pasted BOIDs one per line or comma-separated, each checked
and named by line; duplicates dropped; at most `maxBoids` (default 20). `onCheck({ issueId, boids })` resolves one
`AllotmentResult` per BOID (`allotted` with `units`, `not-allotted`, `not-applied`, `pending`, `error`); a BOID with
no answer shows "Could not check", never "Not allotted". A rejection shows a retry that repeats the request.

**DematAccountCard.** Holder, DP, BOID halves (read in blocks of four), CRN, linked bank (last four digits), status
and two renewal dates; within `warnWithinDays` (30) a pill says "Due in N days", afterwards "Expired". `maskBoid`
hides all but the last four digits. Loading and error states as on `BankAccountCard`.

**CorporateActionTimeline.** An ordered list with a mark per phase (tick, filled dot, dashed circle), the date in both
calendars, the phase and "In 7 days"; the next date has `aria-current="date"`.

**EdisConfirmation.** Sales awaiting transfer as checkboxes (all chosen at first) with contract, broker and
settlement date; the button names the exact total ("Transfer 150 units"); a declaration and the PIN complete it.
`onConfirm({ ids, units, pin })`.

## Accessibility

Real labels, fieldsets and legends; errors are announced and set `aria-invalid`; statuses and outcomes are words.
Cards are articles named by their heading (`headingLevel`). Masked numbers are hidden from assistive technology and
replaced by "account ending in 4 5 0 1". axe runs on every component in the jsdom tests; visual fixtures cover each
component in both themes (baselines are generated in the pinned Docker image, see [VISUAL-TESTING.md](VISUAL-TESTING.md)).

## Not covered

No CDSC, registrar, bank or broker integration; no captcha; no prospectus viewer; no quota or eligibility rules; no
fractional-share settlement or tax rule beyond the `unitCost` and `cashDividend` hooks; no time-weighted returns.
Native Nepali copy review is still to do: the default words are English and every one can be replaced.
