# punji-web → @punji/ui migration

Status: planning. The library is being brought to parity first; punji-web migrates once the waves below are released. punji-web is not changed from this repository.

Detailed audits (read-only, 2026-11-07):

- [parity-kit-and-shared.md](parity-kit-and-shared.md): web `src/components` (incl. the kit), design, lib, hooks, tokens, CSS, dependencies. 226 rows.
- [parity-screens.md](parity-screens.md): web `src/me` and `src/pages`, per screen. 125 rows.

## How web uses the library today

Web does not consume the npm package yet. `@punji/ui` and ~150 subpaths are a tsconfig alias to web's own `src/components/kit`, the ancestor of this library. Screens already import by package name, so for most of them the migration is switching the alias to the package, one module at a time. Of 131 subpaths the screens import, 89 are not exported by the package yet; those modules are the bulk of the work.

## Verdicts

| Verdict | Kit and shared | Screens | Meaning |
|---|---:|---:|---|
| ui-better | 36 | 28 | Replace web's version with the library's. |
| ui-equal | 38 | 20 | Replace; same behaviour. |
| partial | 61 | 54 | Library has it but lacks a named prop or behaviour; close the gap first. |
| missing, generic | 35 | 15 | Build in the library. |
| missing, app-specific / web-only | 56 | 8 | Stays in web (brand, marketing, site navigation, routing, data). |

## Preconditions

1. **Release 0.3.0.** Most of what is "ui-better" (LinkProvider, menu, accordion, breadcrumb, status banner, table-core, token scales, overlay accessibility, one money path) is merged but unreleased.
2. **CSS order.** Web's kit CSS is unlayered and beats the library's `@layer punji.*` rules for shared `kit-*` classes. Remove each web kit stylesheet together with its alias, never one without the other.

## Waves

Each wave lands in the library with docs, tests and a `beta` stability tag, keeping web's kit API where it is sound so the alias swap needs no screen edits. Where the API changes, the change is listed in the module's docs page under "Migrating from the web kit".

| Wave | Contents |
|---|---|
| 1. App primitives | `ThemeProvider`/`useTheme` (persisted, no flash), `PrivateAmount` + `masked` on money display, `SkipLink`, `RouteAnnouncer`, `CardSection`, `SettingRow`/`SettingList`, `LinkRow`, typed confirmation on `InlineConfirm`/`AlertDialog` |
| 1. Icons | `@punji/ui/icons`: one icon set replacing web's `NavIcon` (2 copies), `SettingIcon`, `ui/icons.tsx` and notice/inbox glyphs |
| 1. Market primitives | `MarketStatus` offline state + session sentence, `InstrumentHeader`, `BrokerBadge`, `HeadlineList`, `displayCompanyName`, `RatingScale`/`RatingChip`/`RatingChangeRow`, `MonthStrip`, `BarList`, price alerts (`AlertRow`, `AlertSummary`, `alertDistance`, `alertTarget`) |
| 2. Menus and shells | Menu parity (`MenuHead`, item `hint`, `busy`, controlled open, phone sheet for row menus), `NotificationBell`, `InboxList`, `BottomTabBar`, `ReorderList`, `Checklist`, `LockedCell`/`LockedPreview` |
| 2. Charts | `PerformanceChart` reference/target line, drawdown band, contributions series, end-value legend, keyboard scrub and rebase-to-100 compare; `MonthGrid` + `ReturnsHeatTable`; `Histogram`; `CorrelationMatrix`; standalone inspection via `ChartA11yShell` for web's own SVG charts |
| 3. Screener and content | `RangeEditor` + grouped `FilterMenu` + `PresetTile` with URL state; read-only sortable table in a scroll region; article kit (callout, key facts, timeline, sources, table of contents); watchlist row parity |
| 4. Web side (punji-web team) | Swap aliases module by module, delete web kit CSS with each, move money to bigint from API strings, replace float fee maths with the web contracts or `nepse-fees`, adopt `--pu-z-*` |

## Behaviour differences to plan for

From the audits; each needs either a library option or a deliberate change in web.

- **Pagination:** web pages are 0-based, the library's are 1-based.
- **Money text:** `formatNPR` prints `NPR`/`रु` and `—`; web prints `Rs`/`रु.` and `-`. Use `format.rs` for web's style.
- **Exactness:** web holds money as JS numbers. Convert to bigint minor units from API strings, never from the numbers.
- **Fees:** the library's NEPSE fee schedule is an example; web's backend-shared contracts carry the dated CGT periods and stay the source.
- **BS calendar:** the library's exact fiscal year changes labels near mid-July versus web's +57 approximation; month spellings differ (Asar/Asoj vs Ashadh/Ashwin).
- **Hydration:** `Intl` date output can differ between the Node prerender and the browser; pin the locale and time zone.
- **CompanySearch:** `clearOnOpen` defaults to true; finders that keep the typed query pass `false`.
- **CheckRow:** classes renamed `kit-check*` → `kit-crow*`.
- **Treemap:** `squarify` throws at zero size where web returns an empty list.

## Removable in web after migration

`uplot` (unused today). Tailwind remains in 58 files and is out of scope for the library.
