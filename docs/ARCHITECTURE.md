# Package ownership and architecture

Status: implemented foundation, 2026-10-28. The broader financial-library programme remains open in [the audit](audit/README.md).

## Source of truth

`punji-ui/src` now owns the reusable components, tokens, and pure utilities. The reverse sync workflow is removed, its command fails explicitly, and CI no longer rejects source edits. `punji-web` is a read-only reference until a separately planned migration. Its deployed design site still demonstrates its own kit; those examples do not prove this package works. Local `examples/` imports the built public package and is built and typechecked in CI.

Existing exports and defaults remain; missing root exports are additive. Removing `private` makes the package packable for publication. The release workflow additionally requires repository variable `UI_NPM_RELEASE_ENABLED=true` and the existing protected npm environment / Trusted Publisher configuration. This task does not publish, enable that variable, migrate the consumer, or deploy the docs.

## Module boundaries

- React 19 peers, ESM plus declarations; CSS is the only side effect. No router, backend, authentication, browser persistence, analytics or business-rule dependencies.
- Root and stable subpath exports agree at runtime (`check:exports`); `publint` and `attw` check package resolution. Importing styles remains explicit.
- Existing low-level primitives remain the foundation. `financial` composes them rather than implementing another table or state system. Rows, formatting, sorting, labels and actions are supplied by the caller. Client callbacks require client boundaries in RSC apps.
- `nepal/locale` contains types/constants. `nepal/nepal` formats displays using Intl. `nepal/calendar` delegates conversion to a pinned table-based library. `nepal/money` handles decimal strings and bigint minor units. Display numbers are not an accounting engine.
- Published JS retains `use client`. Vite warns when consuming these directives in the client-only showcase bundle; package modules are not bundled and retain them.
- Single-column phone navigation and overflow-contained tables are deliberate first iterations. No virtualisation, headless abstraction layer, CSS framework or large chart dependency is introduced.

## Security and data contracts

React text rendering is used throughout; no HTML injection, log output of financial rows, telemetry, fetch, local storage or sample credentials. Examples use explicitly synthetic data. Unknown, NaN and infinite display amounts become an explicit missing marker, never zero. Order-book invalid or negative values are missing. Chart gaps remain gaps and data is also available in a semantic table. FinancialTable is a display/composition API, not a calculation engine or permission boundary.

`parseMinorUnits` accepts ungrouped decimal strings, caps input length, rejects excessive precision instead of rounding, and returns bigint. Currency, exchange, fees, tax and rounding policy belong to the application/domain layer. Bigints must be serialized explicitly when crossing JSON boundaries.

Existing pinned Actions, lockfile integrity checks, install without lifecycle scripts, registry signatures, dependency review, CodeQL, provenance and SBOM remain. The one new runtime dependency is explicitly allowlisted; its exact version and licence are documented below. npm audit found no known vulnerabilities during installation; this is not a security certification.

## Size budget change

The old whole-barrel budget assumed an incomplete root. Restoring omitted exports plus financial compositions and the BS date table increases the all-exports bundle from the old 11.5 kB budget to a measured roughly 20 kB gzip. New ceiling: 21 kB, with independent 4 kB financial / 4.5 kB Nepal budgets; existing primitive budgets are unchanged. Tarball budget increases from 320 to 400 KiB for added JS/declarations. These are deliberate additions, not fixes to a baseline failure. Consumers can continue importing small subpaths.

## Granular Nepal entry points

`@punji/ui/nepal` and the root remain compatibility barrels. Applications can
choose smaller dependency graphs:

- `@punji/ui/nepal/format`: Intl-based formatting and locale constants; no calendar converter or React.
- `@punji/ui/nepal/calendar`: BS conversion, explicit instant/date handling and fiscal years; owns the converter dependency.
- `@punji/ui/nepal/money`: exact decimal/minor-unit arithmetic; no calendar converter or React.
- `@punji/ui/money`: currency-generic exact formatting and parsing of minor units (bigint) with Intl-derived exponents; pure, and may import only `nepal/decimal`, `nepal/money` and `calculations/rounding` (enforced by `check-boundaries`). `money-display`, `price-change` and `currency-input` are the React primitives over it.

`check-boundaries.mjs` runs during lint and prevents Nepal modules from importing
components, React, browser globals or unreviewed external modules. Only the
calendar module may import the converter. Existing APIs and rendered UI are
unchanged by this split.

Public export validation now imports through Node's package self-reference
(`@punji/ui/...`) instead of bypassing the export map with filesystem URLs.
It verifies declaration targets exist and runtime subpath values match the
root. Strict publint and are-the-types-wrong checks remain responsible for
conditional export/type resolution. Independent size budgets cover formatting
and exact money, plus the existing root Button tree-shaking regression check.

## Local full-portal documentation integration

`npm run portal` serves the existing complete portal with package-owned pages
registered from `portal/registry.mjs`. A read-only Vite adapter loads the sibling
consumer's configuration and extends its registry/routes in memory; no consumer
source is changed. This is a local development integration, not an independent
production docs build. See `portal/README.md` for setup and the remaining portal
ownership boundary. Package examples import built utilities, with React
deduplicated against the portal runtime. New portal pages are typechecked in CI.

Native `ne-NP` grouping differs between the inspected Chrome and Node runtimes.
Both number-formatting APIs therefore explicitly use `en-IN` for South Asian
grouping, independently of the selected digits and translated currency label.
