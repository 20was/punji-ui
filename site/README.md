# Documentation site

A self-contained docs app for `@punji/ui`: Vite + React + the library itself, no other runtime dependency.
It is never published (the package `files` allowlist ships only `dist/`). It imports `@punji/ui` through the
package export map (the built `dist/`), exactly like a consumer, so every example proves the published API.

```
npm run build        # the site reads dist/
npm run site:dev     # gen + vite dev server on http://127.0.0.1:5185
npm run site:build   # gen, client build, SSR build, prerender into site/dist (gitignored)
npm run site:preview # serve site/dist on :4174
npm run typecheck:site
npm run check:site   # Playwright: needs site:build first; screenshots in test-results/site/
npm run check:seo    # offline: reads site/dist (titles, descriptions, canonicals, breadcrumbs, links, sitemap, JSON-LD, stale copy, JS and HTML budgets)
npm run site:brand   # regenerates site/public/favicon.svg, og.svg, og.png from .github/assets
```

## How it fits together

| Piece | Role |
| --- | --- |
| `src/registry.ts` | Typed, data-only list of pages and the sidebar groups. Importable by plain Node. |
| `src/examples/<slug>/<id>.tsx` | One real TSX module per live example. It renders the preview and its raw text is the code shown and copied (one source, so they cannot drift). Typechecked against the package types. |
| `scripts/site-gen.mjs` | Reads the registry, opens the built `.d.ts` with the TypeScript 7 compiler API, writes `src/generated/api.json` (gitignored). Fails the build when an API entry is missing, a page has no API, an example file is missing or unregistered, a `planned` export disappeared, or a registered prop has no doc comment that is not in `undocumented-baseline.json`. |
| `src/app/PageView.tsx` | The page template. A header (group eyebrow, title, one-line `lead`, badges: kind, subpath import with copy, gzip size), then four tabs: **Examples** (variant chips over one framed demo: title bar with per-example light/dark and phone-width toggles, the live stage, a collapsible code panel with copy), **Code** (import lines, every example's full source), **API** (props tables generated from `api`: prop, type, default, description, required marker; inherited attributes collapsed), **Usage** (overview `summary`, when to use and not, keyboard, accessibility, responsive, notes, related). An "On this page" rail on wide screens, previous/next links at the bottom. Guides get an article layout with the same rail. |
| Tabs and no-JS | The tabs are in-page links (`#examples`, `#code`, `#api`, `#usage`). Every panel is in the prerendered HTML; JavaScript shows one at a time (`hidden`) and keeps the hash in step, and a deep link to any section id (`#keyboard`, `#ex-nepal`) opens the tab that holds it. Without JavaScript, a `<noscript>` style in `index.html` shows every panel under its own heading. |
| `src/app/Home.tsx`, `HomeDashboard.tsx` | The overview: hero, a portfolio screen built only from package exports and shared fixtures, a live preview card per domain, and proof points whose figures are computed from the package (rounding, formatting) and the build (gzip sizes). |
| `src/app/App.tsx` | The shell: sticky header (wordmark, version from `package.json` linking to npm, search, GitHub, light/dark/system theme icons), the sidebar (`Sidebar.tsx`: collapsible groups persisted with the library's `useLocalStorage`, short `navTitle` labels), the library's `Drawer` as the mobile menu, and the footer. Search (`Search.tsx`) is the library's `CommandPalette` over titles, leads, descriptions and export names, opened with Command-K, Ctrl-K or `/`. Path routing (History API) through `src/app/router.tsx`; `entry-server.tsx` renders the same `App` for the prerender. |
| `scripts/site-pages.mjs` | Run by `site-gen` (and by the dev server when a registry file changes): splits the registry and `api.json` into what the browser loads, `src/generated/nav.json` (groups and a slim entry per page, for the shell), `home.json`, `search.json` (the search index), `pages/<slug>.json` and `routes/<slug>.ts` (one route module per page: its data, examples and their source text). See "Loading". |
| `src/app/PhoneFrame.tsx`, `preview-frame/index.html`, `src/frame.tsx` | The phone-width preview: the example runs in a same-origin iframe with its own 375 px viewport (390 px for showcase screens), so the package's viewport media queries, `matchMedia` and body portals behave as on a phone. Same stylesheet as the page, the preview theme passed in and kept in step, height follows the content (at least 320 px, room for a menu or listbox). |
| `src/generated/sizes.json` | Written by `site-gen` from `size-limit --json` (the repository's own budget, about two seconds): gzip bytes per subpath for the size badges and the homepage. Gitignored like `api.json`. |

Sample data comes from `fixtures/market-data.ts` through `src/sample.ts` (shared with the visual-regression fixture app; synthetic, not market data).

## Add a page

1. Add an entry to `PAGES` in `src/registry.ts`, including a `description` (120 to 160 characters, unique: the search-result and social text; say what it is in the words people search with, for example "A React currency input for NPR...") and a `lead` (at most 140 characters, plain words for someone evaluating the library; it is the line under the title). Existing pages keep their leads in `src/registry-leads.ts`; an entry's own `lead` wins, and without either the first sentence of `description` is used. Add `navTitle` when the title is too long for the sidebar. Pick the `group` by domain (the sidebar order is `GROUPS`). List every export the page documents in `api` as `{ name, module }` where `module` is the published subpath (`'money-display'`, `'nepal/format'`); the import lines and props tables come from it.
2. Add `src/examples/<slug>/<id>.tsx` for each entry of `examples`; each has `export default function Example()` and imports from `@punji/ui/...` only (plus `../../sample.ts` for data).
3. Fill `use`, `avoid`, `keyboard`, `accessibility`, `responsive` and `related` from the source and its docs; do not write behaviour you have not checked.
4. `npm run site:build` (fails with a precise message if anything is missing), `npm run typecheck:site`, then `npm run check:site` and look at the PNGs in `test-results/site/`.
5. If the page documents an export that was in a group's `planned` list, remove it from there.

A prop without a doc comment in `src` shows "No description in the source yet." and is listed in `undocumented-baseline.json`. Prefer adding the comment in `src` and removing the line from the baseline. New undocumented props on registered components fail the build.

Foundations pages have `api: []` and read their data from the shipped CSS.

## Add a guide

A guide (`kind: 'guide'`, group `get-started`, URL `/get-started/<slug>/`) is prose and code instead of the component template. Add it to `GUIDES` in `src/registry-guides.ts` (kept apart from `registry.ts` so it merges cleanly): a `description` (120 to 160 characters, unique), a `summary`, `related`, and `guide`, a list of sections `{ id, title, paragraphs, points?, code? }`. Paragraphs support `` `code` `` and `[text](/path/ or https://…)` links.

Each `code` block is either `file`, a real TSX file in `src/guides/<slug>/<file>.tsx` that the site typechecks (`typecheck:site`) and shows as text (it is never imported or run, so a file may do what an app's entry file does, such as `createRoot(...)`), or `text`, for shell commands and config that is not TSX (CSS, `vite.config.ts`, `next.config`). Prefer a file. `site-gen` fails on a missing file, on a code block with both or neither, and on a file no guide uses.

Component pages that follow the portal's slugs live in `src/registry-generic.ts` (`GENERIC_PAGES`); other registries can be added the same way and spread into `PAGES`.

## Add a showcase pattern

A showcase page (`kind: 'showcase'`, group `showcase`, URL `/showcase/<slug>/`) is a real product screen built **only** from `@punji/ui` exports plus a small layout stylesheet. It is a pattern to copy, not package API: the page says so in its header badges and a note, and nothing in it is exported by the package. Patterns live in `src/registry-showcase.ts` (`SHOWCASE_PAGES`).

1. Add `src/examples/<slug>/screen.tsx` (`export default function Example()`, imports from `@punji/ui/...`, `../../sample.ts` and `./screen.css` only) and `src/examples/<slug>/screen.css` (layout only: grid, gaps, container queries; colours and type from `--pu-*` tokens). Prefix every class with `sc-<short>-`, because every example's CSS is bundled into the site. Size the layout with container queries on the screen's root, not viewport media queries, so it works in the docs column, a phone and the phone-width preview.
2. Add the entry: `description`, `lead`, `summary`, `use` (shown as "Adapting it"), `avoid` ("What stays yours"), `keyboard`, `accessibility`, `responsive`, `api: []`, one example `{ id: 'screen' }`, and `related`, the documented component pages the screen is built from ("Built from").
3. Headings inside a screen start at `h3` (the page has the `h1` and a visually hidden `h2`); `PageHeader` renders an `h1`, so a screen uses its own `h3` title instead.
4. If a portal page now has its home in the pattern, add the old path to `PORTAL_RENAMES` in `src/seo.ts`. The prerender fails if a redirect source is itself a page here.

The page shows the live screen in the demo frame (light/dark and phone-width toggles, the TSX with copy), then the layout CSS, the summary, "Built from" cards and the notes. `llms-full.txt` carries the TSX and the CSS.

## Add an app

An app (`kind: 'app'`, group `apps`, URL `/apps/<slug>/`) is a complete, full-viewport, multi-screen dashboard built only from `@punji/ui` exports on simulated data. The page frame (`src/app/AppView.tsx`) gives it a slim bar (the page's `h1`, the way back to the docs, a "Source" link to `site/src/apps/<slug>/`, the theme switch) and, under the app, "About this app": the summary, the screens, the data, "Built from" cards and the notes, all from the registry. The docs header, sidebar and footer are not rendered on app pages.

1. Add an entry to `APP_PAGES` in `src/registry-apps.ts`: a short `title` (the bar's `h1`), `description` 120 to 160 characters, a search title of 40 to 62 characters in `src/seo-titles.ts`, `summary`, `use` ("Adapting it"), `avoid` ("What stays yours"), `keyboard`, `accessibility`, `responsive`, `notes`, `related` (the component pages it is built from), `api: []`, `examples: []`, and `app: { screens: [{ id, title, summary }], data }`. `site-gen` and `check:seo` fail on the description and title lengths.
2. Write `src/apps/<slug>/App.tsx` with a default export. `scripts/site-pages.mjs` imports it into the route module. Use the shared kit in `src/apps/shared/`:
   - `kit.tsx`: `AppFrame` (navigation rail on wide screens, a bottom tab bar under 900 px; nav items are `#<screen>` links with `data-testid="screen-<id>"`; a click moves focus to the new screen's heading), `ScreenTitle` (each screen's `h2`), `useScreen(ids, initial)` (the screen in the URL hash, read after hydration), `useTicker(fn, { intervalMs, running })` (runs only in the browser, pauses in a hidden tab), `lazyScreen(() => import('./Screen.tsx'), title)` (a screen in its own chunk with loading and error states and `.preload()` for hover), `useReducedMotion()`.
   - `sim.ts`: the seeded market (`createMarket`, `stepMarket`, `indexOf`, `bookFor`, `dailyCandles`, `shockMarket`, `timeAt`): same seed, same prices on the server and in the browser, so the page hydrates without a mismatch. Never read the clock or `Math.random` during render.
   - `icons.tsx` and `app.css` (`app-` classes: `app-stack`, `app-grid is-split | is-halves`, `app-toolbar-end`, `app-sym`, `app-kbd`). Prefix the app's own classes (`tt-`, `wd-`).
3. Render the first screen statically (it is prerendered); load the others with `lazyScreen`. `check:seo` holds every page to 150 kB of gzipped JavaScript up front; the seven apps load 119 to 139 kB (2026-11-02).
4. Screens start at `h2` (`ScreenTitle`), cards at `h3`. Keep one reducer for the app's state so figures agree across screens, and announce what the app does in a polite live region.
5. `npm run site:build`, `npm run check:seo`, then `npm run check:site`: it opens every screen of every app (through `screen-<id>`) at 390, 768 and 1440 px in light and dark, and fails on axe violations, horizontal overflow and console errors.

## Loading

Each page loads only its own code. `src/app/load.ts` is the one place that knows how:

- **Shell** (every page): React, the header, sidebar, router, theme and `nav.json`; about 85 kB gzip. `registry.ts` is never in the browser bundle: the shell imports `src/paths.ts` (registry-free routes and head data) and `nav.ts`, never `seo.ts`.
- **Route chunks**: the view (`Home.tsx` or `PageView.tsx`) and, for a page, `generated/routes/<slug>.ts`, which statically imports the page data, every example module and their raw text. Package code shared between pages lands in shared chunks.
- **First load**: the prerender asks the SSR build's `preload(path)` which modules the route used, maps them through Vite's manifest (`site/dist/.vite/manifest.json`) and writes a `<link rel="modulepreload">` for every chunk in their graph. `main.tsx` awaits `loadRoute()` before `hydrateRoot`, so hydration renders exactly the prerendered HTML with no extra round trip and no flash. CSS is one file (`cssCodeSplit: false`), linked from every page.
- **Navigation**: `navigate()` loads the next route, then changes the URL, so a page never renders half-loaded. Back and Forward to a page not yet loaded keep the current page until it arrives. A chunk that cannot be fetched (offline, or removed by a new deploy) falls back to a full page load.
- **Search**: the palette and `search.json` load when it first opens (hovering or focusing the button starts it).

`check:seo` enforces the budget: every route's up-front JavaScript (entry script plus modulepreloads, gzip) stays under 150 kB, and every page preloads its own route chunk. On 2026-11-01 the largest route was 140 kB (a showcase screen), a typical component page 100 to 120 kB and the overview 138 kB, against 439 kB for every page before the split.

## Routing

Clean paths, no hash. The section comes from the page kind (`src/paths.ts`, `pagePath`):

| Kind | Path |
| --- | --- |
| overview | `/` |
| `foundation` | `/foundations/<slug>/` |
| `component` | `/components/<slug>/` |
| `utility`, `hooks` | `/utilities/<slug>/` |
| `guide` | `/get-started/<slug>/` |
| `showcase` | `/showcase/<slug>/` |
| `app` | `/apps/<slug>/` |

The section names match the current design.punji.app portal so its URLs and rankings survive the cutover. Canonical URLs carry a trailing slash because every page is a `<path>/index.html`. Links are real `<a href>` (middle-click, copy, no-JS crawlers work); a plain click is intercepted and uses `history.pushState`, then the title, meta description, canonical, Open Graph and JSON-LD are updated and focus moves to the new `h1`. An unknown path renders the 404 view.

Old `#/slug` links (this site's previous scheme) are redirected in the browser before first render (`main.tsx`): `/#/button` becomes `/components/button/` through `history.replaceState`. A hash never reaches a server, so no `_redirects` line can do this.

### Base path and site URL

| Variable | Default | Meaning |
| --- | --- | --- |
| `BASE_PATH` | `/` | Where the site is served: `/` at a domain root, `/punji-ui/` on GitHub Pages project sites. Read by Vite (`base`), the prerender, the SEO check and `check:site`. |
| `SITE_URL` | `https://design.punji.app` | Public origin for canonical URLs, Open Graph, sitemap, robots and llms files. |

Set the same values for `site:build`, `check:seo` and `check:site`, for example `BASE_PATH=/punji-ui/ SITE_URL=https://20was.github.io npm run site:build`. (`check:site` takes `CHECK_URL` to test an already running server.)

## Prerender

`npm run site:build` runs three steps: `vite build site` (client bundle; its `index.html` is the template), `vite build site --ssr src/entry-server.tsx --outDir dist-server` (a Node renderer of the same `App`), and `scripts/site-prerender.mjs`, which awaits `preload` (the route's chunks) and calls `renderToString` once per route, and writes `site/dist/<path>/index.html` with the page's real head and its modulepreload links. Every heading, props table, code block and link is in the HTML without JavaScript; the client then calls `hydrateRoot`. The router takes its first location from the pathname the HTML was rendered for, so hydration is identical (`check:site` fails on any console warning or error). The pre-paint theme script in `index.html` is unchanged. `404.html` is rendered for a path that matches no page.

The script also writes `sitemap.xml`, `robots.txt` (allow all, points at the sitemap), `llms.txt` (summary plus one line per page, linking its Markdown), `llms-full.txt` (every page's text, API and example code), an `index.md` beside every `index.html` (the page as Markdown: text, props tables, example code; the header's "Copy page as Markdown", "View as Markdown" and "Open in ChatGPT/Claude" controls use it, with no third-party script), `_redirects` and `.nojekyll`.

`scripts/site-registry.mjs` runs last and writes the copy-in registry: `site/dist/r/<slug>.json` for every Showcase pattern in the [shadcn registry item schema](https://ui.shadcn.com/docs/registry/registry-item-json) and `r/registry.json` (the index). An item carries the screen (with `'use client'` and a named default export), its layout CSS, a `sample.ts` that re-exports only the fixtures it imports and those fixture files (type imports rewritten to `@punji/ui`), all targeted at `components/punji/<slug>/`, with `@punji/ui@^<version>` as the dependency. `scripts/check-registry.mjs` (part of `check:seo`) validates the JSON, the imports and the Markdown files, and typechecks every item as app code against the built package. `favicon.svg`, `og.svg` and `og.png` (1200x630) are committed in `site/public/`, generated by `npm run site:brand` from the brand art in `.github/assets` and the installed Playwright Chromium, so a normal build needs no browser.

## SEO fields

Each page's head comes from the registry (`headFor` in `src/paths.ts`, shared by the browser, the prerender and the check):

| Tag | Source |
| --- | --- |
| `<title>`, `og:title`, `twitter:title` | `headTitleOf`: a hand-written title from `src/seo-titles.ts` for pages that answer a common search ("React currency input for NPR and any currency \| Punji UI"), else generated as `"<title>: React component for <domain> \| Punji UI"`, shortened to fit 62 characters. Overview: `HOME_TITLE`. 40 to 62 characters, unique. |
| meta description, `og:description`, `twitter:description` | `PageDef.description`: 120 to 160 characters, unique. Written for a search result; `summary` is the longer intro shown under the page header. |
| canonical, `og:url` | `SITE_URL` + `BASE_PATH` + page path. The 404 page has neither (it is `noindex`). |
| `og:*`, `twitter:card=summary_large_image` | `og.png` (one brand card for every page; the title and description change per page) |
| JSON-LD | overview: one `@graph` with `WebSite`, `Organization` (Punji) and `SoftwareSourceCode` (`codeRepository`, `sameAs` npm and GitHub, licence, version-free). Pages: `TechArticle` with `dateModified`, `articleSection`, `publisher`, `about` (the package) and a `BreadcrumbList`: Punji UI, then the page's group (a link to its section on the overview, `/#domain-<group>` or `/#showcase`, when it has one), then the page. The visible breadcrumb above each `h1` is the same trail. |
| `lang`, `theme-color` (light and dark), `robots` | fixed: `index,follow,max-image-preview:large` (`noindex` on 404) |
| sitemap `<lastmod>`, `dateModified` | `scripts/site-dates.mjs`: the newest commit touching the page's examples, guide files or documented `src/<module>` (registry files are left out, they hold every page). Needs full git history; `docs.yml` checks out with `fetch-depth: 0`. |

Each component page shows its `summary` as a visible intro under the header, then the tabs; the Usage tab has when to use it and when not, keyboard, accessibility, responsive notes, related pages and "Seen in these screens" (the showcase patterns whose "Built from" lists it).

`npm run check:seo` (in `verify` and CI) reads `site/dist` and fails when a route lacks a unique title (40 to 62 characters), description (120 to 160) or canonical, an Open Graph or Twitter tag, valid JSON-LD (the overview's graph nodes, a page's `TechArticle` with a real `dateModified`, a `BreadcrumbList` from the overview to the page with positions in order, every item a built URL), a visible breadcrumb matching it, exactly one `h1` and unskipped heading levels; when an `<img>` has no `alt`, a link has no text, or any internal link or asset is missing from the build; when the build, `llms.txt` or `README.md` carries pre-release copy ("not published yet", "after the first release", "pre-release"); when a page is linked only from the sidebar (no related card, guide link or "Built from" points at it); when the 404 page names a canonical; when `sitemap.xml` and the routes differ or a URL lacks `<lastmod>`; when a page's HTML is over 50 kB gzipped; or when robots, llms or `_redirects` point at something that is not built.

## Hosting

The output of `npm run site:build` is `site/dist`: static files only, no server code. A host needs:

1. The `site/dist` folder as the publish directory, served at the path in `BASE_PATH`.
2. `404.html` served with status 404 for unknown paths (the fallback).
3. Directory URLs: `/components/button/` serves `components/button/index.html`.

**Live host (2026-11-01): Cloudflare static assets.** `wrangler.jsonc` serves `site/dist` as the Worker `punji-ui-docs` (no script; `html_handling: auto-trailing-slash`, `not_found_handling: 404-page`), with `_redirects` from the prerender and `_headers` from `scripts/site-headers.mjs` (a CSP that allows this build's inline scripts by hash, HSTS, nosniff, referrer and permissions policy, immutable caching for `/assets/*`). `.github/workflows/docs.yml` deploys on pushes to `main` once `DOCS_DEPLOY_ENABLED=true`, the `CLOUDFLARE_API_TOKEN` secret and the `CLOUDFLARE_ACCOUNT_ID` variable are set. design.punji.app is a custom domain on that Worker. Every portal path now resolves: the last 85 (app-specific, shell and brand pages) redirect to the nearest page here or to the overview (`PORTAL_RENAMES`, `PORTAL_TO_HOME`).

**Cloudflare Pages** (domain root, `BASE_PATH=/`): build command `npm ci --ignore-scripts && npm run build && npm run site:build`, output directory `site/dist`. It serves `404.html` automatically and reads `_redirects` (the renamed portal paths below). Check once that `/components/button` (no slash) and `/components/button/` both resolve to a single canonical form; the canonical tag points at the trailing-slash URL.

**GitHub Pages** (project site, `BASE_PATH=/punji-ui/`, `SITE_URL=https://20was.github.io`): publish `site/dist`. `404.html` is served for unknown paths; `.nojekyll` is included; `_redirects` is ignored, and `robots.txt` is only honoured at a host root. `/components/button` redirects to the trailing-slash URL, matching the canonical.

No deploy workflow is included.

### Replacing the portal at design.punji.app

This site is meant to replace the current portal there. The cutover keeps `/components/<slug>`, `/utilities/<slug>` and `/foundations/<slug>` where the same page exists (17 paths are identical, for example `/components/button`, `/components/data-table`, `/foundations/typography`). Where the slug differs, `_redirects` sends the old path to the new page with a 301: `/foundations/colour` to `colour-tokens`, `/utilities/formatting` to `formatters`, `/components/meter` to `meter-range`, `/components/bars` to `split-bars`, `/components/empty-state` and `/components/skeleton` to `empty-skeleton`, `/components/checklist` and `/components/check-row` to `check-list`, `/components/distribution-bar` to `share-bars`, `/components/summary-figure` to `metric-tile`, `/components/fact-list` to `key-stats`, and `/docs` to `/`. The list is `PORTAL_RENAMES` in `src/seo.ts`.

**Showcase homes (2026-11-01).** 32 portal paths now redirect to a Showcase pattern or the nearest component page (the second block of `PORTAL_RENAMES`):

| Showcase pattern | Old portal paths |
| --- | --- |
| `/showcase/app-band/` | app-strip, store-buttons, product-shot |
| `/showcase/app-header/` | site-header, `/shell/top-bar`, market-mark, market-mark-detail, notification-bell, menu-panel, phone-menu |
| `/showcase/market-board/` | market-strip, market-report, breadth-bar, quote-list |
| `/showcase/stock-detail/` | quote-hero, symbol-block, security-title, candle-chart, `/patterns/charts` |
| `/showcase/watchlist-alerts/` | watchlist-row, watch-summary, alert-row, alert-summary, alert-panel, `/utilities/alert-distance` |
| `/showcase/portfolio-tracker/` | two-line-chart, `/patterns/figures` |
| `/showcase/mobile-account-home/` | app-tab-bar |
| `/showcase/payment-flow/` | `/patterns/forms` |
| component pages | `/shell/title-row` to page-layout; `/shell/loading` and `/patterns/states` to empty-skeleton |

The other patterns (invoice, bank statement, accounting dashboard, dividend tracker, IPO result check) have no portal predecessor. Brand pages, the marketing parts (landing-section, cta-band, faq-section, feature-card, site-footer) and the remaining product components still need an owner decision.

Portal URLs that still have no page here (they will return 404 until each is given a page, a redirect or a deliberate retirement), counted from the portal's `src/design/registry.ts` (178 paths) against this site's routes and `PORTAL_RENAMES` before the showcase redirects: **125 of 178**; the 32 redirects above bring it to **93**, less any component pages added in parallel (re-run the count). Every `/get-started/*` page, and every generic kit component that the groups' `planned` lists named, now has a page; the `planned` lists are empty except `Calendar`.

- `/get-started/`: none left. `using`, `security`, `roadmap` and `agents` keep their portal slugs; `nextjs`, `vite`, `theming`, `ssr`, `tailwind` and `live-data` are new guides in the same section. The sidebar group is "Get started".
- **Brand (4):** logo, usage, app-icon, downloads. Brand owner decides (301 to the overview, or brand pages).
- **Shell (1 left):** sidebar (top-bar, title-row and loading now redirect). **Patterns:** all four redirect (see the table above). **Foundations (2):** motion, icons. **Utilities (1 left):** routes (alert-distance redirects to the watchlist pattern).
- **Generic components with an export in `@punji/ui` but no page yet (10 of the 109 missing `/components/` pages):** chip, filter-chip, show-more, inline-confirm, avatar, status-tag, stat-tile (`StatGrid`, `StatTile`), sheet (`Sheet`, `Dock`), drawer-screen, and trend-chart (only the `bracketScale` and `valueScale` helpers are exported). These are the next candidates for real pages; `Calendar` is the one export still in a `planned` list.
- **App-specific components of the Punji product, not in this package (99, of which 26 now redirect to a Showcase pattern, listed above):** broker-badge, broker-lookup, broker-days, tms-address, tms-anatomy, alert-form, alert-panel, alert-row, alert-summary, rotation-map, group-counts, group-pill, phase-strip, group-change-list, rating-chip, rating-scale, rating-change-row, run-quota, forecast-note, sale-estimate, store-buttons, app-strip, site-header, site-footer, phone-menu, landing-section, cta-band, faq-section, product-shot, feature-card, market-strip, market-report, market-mark, quote-hero, symbol-block, and the chart, row and tile pages (candle-chart, equity-chart, histogram, correlation-matrix, and so on). The owner decides, page by page, whether each gets a redirect to the nearest page here, a Showcase page, or a retirement.
- Other agents are adding chart, banking and portfolio pages in parallel; re-run the count (a script comparing the portal's paths with `ROUTES` and `PORTAL_RENAMES`) when those land, since some of the 99 will then have pages.

Decisions (2026-10-31):

- **No cutover while pages are missing.** Before design.punji.app switches to this site, every portal path must resolve: the 18 generic kit components get real pages; `/get-started/*` becomes the getting-started guides; app-specific components and `/patterns/*` become Showcase pages (patterns built from package exports, see ROADMAP.md) or a 301 to the nearest Showcase or group page. `/brand/*` stays with the brand owner: 301 to the overview unless brand pages are added. A 404 is acceptable only for pages that are deliberately retired, listed in `PORTAL_RENAMES` as such.
- **Trailing slash is canonical.** Cloudflare Pages serves `dir/index.html` at `/path/` and redirects the bare form; confirm with one request after the first deploy.
- **`og.png` keeps "design.punji.app".** It is the only docs domain.