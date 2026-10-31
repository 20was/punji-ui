# Financial utilities research — 2026-10-29

Scope: formatter, utility and hook planning. No UI changes or new dependencies. Recommendations are based on repository evidence, not a claim that one library is universally best.

## Source review

- Dinero.js: inspected revision `76b969e519dc44675d4af898d25629995d0b16f2`, MIT licence, package metadata, allocation tests, allocation documentation. Release API latest v2.0.2 (2026-03-13). Its tests cover ratios, zero-weight allocations and scale differences. Reference for exact-money scale, explicit rounding and remainder-preserving allocation. Do not add a full calculation engine merely to print amounts.
  https://github.com/dinerojs/dinero.js/tree/76b969e519dc44675d4af898d25629995d0b16f2
- React Number Format: inspected revision `503a85ea16c182a114731405f6a504d7e86a5dcb`, MIT licence, package metadata, `src/numeric_format.tsx`, `test/library/utils/round-to-precision.spec.ts`. Release API latest v5.4.5 (2026-03-22). Separates numeric string formatting from editable input/caret machinery. Good reference or future optional input adapter; evaluate native Devanagari editing, IME, paste and caret behavior before adopting.
  https://github.com/s-yadav/react-number-format/tree/503a85ea16c182a114731405f6a504d7e86a5dcb
- TradingView Lightweight Charts: inspected revision `c9ec1cec25583a0200f3c85ad9019d19c1d65f97`, Apache-2.0 licence, package metadata and `src/formatters/price-formatter.ts`. Package metadata 5.2.1; latest release API entry was a plugin release, not proof of the core version's release date. Uses explicit price precision/minimum movement, handles negative signs, accepts custom localization callbacks. Reference for chart-compatible formatter callbacks; no chart dependency is needed for utility work.
  https://github.com/tradingview/lightweight-charts/tree/c9ec1cec25583a0200f3c85ad9019d19c1d65f97
  https://tradingview.github.io/lightweight-charts/tutorials/customization/price-format
- React Aria / React Spectrum: existing source and number-field/SSR test inspection is recorded in ../RESEARCH.md. Reference for separating partial input from committed values and for locale-aware formatting. Review current exact package versions before any dependency adoption.
- Frappe Books: existing P&L/report source and AGPL licence review is recorded in ../RESEARCH.md. Useful accounting workflow reference; no AGPL source is adopted.

No third-party source copied. MIT and Apache projects are compatible references; any later vendoring requires preserving applicable notices. Repository/release inspection establishes concrete maintenance evidence, not a security guarantee.

## Existing Punji coverage and gaps

Existing: formatNPR, formatNepalNumber, formatPercent, formatNepalDate, formatBSDate, fiscal-year lookup, parseMinorUnits, minorUnitsToDecimal, sumMinorUnits, compactRs, parseNumber, toneOf and useTweenedNumber.

Important gaps:
- `formatNPR(bigint)` treats bigint as WHOLE rupees. Passing paisa directly prints an incorrect amount. We need a separate explicit minor-unit formatter, never an ambiguous overload.
- parseNumber returns a JS number and removes grouping separators permissively; it is not an exact or strict accounting-input parser.
- New Intl-based formatters construct formatter instances per call, unlike the existing cached legacy helpers. Repeated table rendering would benefit from bounded formatter reuse.
- Legacy and Nepal helpers differ in missing markers, Rs/NPR labels and negative-zero behavior. Preserve existing APIs and introduce explicit policies rather than silently changing them.

## Recommended implementation sequence

Names below are proposals, not published exports.

| Priority | Proposed capability | Contract and reason |
|---|---|---|
| 1 | formatMinorUnits / formatMoney | Accept bigint minor units plus explicit currency/scale; preserve precision above Number.MAX_SAFE_INTEGER; support Nepal grouping, digits, sign and accounting parentheses. Never convert exact amount through Number. |
| 1 | parseLocalizedDecimal | Convert English/Devanagari text into canonical decimal string; validate grouping, sign and decimal syntax; distinguish empty, partial, invalid and committed input. Exact parsing then delegates to parseMinorUnits. |
| 1 | createFinancialFormatters | A pure formatter factory with reusable Intl instances. Explicit locale/digits/timezone policy and shared missing-value rules; no global mutable locale or unbounded cache. |
| 2 | formatChange / formatBasisPoints | Explicit percentage-point versus ratio inputs; signed output, negative-zero normalization and sign/tone agreement after rounding. No implicit denominator rules. |
| 2 | formatQuantity / price precision policy | Counts versus fractional quantities; caller supplies precision/tick size. Do not hard-code NEPSE rules or infer execution-valid prices from displayed rounding. |
| 2 | formatFinancialDateRange / fiscal period boundaries | Gregorian/BS and Kathmandu boundaries; derive exact fiscal boundaries via the existing converter. Date-only values stay distinct from instants. |
| 3 | useDecimalInput | Editing text, composition/paste, validation result, commit/reset. Build atop the pure parser after keyboard/caret requirements are tested; retain string values. |
| 3 | useRelativeTime / useDataFreshness | Explicit as-of/now/timezone and stale threshold; SSR-stable initial text, shared timer, hidden-tab behavior and cleanup tests. No inference of market-open status. |
| Later | allocateMinorUnits / explicit rounding | Useful for splitting fees or expenses; must conserve totals, handle negative/zero weights predictably and declare remainder order. Consider Dinero adapter if broader financial arithmetic is needed. |

First batch: exact minor-unit display, localized decimal parsing, and reusable formatter factory. Extend existing functions where appropriate; keep new exports in pure subpaths. Add hooks only when there is actual React state/lifecycle behavior to manage.

## Required validation for the first batch

Test huge and negative amounts, zero/-0, null/nonfinite display values, English/Devanagari digits, lakh/crore boundaries, malformed grouping, unexpected Unicode/sign characters, excessive precision, partial editing states and formatter/parser round trips. Property-test exact amount preservation. Verify existing exports, tree shaking and React-free imports. Benchmark repeated formatting before claiming a speed improvement. No UI redesign is needed.
