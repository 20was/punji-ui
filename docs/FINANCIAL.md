# Financial API and examples

Run `npm run build && npm run examples` then open the printed local URL. `examples/main.tsx` imports `@punji/ui` and CSS using the published export map. It provides portfolio, invoice and watchlist compositions, sorting/search, retry/empty actions, theme and dataset controls. Data is synthetic and never fetched. Loading/error controls are intentional persistent state previews.

| Export | Contract |
|---|---|
| AppShell | Brand, navigation, named nav landmark, header actions, skip link, main and footer slots. Caller owns router/current page. |
| FinancialSummary | Readonly metrics with stable IDs and formatted ReactNode values; no totals or hidden financial calculations. |
| FinancialTable<T> | Typed rows and render callbacks, stable rowKey, semantic row headers, controlled sorting, loading/error/empty states; no data mutation. |
| PriceChart | Labelled observations and numeric/null values, straight segments, preserved gaps, fixed SVG proportions, exact-value table. For compact series, not intraday high-volume rendering. |
| OrderBook | Caller-ordered bids/asks, explicit price and quantity formatter callbacks; display only. |

Import these from the root or `@punji/ui/financial`; load `@punji/ui/styles.css`. Props and interfaces ship in declarations. FinancialColumn extends the existing Column interface; columns stay available through horizontal overflow unless the caller explicitly opts into the existing wide/hideUnder behavior.

```ts
import { formatNPR, gregorianToBS, formatBSDate, nepalFiscalYear,
  parseMinorUnits, sumMinorUnits, minorUnitsToDecimal } from '@punji/ui/nepal';

formatNPR(1234567.89); // NPR 12,34,567.89
formatNPR(1234567.89, { language: 'ne', digits: 'deva' });
const bs = gregorianToBS({ year: 2024, month: 4, day: 13 });
formatBSDate(bs, { language: 'ne' });
nepalFiscalYear(bs); // startYear, endYear, label
minorUnitsToDecimal(sumMinorUnits([parseMinorUnits('0.10'), parseMinorUnits('0.20')])); // 0.30
```

`formatPercent(5)` means 5.00%, not 500%. Missing display values become `—` or the caller's `missing` string. `formatNPR` numeric inputs are display values, not exact ledger values. Preserve exact money as decimal strings or minor-unit bigint. The decimal parser deliberately rejects grouping and localized numerals; existing parseNumber is a convenience numeric-input parser and must not be used to preserve arbitrary monetary precision.

`gregorianToBS` / `bsToGregorian` throw on invalid dates or outside the converter range. Month/day are one-based. `instantToNepalDate` converts an explicit instant to a Gregorian date in Kathmandu before calendar conversion. `formatNepalDate` formats instants in the Gregorian calendar; `formatBSDate` formats validated BS date parts. No environment-dependent string-date parsing is used.

Browser checks: `npx playwright install chromium && npm run build && npm run check:examples`. The script starts and stops its own Vite server. Use `CHROME_CHANNEL=chrome` to test installed Chrome. Screenshots and JSON results are written to ignored `test-results/showcase/`.

## Exact money display and localized input

```ts
import { formatMinorUnits, createFinancialFormatters } from '@punji/ui/nepal/financial-format';
import { parseLocalizedDecimal } from '@punji/ui/nepal/decimal';
import { parseMinorUnits } from '@punji/ui/nepal/money';

formatMinorUnits(123456789n); // NPR 12,34,567.89 (input is paisa)
formatMinorUnits(-123n, { accounting: true }); // (NPR 1.23)
const formatter = createFinancialFormatters({ language: 'ne', digits: 'deva' });
formatter.formatMinorUnits(123456789n); // रु १२,३४,५६७.८९

const parsed = parseLocalizedDecimal('१२,३४५.६७');
if (parsed.state === 'valid') {
  const paisa = parseMinorUnits(parsed.value); // 1234567n
}
```

These functions are also available from `@punji/ui` and `@punji/ui/nepal`.
The factory snapshots its options and reuses native Intl instances, with no
shared mutable locale or unbounded cache. `scale` defaults to 2 and accepts 0–9;
`currency` is a caller-provided display label, defaulting to NPR/रु. Set it to
an empty string for number-only output. This does not perform currency conversion
or infer another currency's exponent. Output uses an explicit minus sign (−),
or parentheses when `accounting` is enabled. No calculation or rounding occurs.

