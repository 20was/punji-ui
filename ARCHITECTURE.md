# Architecture

Top-level view of `@punji/ui` at `cfe3d47`. Detail, security notes and size reasoning: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Where the two differ, this page says so under "Differences".

## Ownership model

```
punji-ui (this repo, source of truth)  -->  npm @punji/ui (exact version)  -->  punji-web (consumer)
```

| Fact | State |
| --- | --- |
| Reusable components, CSS, tokens and pure utilities | Edited only in `src/` here |
| Reverse sync from punji-web | Retired; `npm run sync` throws |
| Published to npm | No. `version` is `0.0.0`; release is gated ([RELEASE.md](RELEASE.md)) |
| punji-web consumption | Not started. It still aliases `@punji/ui` to its own `src/components/kit/`. Plan: [docs/INTEGRATION.md](docs/INTEGRATION.md) |
| Docs site | `site/` is a self-contained docs app in this repo (`npm run site:dev`, `site:build`, built in CI; [site/README.md](site/README.md)) with 16 pages. The legacy full portal (`design.punji.app`, about 35 pages) still lives in punji-web; `npm run portal` patches a sibling checkout in memory. Hosting is undecided, see [AUDIT.md](AUDIT.md) |
| `scripts/audit-web.mjs` | Read-only comparison against a punji-web checkout |

## Module layout and exports

- One folder per module under `src/` (for example `src/button/Button.tsx`), each with its own CSS in `src/styles/<name>.css`.
- `package.json` `exports` has 89 entries: `.` (everything), one subpath per module (`./button`, `./table`, `./money`, `./nepal/calendar`, ...), `./styles.css`, `./tokens.css`, `./css/*.css`.
- Every subpath value must also exist on the root barrel and be the same object (`check:exports`). Small subpaths exist so consumers do not pay for the whole kit; the root is a compatibility barrel.
- Granular Nepal entry points: `nepal/format`, `nepal/calendar` (the only importer of the converter), `nepal/money`. `@punji/ui/money` is the currency-generic layer.
- Output is ESM only plus `.d.ts` (`engines.node >=22.12`, React 19 peers, `sideEffects: ["**/*.css"]`). `files` ships `dist`, `CHANGELOG.md`, `THIRD_PARTY_NOTICES.md`.

## Pure versus client modules

| Kind | Where | Rule | Enforced by |
| --- | --- | --- | --- |
| Pure | `src/nepal`, `src/calculations`, `src/money`, `src/export` | No React, no `.tsx`, no browser globals; only listed imports | `scripts/check-boundaries.mjs` (in `npm run lint`) |
| Client | Components, hooks | `'use client'` exactly when the file uses hooks, `createPortal`, inline handlers or `requestAnimationFrame` | `scripts/check-source.mjs` |
| Any | All of `src/` | Imports only `react`, `react-dom`, the pinned converter; no `dangerouslySetInnerHTML`, `eval`, `new Function`; every export subpath has a source file; the only runtime dependency is `@remotemerge/nepali-date-converter@1.2.5` | `scripts/check-source.mjs` |

`check-boundaries` lists:

| List | Contents |
| --- | --- |
| `PURE` (dir: file allowed one external import) | `nepal` (`calendar.ts` may import the converter), `calculations`, `money`, `export` |
| `SHARED` (pure modules a pure dir may reuse) | `money` may import `../nepal/decimal.ts`, `../nepal/money.ts`, `../calculations/rounding.ts` |

Other guards: `check-css.mjs` (no raw colours in component CSS; every `var(--pu-*)` is defined in `tokens.css`), `check-exports.mjs` (see above), `check-pack.mjs` (tarball allows only `dist/**/*.{js,d.ts,css}` plus standard files, requires `THIRD_PARTY_NOTICES.md`, caps unpacked size at 680 KiB). Exact commands: [QUALITY.md](QUALITY.md).

## CSS, tokens and themes

- Build: Lightning CSS (`scripts/build-css.mjs`) resolves `@import`, minifies and lowers syntax for Chrome/Edge 111, Firefox 113, Safari/iOS 16.4. No source maps.
- Layers: `@layer punji.tokens, punji.components;`. Tokens are in `punji.tokens`, all component rules in `punji.components`, so an unlayered consumer rule always wins.
- Tokens: 85 defined `--pu-*` custom properties (`check-css` count) (`src/styles/tokens.css`; table in [docs/tokens.md](docs/tokens.md)).
- Themes: follow `prefers-color-scheme`; `data-theme="light"|"dark"` on any element forces one for its subtree.
- Distribution: `styles.css` (everything), or `tokens.css` + `css/base.css` + `css/<name>.css`. CSS imports stay explicit; the package has no JS side effects.

## Numeric model

| Layer | Representation | Where |
| --- | --- | --- |
| Exact money and ledger maths | `bigint` minor units; decimal strings parsed by `parseMinorUnits` (length-capped, rejects excess precision, never rounds silently); caller passes a `RoundingMode` | `nepal/decimal`, `nepal/money`, `money`, `calculations` |
| Ratios and display | `number` (percent units, `5` means 5%), display only, `null` when undefined | `calculations/ratios`, `format` |
| Missing values | An explicit missing marker, never zero | Formatters and components |
| JSON boundary | Callers serialise `bigint` explicitly | Documented in [docs/FINANCIAL.md](docs/FINANCIAL.md) |

Display numbers are not an accounting engine. Currency, tax and fee policy belong to the application.

## Nepal first, generic by design

