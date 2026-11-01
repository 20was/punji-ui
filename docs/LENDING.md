# Lending, deposits, KYC onboarding and remittance

Components and pure helpers for the screens Nepal's banks, finance companies, cooperatives, insurers and remittance
companies build most: loan and deposit calculators, published interest rates, the KYC onboarding flow and remittance
tracking. Each component has its own subpath (`@punji/ui/loan-calculator`, ...); all styles are in
`@punji/ui/css/lending.css` (and `styles.css`).

| Module | Subpath | What it is |
| --- | --- | --- |
| `calculateEmi`, `amortise`, `simulateDeposit`, `parsePercentRate` | `lending` | Pure, exact loan and deposit maths |
| `validatePan`, `validateCitizenshipNumber`, `validateIdNumber`, `formatPan` | `kyc` | Pure shape checks for Nepali identity numbers |
| `nepalAddressData` | `nepal-address-data` | 7 provinces, 77 districts, 753 local levels. Not on the root: loaded on demand |
| `LoanCalculator` | `loan-calculator` | EMI, totals, part-prepayment, schedule |
| `AmortisationTable` | `amortisation-table` | The schedule by month or year |
| `DepositCalculator` | `deposit-calculator` | Fixed or recurring deposit with compounding and TDS |
| `InterestRateTable` | `interest-rate-table` | Published rates with changes and AD/BS effective dates |
| `NepalAddressPicker` | `nepal-address-picker` | Province, District, Local level, Ward |
| `IdNumberInput` | `id-number-input` | PAN or citizenship number field |
| `DocumentUpload` | `document-upload` | KYC documents step with per-slot rules and previews |
| `OnboardingWizard` | `onboarding-wizard` | Multi-step form shell |
| `RemittanceTracker` | `remittance-tracker` | Control-number lookup, timeline and payout |
| `InsurancePremiumCard` | `insurance-premium-card` | One policy's premium, status and breakdown |

**What this is not.** These are estimates and display components. Nothing here prices a loan, opens an account,
verifies an identity, uploads a file or pays out money. The lender's offer letter, the bank's deposit receipt, the
insurer's schedule and the remitter's records are the figures that bind; your server validates everything again.

## Numeric contract

Money is `bigint` minor units (paisa), like the rest of the package ([FINANCIAL.md](FINANCIAL.md)). Rates are exact
percent strings (`'11.5'` is 11.5% a year; at most 6 fraction digits) parsed by `parsePercentRate` into a fraction of
two bigints. Every step that can produce a fraction takes a `RoundingMode` (`half-even`, `half-up`, `floor`, `ceil`,
`trunc`) from `@punji/ui/calculations`; nothing passes through `Number`.

### Loans (`calculateEmi`, `amortise`)

```ts
import { amortise, calculateEmi } from '@punji/ui/lending';

calculateEmi({ principal: 100_000_000n, ratePercent: '10', months: 120, rounding: 'half-up' }); // 1_321_507n (NPR 13,215.07)
calculateEmi({ principal: 250_000_000n, ratePercent: '11.5', months: 240, rounding: 'ceil', roundTo: 100n }); // whole rupees, rounded up

const schedule = amortise({
  principal: 200_000_000n, ratePercent: '12', months: 120, rounding: 'half-up',
  prepayments: [{ period: 12, amount: 50_000_000n }], strategy: 'reduce-tenure', // or 'reduce-emi'
});
// { emi, rows: [{ period, opening, payment, interest, principal, prepayment, closing }], totalInterest, totalPaid, totalPrepaid, periods }
```

Model: reducing balance, interest charged monthly at annual rate / 12 on the opening balance, rounded with your mode.
The principal part is the instalment minus the interest; the last row (or any row whose instalment covers the balance)
clears the balance exactly. `reduce-tenure` keeps the instalment after a prepayment; `reduce-emi` recomputes it over
the months left. A prepayment larger than the balance is capped. Banks that accrue daily (actual/365) differ by a
few paisa to rupees a month. Out of scope: floating-rate resets, flat-rate loans, grace periods, fees, insurance,
penal interest, prepayment charges.