The parser accepts ASCII and Devanagari digits, an ASCII minus, an ASCII decimal
point and optional grouping commas. Surrounding whitespace is trimmed. Default
grouping is South Asian; use `grouping: 'western'` for 1,234,567 or `'none'` to
reject commas. Ungrouped numbers work in every mode. Mixed digit scripts are
normalized. Internal whitespace, currency labels, exponent notation, plus signs,
Unicode minus and accounting parentheses are rejected. It is an input parser,
not a general inverse of decorated display text.

Empty input returns `empty`; unfinished values such as `-` and `12.` return
`partial`. Malformed input returns `invalid` with a reason; committed values
return `valid` with an exact canonical string. Excess precision is rejected,
never rounded. `maxFractionDigits` defaults to 2 and accepts 0–9. Inputs longer
than 100 characters are rejected. Invalid parser options throw a RangeError.
Use parser state to decide when to commit; do not turn empty/invalid input into
zero. UI editing/caret hooks remain a later step.

## Gregorian date-only records and Nepal fiscal periods

```ts
import { parseCalendarDate, formatCalendarDate, formatDateRange } from '@punji/ui/nepal/date-only';
import { getNepalFiscalPeriod } from '@punji/ui/nepal/calendar';

parseCalendarDate('2024-02-29'); // { year: 2024, month: 2, day: 29 }
parseCalendarDate('2023-02-29'); // null
formatCalendarDate('2024-02-29'); // 29 Feb 2024
formatCalendarDate('2024-02-29', { language: 'ne', digits: 'deva' });
formatDateRange('2024-01-01', '2024-02-29'); // 1 Jan 2024 – 29 Feb 2024

// Input here is explicitly BS, matching nepalFiscalYear.
const period = getNepalFiscalPeriod({ year: 2078, month: 4, day: 1 });
period.label; // 2078/79
period.start.gregorian; // { year: 2021, month: 7, day: 16 }
period.end.bs; // { year: 2079, month: 3, day: 32 }
period.end.gregorian; // { year: 2022, month: 7, day: 16 }
```

All four functions are also exported from the root and Nepal barrel.
The `date-only` subpath has no calendar-converter or React runtime dependency.
`CalendarDate` remains re-exported by the existing calendar module for compatibility.

`parseCalendarDate` accepts exactly ASCII `YYYY-MM-DD`, Gregorian years 0001–9999,
with Gregorian leap-year rules. Invalid dates, unpadded fields, timestamps,
surrounding whitespace and localized digits return null. This strict storage
format is distinct from localized input/display.

`formatCalendarDate` accepts validated parts or the same strict storage string.
It throws RangeError for invalid values and renders with an explicit Gregorian
calendar and UTC surrogate, so the host timezone cannot shift a record's day.
It does not convert a date-only value into a Kathmandu timestamp. Locale controls
month names and field order; Western digits remain the default, Devanagari is
opt-in. Month width can be numeric, 2-digit, short (default) or long.

`formatDateRange` uses inclusive Gregorian endpoints with complete dates on both
sides and an en dash separator. Equal endpoints print once. Invalid endpoints
or a reversed range throw RangeError; values are never silently swapped.

`getNepalFiscalPeriod` takes a BS date, validates it and returns startYear,
endYear, label, and inclusive start/end objects, each containing bs and gregorian
parts. It converts Shrawan 1 in the current and next fiscal year through the
existing table-backed converter, then subtracts one Gregorian UTC day to find
the inclusive end. It makes no assumptions about BS month lengths or a fixed
Gregorian July boundary. It throws when the whole fiscal period cannot be
represented within converter coverage (including early 1975 BS and FY 2099/2100).
For timestamp-backed filtering, the application must separately choose its
explicit timezone and half-open instant boundaries.

## Signed changes, basis points, prices and quantities

```ts
import { formatChange, formatBasisPoints, formatQuantity, formatPrice }
  from '@punji/ui/nepal/market-format';

formatChange(1.255, { unit: 'percent' }); // +1.26%
formatChange(-0.004); // 0.00 (no negative zero)
formatBasisPoints(25); // 25 bps
formatBasisPoints(-25, { signed: true }); // −25 bps
formatQuantity(1234567); // 12,34,567
formatQuantity(12.345, { fractionDigits: 3 }); // 12.345
formatPrice(540.5, { currency: 'NPR' }); // NPR 540.50
formatPrice(1234567.5, { currency: 'रु', digits: 'deva' }); // रु १२,३४,५६७.५०
```

All four functions are also exported from the root and Nepal barrel. The granular
subpath imports no React or calendar converter. Existing APIs are unchanged.

