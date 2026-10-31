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

## Money in any currency: formatter, MoneyDisplay, PriceChange, CurrencyInput

`@punji/ui/money` is the currency-generic counterpart of the Nepal formatters. Configuration, not code, selects USD, AUD, INR, EUR, JPY, NPR and so on. Nepal is a preset. Everything is also exported from `@punji/ui`. The older `formatNPR`, `formatMinorUnits` and `createFinancialFormatters` are unchanged.

```ts
import { createMoneyFormatter, formatMoney, formatCompactMoney, parseMoney, nepalMoneyConfig } from '@punji/ui/money';

formatMoney(123456n, { currency: 'USD', locale: 'en-US' });               // $1,234.56
formatMoney(1234567n, { currency: 'JPY', locale: 'ja-JP' });              // ￥1,234,567 (exponent 0)
formatMoney(1234567n, { currency: 'KWD', locale: 'en-US' });              // KWD 1,234.567 (exponent 3)
formatMoney(123456n, { currency: 'EUR', locale: 'de-DE' });               // 1.234,56 €
formatMoney(-123n, { currency: 'USD', accounting: true });                // ($1.23)
formatMoney(123456789n, nepalMoneyConfig());                              // NPR 12,34,567.89
formatMoney(123456789n, nepalMoneyConfig({ language: 'ne', digits: 'deva' })); // रू १२,३४,५६७.८९
formatCompactMoney(12345678900n, nepalMoneyConfig());                     // NPR 12.35 Cr  (display-rounded)
parseMoney('1.234,56', { currency: 'EUR', locale: 'de-DE' });             // { state: 'valid', value: '1234.56', minor: 123456n }
```

**How it stays exact.** The amount is a `bigint` of minor units. The currency exponent comes from Intl, never a table in this library. The integer and fraction are split with bigint arithmetic, grouped and digit-mapped with Intl, and slotted into the parts that `Intl.NumberFormat#formatToParts` produces for the locale, so the sign, symbol position and spacing are the locale's own. No amount passes through `Number`. For many rows call `createMoneyFormatter(config)` once; `getMoneyFormatter` is a cached lookup (64 entries) that `formatMoney` and the components use.

**Config.** `{ currency, locale = 'en', display = 'symbol' | 'code' | 'name' | 'narrowSymbol' | 'none', accounting = false, signDisplay = 'auto', numberingSystem }`. `nepalMoneyPreset` is `{ currency: 'NPR', locale: 'en-IN', display: 'code' }`; `nepalMoneyConfig({ language, digits, accounting })` switches to `ne-NP` with the Nepali symbol and opts into Devanagari digits. Latin digits stay the default in both languages, as elsewhere in this library.

**Compact is for display only.** `formatCompactMoney` rounds half up to `fractionDigits` (default 2). Locales in India and Nepal and the `ne` and `hi` languages get lakh and crore (`L`, `Cr`, `Arba`, `Kharba`, or Devanagari words for `ne`/`hi`); everything else gets the locale's K/M/B/T from Intl. Below one lakh (or 1,000) it prints the exact amount. Never store, sum or compare compact text.

**Parsing is the strict inverse of `format` with `display: 'none'`.** It uses the locale's separators and grouping (lakh for en-IN/ne, thousands elsewhere), accepts Devanagari and Arabic-Indic digits, accounting parentheses when `accounting` is set, and delegates to `parseLocalizedDecimal` and `parseMinorUnits`. More fraction digits than the exponent is `invalid`, never rounded. Currency symbols and codes in the text are rejected.

### MoneyDisplay

```tsx
<MoneyDisplay value={123456789n} preset={nepalMoneyConfig()} />            // NPR 12,34,567.89
<MoneyDisplay value="1234.50" currency="AUD" locale="en-US" />               // A$1,234.50, spoken "1,234.50 Australian dollars"
<MoneyDisplay value={-250n} currency="USD" accounting />                     // ($2.50), spoken "-2.50 US dollars"
<MoneyDisplay value={null} currency="USD" />                                 // —  (spoken "No value")
```