Guarantees (fast-check, every rounding mode): the principal column sums to the loan and the last closing balance is
zero; each row has `payment = interest + principal` and `closing = opening − principal − prepayment`.

### Deposits (`simulateDeposit`)

```ts
import { simulateDeposit } from '@punji/ui/lending';

simulateDeposit({ principal: 10_000_000n, months: 12, ratePercent: '10', compounding: 'quarterly', tdsPercent: '6', rounding: 'half-up' });
simulateDeposit({ monthlyDeposit: 500_000n, months: 24, ratePercent: '8', rounding: 'half-up' }); // a recurring deposit
// { credits: [{ period, month, opening, deposited, interest, tds, net, closing }], totalDeposited, grossInterest, totalTds, netInterest, maturity, paidOut }
```

Interest accrues each month at rate / 12 on the balance (a recurring instalment is deposited at the start of its
month), is held exactly between credits and is rounded once per credit. Credits happen every 1, 3, 6 or 12 months or
only at maturity; a final partial period is credited at the end. TDS is `tdsPercent` of each credit, rounded with the
same mode; the default is `'0'` and the calculator's default is `'6'`. Pass the rate that applies to the depositor.
With `payout: 'compound'` (default) the net interest joins the balance; with `'pay-out'` it is paid away and
`maturity` equals the deposits. Guarantee: `maturity = totalDeposited + netInterest` when compounding.

## Components

### LoanCalculator

Props: `defaultAmount`, `defaultRatePercent`, `defaultMonths` (60), `defaultTenureUnit`, `maxMonths` (360),
`maxRatePercent` ('40'), `allowPrepayment` (true), `rounding` ('half-up'), `roundTo` (1n), `money` (NPR),
`digits`, `onScheduleChange`, `labels`, `tableLabels`, `title`, `headingLevel`, `testId`. Built from `CurrencyInput`,
`PercentageInput`, `NumberField` and `ChoiceGroup`. The results are a polite live region; the schedule opens under an
`aria-expanded` disclosure. An empty or out-of-range field shows a prompt instead of a figure, never zero.

### AmortisationTable

Props: `schedule`, `money`, `view` / `defaultView` / `onViewChange` ('monthly' or 'yearly'; long loans start yearly),
`hideViewSwitch`, `digits`, `labels`, `footnote`. A real table with a caption naming the currency, row headers and a
totals row; sticky header and footer inside a focusable scroll region. Yearly rows are exact sums of the months.

### DepositCalculator

Props: `defaultKind` ('fixed' | 'recurring'), `defaultAmount`, `defaultRatePercent`, `defaultMonths` (12),
`defaultCompounding` ('quarterly'), `defaultTdsPercent` ('6'), `maxMonths` (120), `maxRatePercent` ('20'),
`frequencies`, `rounding`, `money`, `digits`, `onResultChange`, `labels`, `title`. Lists every credit in a table behind
a disclosure.

### InterestRateTable

Props: `rates` (`{ id, product, group?, ratePercent, previousRatePercent?, effectiveFrom, note? }`), `caption`,
`description`, `calendar` ('ad' | 'bs'), `language`, `digits`, `showChange`, `labels`. Groups become `colgroup` header
rows. The change compares the decimal strings exactly and reads "Down 0.25 points" with an arrow; colour only
reinforces it. Effective dates are ISO calendar dates, converted to BS (1975 to 2099) without the host's time zone.

### NepalAddressPicker