Common options: `digits` (latn default, or deva), `fractionDigits` (integer 0–20),
`missing` (default em dash). South Asian grouping is explicit regardless of
language. The inherited language option does not translate caller-provided
currency labels or the standard bps suffix. Display uses native Intl half-expand
rounding. Signs are chosen after rounding; rounded zero has no sign, and actual
negative output uses Unicode minus. Invalid precision throws even for missing
input. Null/undefined/NaN/infinity print the missing marker without units.

- `formatChange`: number input; two decimals by default. Positive output has +.
  `unit: 'percent'` means input is already percentage points: 1.25 → +1.25%.
  Default unit is number. It never derives or recomputes a published change.
- `formatBasisPoints`: number input already in basis points; no conversion.
  25 bps equals 0.25 percentage points, not 25%. Default precision is zero;
  `signed: true` adds + to positive displayed values.
- `formatQuantity`: number or whole-unit bigint; zero decimals by default.
  Use explicit fractionDigits for fractional units. Negative positions are
  supported. It is a formatter, not a whole-share input validator.
- `formatPrice`: number or whole-unit bigint; two decimals by default, optional
  `currency` display label. No currency exponent, tick size, trading rule or
  execution-valid price is inferred. Negative values remain supported.

Bigint here always means whole units, including for prices. For exact paisa use
formatMinorUnits instead. Number inputs retain JavaScript number limitations;
these display helpers do not provide decimal accounting calculations.

Local working examples: /utilities/financial-formatters#market-formatters in the
full portal (`npm run portal`). The added APIs increase the all-export bundle by
about 0.22 kB gzip (measured ~21.85 kB total); aggregate allowance is 22.3 kB with a
separate 750 B module budget. Existing primitive/tree-shaking budgets are unchanged.

## Financial calculations

`@punji/ui/calculations` (also on the root) is pure TypeScript: no React, no
browser globals, no dependency, enforced by `scripts/check-boundaries.mjs`. It is
currency-agnostic; Nepal is not assumed anywhere.

Two numeric contracts, never mixed:

| Layer | Inputs/outputs | Rounding |
|---|---|---|
| Ledger (`computePosition`, `valuePosition`, `breakEvenPrice`, `taxOnGain`, `applyRate`, `divideRounded`) | `bigint` minor units; quantity is an integer count of the smallest tradable unit | Caller passes a `RoundingMode` (`half-even`, `half-up` = ties away from zero, `floor`, `ceil`, `trunc`) wherever a fraction can appear. Break-even always rounds up. |
| Ratios (`percentageChange`, `priceChange`, `returnOnCost`, `cagr`, `dividendYield`, `weightedAverage`, `allocation`) | `number` or `bigint` in, `number` in percent units out (5 = 5%, like `formatPercent`) | Display only. `null` when undefined: zero/negative base, non-positive price, zero total weight. |

```ts
import { computePosition, valuePosition, breakEvenPrice, taxOnGain, allocation } from '@punji/ui/calculations';

const position = computePosition([
  { side: 'buy', quantity: 100n, price: 50_000n, fees: 1_000n },  // 100 @ 500.00
  { side: 'buy', quantity: 10n, price: 0n },                      // bonus shares
  { side: 'sell', quantity: 50n, price: 70_000n, fees: 900n },
], { method: 'fifo', rounding: 'half-even' });
// { quantity, costBasis, realisedPnL, totalFees, averageCost, lots }

valuePosition(position, 61_000n);                         // { marketValue, unrealisedPnL }
breakEvenPrice(position.costBasis, position.quantity, { sellRate: '0.004' });
taxOnGain(position.realisedPnL, { rate: rateFromYourVerifiedSchedule, rounding: 'half-up' });
allocation([{ id: 'NABIL', value: 3n }, { id: 'NTC', value: 3n }, { id: 'HDL', value: 3n }]);
// displayPercent: 33.34, 33.33, 33.33 (largest remainder, always sums to 100)
```

Guarantees, tested with fast-check: cost is conserved for every method and
rounding mode (open cost + cost removed by sells = cost bought); weighted-average
and FIFO give identical lifetime P&L once flat; every rounding mode lands on the
floor or ceiling of the true quotient; allocation display shares sum to exactly
100; break-even is the minimal recovering price.

Deliberately out of scope: short positions, corporate actions other than bonus
(zero-cost buy) and rights (buy at issue price), tiered/flat broker fee schedules,
loss carry-forward, holding-period tax tiers and any built-in tax rate. Rates are
decimal-fraction strings (`'0.075'`) parsed exactly; callers supply them from a
verified, current source.
