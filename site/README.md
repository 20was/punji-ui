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
npm run check:seo    # offline: reads site/dist (titles, descriptions, canonicals, links, sitemap, JSON-LD)
npm run site:brand   # regenerates site/public/favicon.svg, og.svg, og.png from .github/assets
```

## How it fits together

| Piece | Role |
| --- | --- |
| `src/registry.ts` | Typed, data-only list of pages and the sidebar groups. Importable by plain Node. |
| `src/examples/<slug>/<id>.tsx` | One real TSX module per live example. It renders the preview and its raw text is the code shown and copied (one source, so they cannot drift). Typechecked against the package types. |
| `scripts/site-gen.mjs` | Reads the registry, opens the built `.d.ts` with the TypeScript 7 compiler API, writes `src/generated/api.json` (gitignored). Fails the build when an API entry is missing, a page has no API, an example file is missing or unregistered, a `planned` export disappeared, or a registered prop has no doc comment that is not in `undocumented-baseline.json`. |
| `src/app/PageView.tsx` | The page template: overview, when to use and not, import (subpath and root, generated from `api`), live preview with variant switcher, code with copy, props tables, keyboard, accessibility, responsive, notes, related. |
| `src/app/App.tsx` | Shell built from the library: `AppShell`, `Drawer` (mobile menu), `ListFilter` (search), `SegmentedControl` (theme), `useLocalStorage` (persisted theme). Path routing (History API) through `src/app/router.tsx`; `entry-server.tsx` renders the same `App` for the prerender. |

Sample data comes from `fixtures/market-data.ts` through `src/sample.ts` (shared with the visual-regression fixture app; synthetic, not market data).

## Add a page

1. Add an entry to `PAGES` in `src/registry.ts`, including a `description` (40 to 160 characters: the search-result and social text). Pick the `group` by domain (the sidebar order is `GROUPS`). List every export the page documents in `api` as `{ name, module }` where `module` is the published subpath (`'money-display'`, `'nepal/format'`); the import lines and props tables come from it.
2. Add `src/examples/<slug>/<id>.tsx` for each entry of `examples`; each has `export default function Example()` and imports from `@punji/ui/...` only (plus `../../sample.ts` for data).
3. Fill `use`, `avoid`, `keyboard`, `accessibility`, `responsive` and `related` from the source and its docs; do not write behaviour you have not checked.
4. `npm run site:build` (fails with a precise message if anything is missing), `npm run typecheck:site`, then `npm run check:site` and look at the PNGs in `test-results/site/`.
5. If the page documents an export that was in a group's `planned` list, remove it from there.

A prop without a doc comment in `src` shows "No description in the source yet." and is listed in `undocumented-baseline.json`. Prefer adding the comment in `src` and removing the line from the baseline. New undocumented props on registered components fail the build.

Foundations pages have `api: []` and read their data from the shipped CSS.

## Routing

Clean paths, no hash. The section comes from the page kind (`src/seo.ts`, `pagePath`):

| Kind | Path |
| --- | --- |
| overview | `/` |
| `foundation` | `/foundations/<slug>/` |
| `component` | `/components/<slug>/` |
| `utility`, `hooks` | `/utilities/<slug>/` |

The section names match the current design.punji.app portal so its URLs and rankings survive the cutover. Canonical URLs carry a trailing slash because every page is a `<path>/index.html`. Links are real `<a href>` (middle-click, copy, no-JS crawlers work); a plain click is intercepted and uses `history.pushState`, then the title, meta description, canonical, Open Graph and JSON-LD are updated and focus moves to the new `h1`. An unknown path renders the 404 view.

Old `#/slug` links (this site's previous scheme) are redirected in the browser before first render (`main.tsx`): `/#/button` becomes `/components/button/` through `history.replaceState`. A hash never reaches a server, so no `_redirects` line can do this.

### Base path and site URL

| Variable | Default | Meaning |
| --- | --- | --- |
| `BASE_PATH` | `/` | Where the site is served: `/` at a domain root, `/punji-ui/` on GitHub Pages project sites. Read by Vite (`base`), the prerender, the SEO check and `check:site`. |
| `SITE_URL` | `https://design.punji.app` | Public origin for canonical URLs, Open Graph, sitemap, robots and llms files. |

Set the same values for `site:build`, `check:seo` and `check:site`, for example `BASE_PATH=/punji-ui/ SITE_URL=https://20was.github.io npm run site:build`. (`check:site` takes `CHECK_URL` to test an already running server.)

## Prerender

`npm run site:build` runs three steps: `vite build site` (client bundle; its `index.html` is the template), `vite build site --ssr src/entry-server.tsx --outDir dist-server` (a Node renderer of the same `App`), and `scripts/site-prerender.mjs`, which calls `renderToString` once per route and writes `site/dist/<path>/index.html` with the page's real head. Every heading, props table, code block and link is in the HTML without JavaScript; the client then calls `hydrateRoot`. The router takes its first location from the pathname the HTML was rendered for, so hydration is identical (`check:site` fails on any console warning or error). The pre-paint theme script in `index.html` is unchanged. `404.html` is rendered for a path that matches no page.

