# Dependency audit and bundle analysis

Measured 2026-10-31 on branch `feat/financial-calculations` (after merging calculations, hooks/export
and money primitives). Re-run the commands at the end to refresh; update this file in the same PR as
any dependency or budget change.

## Runtime dependencies

| Package | Version | Why | Size | Licence | Alternatives considered |
|---|---|---|---|---|---|
| `react`, `react-dom` | peer `^19.0.0` | Components | not bundled | MIT | — |
| `@remotemerge/nepali-date-converter` | 1.2.5 (exact) | Bikram Sambat ↔ Gregorian conversion tables for the BS calendar | 26 kB unpacked; no transitive dependencies | MIT | Writing our own tables (data provenance burden); larger date libraries (rejected: pull a full date stack). See [calendar research](docs/research/calendar-2026-10-29.md) |

That is the whole production tree (`npm ls --omit=dev`: one package). The converter is imported only by
`src/nepal/calendar.ts`; `scripts/check-boundaries.mjs` fails the build if any other pure module imports
it, so `@punji/ui/nepal/format`, `/money`, `/calculations`, `/export` and `/nepal/market-format` never
pull calendar data.

Rules enforced in CI, not just written down:

- `scripts/check-source.mjs` fails on any import outside `react`, `react-dom` and the converter, and on
  any new entry in `dependencies` other than the reviewed converter version.
- `scripts/check-boundaries.mjs` keeps `nepal`, `calculations`, `money` and `export` free of React,
  components and browser globals; `money` may import only `nepal/decimal`, `nepal/money` and
  `calculations/rounding`.
- `.npmrc ignore-scripts=true`; CI installs with `npm ci --ignore-scripts`.
- `npm run check:lockfile` (lockfile-lint): npm registry only, HTTPS, integrity hashes.

Deliberately not added: date libraries (Intl and the converter cover formatting and BS), icon packs
(inline SVG), a decimal library (bigint minor units cover exact money; see
[FINANCIAL.md](docs/FINANCIAL.md)), table engines and chart libraries (current needs are met by small
owned components; revisit TanStack Table/Virtual only for measured large-data needs), xlsx/pdf writers
(CSV with BOM covers Excel; PDF out of scope).

## Development dependencies

288 packages installed for tooling (TypeScript 7, Vitest 5, jsdom, Testing Library, axe-core, fast-check,
oxlint, Lightning CSS, size-limit, publint, attw, Changesets, lockfile-lint, Playwright, Vite). All are
pinned to exact versions. None ship in the tarball (`scripts/check-pack.mjs` allows only `dist/**/*.{js,d.ts,css}`
plus npm's standard files).

## Vulnerabilities

`npm audit`: 0 info, 0 low, 0 moderate, 0 high, 0 critical (289 packages).

Policy:

- Dependabot security updates are on; version updates run weekly (Monday 04:00 Asia/Kathmandu),
  grouped (dev-tooling minor/patch, React, Actions) with a 7-day cooldown against fresh-release attacks.
- `dependency-review-action` blocks PRs introducing known-vulnerable packages.
- A high/critical advisory in the runtime tree is fixed or the affected module is pulled before the next
  release; in dev tooling it is fixed within a week or documented here with the reason it is not
  reachable.
- GitHub Actions are pinned to commit SHAs with version comments; CodeQL and OpenSSF Scorecard run in CI.

## Bundle sizes (gzip, size-limit)

Every public subpath has its own budget in `.size-limit.json`; `npm run size` fails over budget. A
selection:

| Entry | Gzip | Notes |
|---|---|---|
| `@punji/ui` (everything) | 39.38 kB | Budget 40 kB. Only for measuring; apps should import named exports and let tree-shaking drop the rest |
| `@punji/ui/button` | 576 B | Tree-shaking check: one component stays small |
| `@punji/ui/table` | 2.22 kB | |
| `@punji/ui/calculations` | 1.92 kB | Pure; no React |
| `@punji/ui/money` | 3.44 kB | Pure; includes the exact decimal parser |
| `MoneyDisplay` / `PriceChange` / `CurrencyInput` | 3.80 / 4.25 / 4.54 kB | Each includes `money`; the overlap is shared in an app bundle |
| `@punji/ui/hooks` (all hooks) | 3.90 kB | Individual hooks 0.2–0.9 kB |
| `@punji/ui/export` (CSV) | 877 B | Pure |
| Nepal formatting without calendar | 856 B | |
| Calendar with BS conversion | 8.17 kB | Converter data is the bulk |
| Date pickers incl. Calendar | 11.22 kB | |
| `styles.css` (all) | 13.94 kB | Per-component CSS available under `@punji/ui/css/*.css` |
| `tokens.css` | 1.07 kB | |

Tarball: 211 files, 145 kB packed, 549 kB unpacked (budget 570 KiB in `scripts/check-pack.mjs`).

Known follow-ups:

- `money` at 3.44 kB is the largest pure module; profile whether the compact-unit tables and spoken
  formatting can move to a separate subpath so plain `formatMoney` gets smaller.
- Application-level impact in punji-web is not measured yet; do it when the first modules are
  repointed (see [INTEGRATION.md](docs/INTEGRATION.md)).

## Refresh

```sh
npm audit
npm ls --omit=dev --all
npm run check:lockfile
npm run build && npm run size
node scripts/check-pack.mjs
```