Props: `value` (`{ province, district, localLevel, ward }`, English names and ASCII digits; start with
`emptyNepalAddress`), `onChange`, `data`, `language` ('en' | 'ne' for province and district names), `digits`,
`hideWard`, `errors`, `labels`, `size`. Three linked native selects (via `SelectField`) and a ward field; changing a
level clears the levels below it. Without `data` it calls `loadNepalAddressData()`, a dynamic import of
`@punji/ui/nepal-address-data`, once per page; a named status holds the space while it loads and a failure is an
alert. The data subpath is deliberately not on the root (`scripts/check-exports.mjs` lists it as exempt), so the root
import does not carry it.

The list follows the 2017 structure and its counts are tested: 6 metropolitan cities, 11 sub-metropolitan cities, 276
municipalities, 460 rural municipalities; 137, 136, 119, 85, 109, 79 and 88 local levels in provinces 1 to 7.
Local-level names are English as commonly romanised. Ids are this library's, not government codes. Local bodies
rename themselves occasionally: check against the Ministry of Federal Affairs and General Administration before
relying on the list for a regulated record.

### IdNumberInput

Props: `kind` ('pan' | 'citizenship'), `label`, `hint`, `error`, `value`, `onValueChange(text, result)`, `digits`,
`messages`, plus input attributes. Letters are refused as typed; Devanagari digits become ASCII; the shape message
appears after the field is left. A PAN is nine digits. A citizenship number is digit groups joined by single `-` or
`/`, 3 to 20 digits, with the separators kept as typed because the office's grouping is part of the number. Neither
has a public check digit: a valid shape is not a verified number.

### DocumentUpload

Props: `slots` (`{ id, label, hint?, accept?, maxSize?, capture?, required? }`), `value` (file per slot id),
`onChange`, `errors`, `title`, `headingLevel`, `disabled`, `labels`. Reuses the statement upload's pure checks
(`validateStatementFile`, `formatFileSize`, `describeAccept`). Image previews use object URLs revoked when the file
changes or the slot unmounts. Added and removed files are announced politely; rejections are alerts. The browser's
type is a hint only: scan and validate content on the server.

### OnboardingWizard

Props: `steps` (`{ id, title, description? }`), `current`, `onNext`, `onBack`, `onStepSelect`, `children`, `busy`,
`nextDisabled`, `digits`, `headingLevel`, `labels`. A real `<form>` (Enter continues), a named nav with an ordered
list of steps (`aria-current="step"`, state words for screen readers), the step heading that receives focus when the
step changes (not on first render), and a status that announces "Step 2 of 4: Address". Holds no data.

### RemittanceTracker

Props: `onLookup(controlNumber, signal)` (resolve details, `null` for no match, reject on failure),
`defaultControlNumber`, `lookupOnMount`, `minLength` (8), `maxLength` (16), `payoutMoney`, `sentLocale`, `timeZone`,
`labels`, `headingLevel`, `footer`. The field accepts spaces and Devanagari digits and groups the digits in fours.
The result heading shows only the last four digits (`maskControlNumber`) and receives focus after a typed lookup.
A pending lookup is aborted on unmount. The payout is the server's figure; the rate is display text. Treat control
numbers as bearer secrets: rate-limit and authorise lookups on the server, and do not log them on the client.

### InsurancePremiumCard

Props: `plan`, `insurer`, `policyNumber`, `status` ('active' | 'grace' | 'lapsed' | 'matured'), `premium`,
`frequency`, `breakdown` (lines whose exact sum is the premium shown), `nextDueDate`, `nextDueLabel`, `sumAssured`,
`termYears`, `money`, `language`, `digits`, `actions`, `headingLevel`, `labels`. Status is words and an icon. A
missing premium is a dash with a spoken "No value".

## Testing

`test/lending.test.ts` covers the pure modules (textbook EMI and FD figures, prepayment strategies, property tests for
conservation in every rounding mode, KYC checks and the address-list counts). `test/lending-components.test.tsx`
covers rendering, keyboard and focus behaviour, live announcements, the lazy load and axe for every component. Visual
fixtures are in `test/visual/fixtures-lending.tsx` (nine fixtures; baselines are generated separately).
