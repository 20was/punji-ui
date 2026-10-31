# Web utilities and hooks extraction audit — 2026-10-29

Read-only review of punji-web; no UI, consumer code, dependencies or existing APIs changed. This is a source review of likely candidates, not runtime validation of every hook.

## First candidates

| Priority | Consumer source | Proposed package API | Required adaptation |
|---|---|---|---|
| 1 | src/me/data/useStableOrder.ts | useStableOrder + keepOrder | Retain order during live value updates; explicit sort ID reorders. Validate/document unique stable keys, remove readonly-to-mutable cast, test additions/removals/filtering, latest row objects and SSR. Current Set membership comparison assumes unique keys. |
| 1 | src/lib/useHydrated.ts | useHydrated | Already independent of app code; useSyncExternalStore server snapshot false/client true. Test actual renderToString + hydrateRoot behavior and StrictMode. Document that this is for browser-dependent rendering, not a default fetch gate. |
| 1 | src/me/desk/useNarrow.ts; src/me/pages/portfolio/usePhone.ts; src/me/pages/overview/useWide.ts | useMediaQuery(query, serverMatch) | Replace repeated effect/state logic with SSR-safe external-store snapshots. Caller supplies query; package must not hard-code account-sidebar widths. Test subscription cleanup, query changes, SSR and missing matchMedia. Prefer CSS for purely visual layout. |
| 2 | src/components/kit/companyName.ts | displayCompanyName | Useful with existing shortCompanyName. Acronym list is Nepal-specific: accept caller overrides or explicitly document the default vocabulary. Never replace the canonical stored company name. |
| 2 | src/lib/rangeLabels.ts | placeRangeLabels | Pure collision layout useful for price ranges. Current code assumes a 280px track and 6.6px characters: accept measured widths/track size. Keep ReactNode textLen separate; character count is not reliable for Devanagari/font-dependent widths. |
| 2 | src/lib/treemap.ts | squarify | Generic deterministic heatmap/portfolio allocation layout. Validate finite nonnegative weights and dimensions; ensure negative weights do not enter the denominator; test bounds, area conservation, zero weights and extreme magnitudes. Audit algorithm provenance before copying. |
| 2 | src/components/kit/levelsMath.ts | barShare / splitShares | Display math only. Reject nonfinite/negative inputs and distinguish minimum visible width from actual data share. Current qty is unused in splitShares; do not imply percentages of qty when using sum of components. |

These are source candidates, not new public exports yet. The first three make a coherent small hooks batch without financial business logic or extra dependencies.

## Useful after redesigning the contract

- `src/components/kit/alertDistance.ts`, `src/me/lib/alertDistance.ts`: overlapping implementations. One produces signed distance/crossed state; another clamps distance at zero and returns zero for invalid prices. Consolidate semantics before extracting; missing must remain unknown. Make visual closeness scale explicit instead of freezing the app's 10% default. Guard finite intermediate results. Display helper only, not authoritative alert execution.
- `src/components/kit/alertTarget.ts`: general price/index formatting idea, but imports global reader language. Build on explicit locale/digit/currency options and existing formatters rather than copying another formatter.
- `src/lib/format.ts` dates: `longDate`, `shortDate`, `tickLabel`, `longMonth` avoid timezone shifts, but do not fully validate month/day bounds. A strict Gregorian date-only parser/formatter is useful; current instant formatting is a different contract. Never copy undefined-month output or use a fixed BS offset.
- `src/me/pages/overview/useFitRows.ts`: accepts a ref but knows `.kit-lt-row`, `.kit-lt-h`, `.kit-more`, fixed gaps and growth behavior. Generalize measurement inputs and ResizeObserver lifecycle before packaging; needs browser sizing tests.
- `src/components/kit/PrivateAmount.tsx` and `src/me/lib/privacy.tsx`: reusable masking preference exists, but inspect the complete store, hydration and storage lifecycle before extraction. Caller owns persistence scope/key; no account IDs or sensitive amounts persisted. Masking is presentation, not access control.
- `src/me/pages/portfolio/useDeskKeys.ts`, `src/me/pages/watchlist/useWatchKeys.ts`: share useful keyboard guards, but commands, selectors, routing and chart periods belong to pages. Extract only narrowly scoped helpers with composition, editable-target, modal and defaultPrevented tests. Avoid a second global hotkey manager.

## Keep app-owned

- `src/hooks/useApiResource.ts`, `src/me/data/useResource.ts`: BFF/API errors, cache provenance and fetch policy are app-owned. A future generic async hook would require request identity, cancellation, disabled transitions, race tests and explicit stale-data policy. Do not move these directly. In particular review whether successful data is cleared/keyed when a resource path changes.
- useLivePrices, useMarketClosed, useBarMarket, useNepseIndex, useSecurity/useSecurities: market/session/data-source or registry dependencies.
- sectionState/capabilityState, auth/session and permission helpers: application authorization semantics.
- feeSchedule, sellMath and portfolio/tax calculations: domain contracts, not UI display helpers.
- readerLang global setter: replace with explicit arguments/provider boundaries, not a process-global locale shared across SSR requests.
- deferredComponent: router/build/chunk recovery and storage policy. Its reload fallback when storage fails deserves review before any generic adoption; an automatic reload loop is not a safe library default.
- useScrollReveal: document-wide selectors/classes, repeated observer setup, and animation policy. Low priority while visual work is paused.

## Already available; extend instead of duplicate

Package already contains numeric parsing/formatting, compactRs, shortCompanyName, toneOf, symbol search, command-key movement, combo state, chart scales and useTweenedNumber. New exact-money and localized-decimal utilities further reduce the need to copy src/lib/format.ts wholesale.

## Extraction checks

New hooks need root and dedicated subpath exports, React client boundaries, declarations, independent budgets, no app imports and lifecycle/SSR tests. Pure layout/math utilities must remain React-free. Preserve consumer behavior until a separate migration task; do not change the web application during extraction. Native browser/React APIs suffice for the first batch.
