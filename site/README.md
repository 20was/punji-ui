# Documentation site

A self-contained docs app for `@punji/ui`: Vite + React + the library itself, no other runtime dependency.
It is never published (the package `files` allowlist ships only `dist/`). It imports `@punji/ui` through the
package export map (the built `dist/`), exactly like a consumer, so every example proves the published API.

```
npm run build        # the site reads dist/
npm run site:dev     # gen + vite dev server on http://127.0.0.1:5185
npm run site:build   # gen + production build into site/dist (gitignored)
npm run site:preview # serve site/dist on :4174
npm run typecheck:site
npm run check:site   # Playwright: needs site:build first; screenshots in test-results/site/
```

## How it fits together

| Piece | Role |
| --- | --- |
| `src/registry.ts` | Typed, data-only list of pages and the sidebar groups. Importable by plain Node. |
| `src/examples/<slug>/<id>.tsx` | One real TSX module per live example. It renders the preview and its raw text is the code shown and copied (one source, so they cannot drift). Typechecked against the package types. |
| `scripts/site-gen.mjs` | Reads the registry, opens the built `.d.ts` with the TypeScript 7 compiler API, writes `src/generated/api.json` (gitignored). Fails the build when an API entry is missing, a page has no API, an example file is missing or unregistered, a `planned` export disappeared, or a registered prop has no doc comment that is not in `undocumented-baseline.json`. |
| `src/app/PageView.tsx` | The page template: overview, when to use and not, import (subpath and root, generated from `api`), live preview with variant switcher, code with copy, props tables, keyboard, accessibility, responsive, notes, related. |
| `src/app/App.tsx` | Shell built from the library: `AppShell`, `Drawer` (mobile menu), `ListFilter` (search), `SegmentedControl` (theme), `useLocalStorage` (persisted theme). Hash routes (`#/slug`) so any static host works. |

Sample data comes from `fixtures/market-data.ts` through `src/sample.ts` (shared with the visual-regression fixture app; synthetic, not market data).

## Add a page

1. Add an entry to `PAGES` in `src/registry.ts`. Pick the `group` by domain (the sidebar order is `GROUPS`). List every export the page documents in `api` as `{ name, module }` where `module` is the published subpath (`'money-display'`, `'nepal/format'`); the import lines and props tables come from it.
2. Add `src/examples/<slug>/<id>.tsx` for each entry of `examples`; each has `export default function Example()` and imports from `@punji/ui/...` only (plus `../../sample.ts` for data).
3. Fill `use`, `avoid`, `keyboard`, `accessibility`, `responsive` and `related` from the source and its docs; do not write behaviour you have not checked.
4. `npm run site:build` (fails with a precise message if anything is missing), `npm run typecheck:site`, then `npm run check:site` and look at the PNGs in `test-results/site/`.
5. If the page documents an export that was in a group's `planned` list, remove it from there.

A prop without a doc comment in `src` shows "No description in the source yet." and is listed in `undocumented-baseline.json`. Prefer adding the comment in `src` and removing the line from the baseline. New undocumented props on registered components fail the build.

Foundations pages have `api: []` and read their data from the shipped CSS.