Props: `value: bigint | string | null | undefined` (a string is exact major units and must fit the currency's exponent, otherwise it shows the missing mark), the format config fields, `preset`, `compact`, `missing`, `missingLabel`, `className`, `testId`, `ref`. Renders `<data value="1234.50">`; digits are tabular and never wrap. When the symbol is shared (`$`, `¥`, `kr`, narrow symbols) or the amount is compact or in accounting style, the visible text is `aria-hidden` and a screen-reader-only twin speaks the full name and exact amount.

Use it for any money a reader sees. Do not use it to format a number that is not money (use `Figure` or `formatNepalNumber`), or to show a value for a calculation, which belongs to the exact functions in `@punji/ui/calculations`.

### PriceChange

```tsx
<PriceChange current={10550n} previous={10000n} currency="USD" />           // ▲ +5.50 (+5.50%), spoken "up 5.50 (5.50%)"
<PriceChange change={priceChange(9000n, 10000n)} currency="USD" display="symbol" convention="red-up" />
```

Props: `current` and `previous` (minor units) or a precomputed `change`; `showAbsolute`, `showPercent`, `percentDigits` (default 2), `convention: 'green-up' | 'red-up'`, `labels` (`{ up, down, flat }`, default English), `size="sm"`, the format fields (`display` defaults to `none`, since the column usually names the currency), `missing`, `missingLabel`. The absolute change is exact; the percent comes from `percentageChange` and is display-only. It is omitted when the base price is zero or negative. Direction is the sign of the exact absolute change. It is carried by the sign, an arrow-shaped icon (up, down, bar) and a spoken word; colour (`--pu-color-gain` / `--pu-color-loss`) only reinforces it. `red-up` swaps the colours for markets where red means up; the icon, sign and words are unchanged. Not a substitute for `Delta` when you only have a published percent number.

### CurrencyInput

```tsx
const [amount, setAmount] = useState('');
<CurrencyInput label="Amount" preset={nepalMoneyConfig({ digits: 'deva' })} value={amount}
  onValueChange={({ value, minorUnits, state }) => { setAmount(value); /* minorUnits: bigint | null */ }} />
```

Built on `PriceField`, so label, hint, error, size and `hideLabel` are the same as the other fields. The label includes the currency name for assistive technology ("Amount (US Dollar)"); the code shows inside the field. `value` is the exact ASCII decimal string (`'1234567.89'`); `onValueChange` receives `{ value, minorUnits, state: 'empty' | 'partial' | 'valid' }`. Typing is grouped by the locale as you type (`1,23,45,678` for en-IN), the caret stays after the same typed characters, ASCII, Devanagari and Arabic-Indic digits are accepted, group marks you type or paste are dropped, and the locale decimal mark is honoured. Keystrokes that would add more fraction digits than the currency has, letters, or a minus sign (unless `allowNegative`) are refused and the text does not change. On blur the text is finished: `12.5` becomes `12.50`, `12.` becomes `12.00`, a lone `-` clears. JPY and other exponent-0 currencies take no decimal mark and get a numeric keyboard.

Use it for entering an amount. It does not enforce a minimum, maximum or balance: check `minorUnits` yourself and pass `error`. Not for quantities or percentages (use `NumberField`). A pasted string with currency text or a letter is refused whole; paste the number only.

Accessibility: native `<label for>`, hint and error wired through `aria-describedby`, `aria-invalid` and a live `role="alert"` error; every state has a text alternative; no information is colour-only. Contrast is checked in the browser pass, as for the other components.

Notes: the `Intl` data (symbols, plural names, grouping) comes from the browser or Node. `PriceField` now lets a caller's `inputMode` override its `decimal` default, which `CurrencyInput` uses for exponent-0 currencies.