The script also writes `sitemap.xml`, `robots.txt` (allow all, points at the sitemap), `llms.txt` (summary plus one line and URL per page), `llms-full.txt` (every page's text, API and example code), `_redirects` and `.nojekyll`. `favicon.svg`, `og.svg` and `og.png` (1200x630) are committed in `site/public/`, generated by `npm run site:brand` from the brand art in `.github/assets` and the installed Playwright Chromium, so a normal build needs no browser.

## SEO fields

Each page's head comes from the registry (`headFor` in `src/seo.ts`):

| Tag | Source |
| --- | --- |
| `<title>` | `"<title> — Punji UI"`; overview: `Punji UI: finance-first React components` |
| meta description, `og:description`, `twitter:description` | `PageDef.description`: required, 40 to 160 characters, unique. Written for a search result; `summary` stays the longer on-page lead. `site-gen` fails the build otherwise. |
| canonical, `og:url` | `SITE_URL` + `BASE_PATH` + page path |
| `og:*`, `twitter:card=summary_large_image` | `og.png` |
| JSON-LD | overview: `SoftwareSourceCode`; pages: `TechArticle` with a `BreadcrumbList` |
| `lang`, `theme-color` (light and dark), `robots` | fixed (`noindex` on 404) |

`npm run check:seo` (in `verify` and CI) reads `site/dist` and fails when a route lacks a unique title, description or canonical, an Open Graph or Twitter tag, valid JSON-LD, exactly one `h1` and unskipped heading levels; when a link has no text, or any internal link or asset is missing from the build; when `sitemap.xml` and the routes differ; or when robots, llms or `_redirects` point at something that is not built.

## Hosting

The output of `npm run site:build` is `site/dist`: static files only, no server code. A host needs:

1. The `site/dist` folder as the publish directory, served at the path in `BASE_PATH`.
2. `404.html` served with status 404 for unknown paths (the fallback).
3. Directory URLs: `/components/button/` serves `components/button/index.html`.

**Cloudflare Pages** (domain root, `BASE_PATH=/`): build command `npm ci --ignore-scripts && npm run build && npm run site:build`, output directory `site/dist`. It serves `404.html` automatically and reads `_redirects` (the renamed portal paths below). Check once that `/components/button` (no slash) and `/components/button/` both resolve to a single canonical form; the canonical tag points at the trailing-slash URL.

**GitHub Pages** (project site, `BASE_PATH=/punji-ui/`, `SITE_URL=https://20was.github.io`): publish `site/dist`. `404.html` is served for unknown paths; `.nojekyll` is included; `_redirects` is ignored, and `robots.txt` is only honoured at a host root. `/components/button` redirects to the trailing-slash URL, matching the canonical.

No deploy workflow is included.

### Replacing the portal at design.punji.app

This site is meant to replace the current portal there. The cutover keeps `/components/<slug>`, `/utilities/<slug>` and `/foundations/<slug>` where the same page exists (17 paths are identical, for example `/components/button`, `/components/data-table`, `/foundations/typography`). Where the slug differs, `_redirects` sends the old path to the new page with a 301: `/foundations/colour` to `colour-tokens`, `/utilities/formatting` to `formatters`, `/components/meter` to `meter-range`, `/components/bars` to `split-bars`, `/components/empty-state` and `/components/skeleton` to `empty-skeleton`, `/components/checklist` and `/components/check-row` to `check-list`, `/components/distribution-bar` to `share-bars`, `/components/summary-figure` to `metric-tile`, `/components/fact-list` to `key-stats`, and `/docs` to `/`. The list is `PORTAL_RENAMES` in `src/seo.ts`.

Portal URLs that will have no page here (they will return 404), as of the portal's `src/design/registry.ts`: 149 of 177.

- `/get-started/`: using, security, roadmap, agents. `/brand/`: logo, usage, app-icon, downloads. `/shell/`: sidebar, top-bar, title-row, loading. `/patterns/`: states, forms, figures, charts. `/foundations/`: motion, icons. `/utilities/`: alert-distance, routes.
- `/components/`, 129 pages. Generic kit components that exist in `@punji/ui` but have no page here yet (the groups' `planned` lists): field, select, segmented-control, tabs, checkbox, switch, range-slider, choice-group, list-filter, popover, drawer, command-palette, toast, tooltip, status-pill, figure, live-figure, page-layout. App-specific components of the Punji product, not in this package: broker-badge, broker-lookup, broker-days, tms-address, tms-anatomy, alert-form, alert-panel, alert-row, alert-summary, rotation-map, group-counts, group-pill, phase-strip, group-change-list, rating-chip, rating-scale, rating-change-row, run-quota, forecast-note, sale-estimate, store-buttons, app-strip, site-header, site-footer, phone-menu, landing-section, cta-band, faq-section, product-shot, feature-card, market-strip, market-report, market-mark, quote-hero, symbol-block, and most of the remaining chart, row and tile pages (candle-chart, equity-chart, histogram, correlation-matrix, and so on). The owner should decide, page by page, whether each gets a redirect to the nearest page here, a new page, or a 404.

Owner decisions: the redirect or 404 policy for the 149 portal paths above; whether Cloudflare Pages should serve trailing-slash or bare URLs (the canonical is trailing-slash); whether `og.png` should carry the final domain text (currently `design.punji.app`).