Nepal support (BS calendar, NPR, `en-IN` grouping, Devanagari digits, fiscal years, NEPSE-style market formatting) is built as presets and separate entry points over generic cores: currency exponent comes from Intl, dates are date-only `{year, month, day}`, instants use an explicit IANA zone (`Asia/Kathmandu`). Legacy `formatNPR` and friends are kept. BS range supported: 1975 to 2099.

## Testing layers

| Layer | Tool | Detail |
| --- | --- | --- |
| Unit and component | Vitest + jsdom + Testing Library | `test/*.test.ts(x)` |
| Property | fast-check, `FC_NUM_RUNS` (default 100) | `test/fc.ts` |
| Accessibility (jsdom) | axe-core, serious/critical | `test/axe.ts`; contrast disabled |
| Visual, interaction, axe (browser) | Playwright in the pinned Docker image | `test/visual/`, [docs/VISUAL-TESTING.md](docs/VISUAL-TESTING.md) |
| Docs site | `scripts/site-gen.mjs` (registry and props from built `.d.ts`), `typecheck:site` (examples are real TSX), `check:site` (Playwright: 17 routes x 2 widths x 2 themes, axe, overflow, console, copy/theme/search/drawer) | `site/`, `npm run site:build` |
| Packaged-example checks | Playwright against `examples/` | `check:examples`, `check:portal`, `check:calendar`, `check:fields`, `check:select`, `check:table` |
| Package | publint, attw, pack, exports, size-limit | [QUALITY.md](QUALITY.md) |

## Build

`npm run build` = `scripts/clean.mjs`, then `tsc -p tsconfig.build.json` (ESM and declarations into `dist/`), then `scripts/build-css.mjs`. `prepack` runs the build. There is no bundler for the library; modules are not bundled, so `'use client'` directives survive.

## Engineering decision record

Sources: [docs/RESEARCH.md](docs/RESEARCH.md), [docs/research/](docs/research/), [DEPENDENCY-AUDIT.md](DEPENDENCY-AUDIT.md), [docs/INTEGRATION.md](docs/INTEGRATION.md). The original `punji-ui-plan` is not in this repository, so rationale not written in those files is not recorded here.

| Decision | Alternatives | Why |
| --- | --- | --- |
| This repo owns source; consumer pulls a published exact version | Reverse sync; `file:` link; `npm link`; workspaces; git dependency; committed tarball | Reverse sync overwrote library code. A registry artefact is reproducible in CI and carries provenance. Tarball only as a local loop or fallback (INTEGRATION.md section 2) |
| Wrap `@remotemerge/nepali-date-converter@1.2.5` for BS dates | Own tables; `sbmdkl/nepali-date-converter`; larger date libraries | MIT, no transitive deps, 26 kB, strict range checks, ESM types. Isolated to `nepal/calendar` so other entry points stay light (RESEARCH.md) |
| `bigint` minor units for money | Decimal library; floating point | Exact, no dependency, Intl supplies exponents (DEPENDENCY-AUDIT.md) |
| Display ratios as `number`, kept apart from ledger maths | One numeric type | Ratios are lossy by nature; avoids implying display values are exact |
| Date-only values separate from instants | `Date` everywhere | Avoids host-timezone drift; fiscal year derives from BS month, not a fixed July day (RESEARCH.md) |
| Native elements and APG patterns, no headless dependency | Radix, React Aria, Spectrum | Dependencies are reviewed one by one; these were studied for behaviour, none adopted, no code copied (RESEARCH.md) |
| No chart, table-engine or icon dependency yet | Tremor, TanStack Table/Virtual | Needs met by small owned components; revisit only for measured large-data needs |
| CSS variables in cascade layers, Lightning CSS | CSS-in-JS; Tailwind | Overridable without specificity fights, SSR-safe, no runtime |
| ESM only | Dual CJS/ESM | React 19 peers and modern consumers; checked with `attw --profile esm-only` |
| Per-subpath size budgets | One bundle budget | Guards consumers who import single modules; the aggregate budget was raised repeatedly (see AUDIT.md) |
| Playwright in a digest-pinned Docker image for baselines | Host screenshots; hosted service | Deterministic fonts and anti-aliasing; no external service |
| Trusted Publishing (OIDC) with provenance, no npm token | `NPM_TOKEN` secret | No long-lived secret; tarball linked to workflow run ([RELEASE.md](RELEASE.md)) |
| One library theme (light/dark); host accents are scoped token overrides in the app | Separate public and account themes in the library | Keeps one token contract; apps own brand accents (docs/INTEGRATION.md §9) |
| `src/styles/tokens.css` is the canonical UI token source | Generate from the app monorepo `tokens.json` | Single source of truth in the published package; app keeps app-only tokens |
| `OrderBook` and `OrderBookDepth` stay separate | Fold into one component | A price ladder and a cumulative depth view are different jobs |
| App-specific UI is shown as showcase patterns built from package exports, not exported components | Export app components (AppStrip etc.); drop their pages | More real-world examples and indexable pages without public API for product-specific pieces |
| First release `0.1.0`, no release candidate | rc prerelease, committed tarball | No consumers yet; pre-1.0 already signals instability; exact pin in punji-web |

## Differences from docs/ARCHITECTURE.md

| Topic | docs/ARCHITECTURE.md | Reality |
| --- | --- | --- |
| Aggregate budget | 21 kB gzip, 4 kB financial, 4.5 kB Nepal | `.size-limit.json` (48.3 kB measured 2026-10-31) |
| Tarball ceiling | 400 KiB | `MAX_UNPACKED` in `scripts/check-pack.mjs` (732 kB measured 2026-10-31) |
| Status line | "implemented foundation, 2026-10-28"; the 4 kB financial and 4.5 kB Nepal budgets still match `.size-limit.json` | Hooks, export, calculations, money, 10 migrated modules and the visual gate were added since |
