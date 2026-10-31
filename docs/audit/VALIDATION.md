# Validation evidence — 2026-10-28

Branch: `feat/financial-library-foundation`. Consumer working tree remained clean.

- `npm run verify`: pass (lint, strict types, 138 tests across 14 files, JS/declarations/CSS build, per-module and total size budgets, publint strict, are-the-types-wrong ESM checks, tarball allowlist, public export consistency, showcase build/typecheck).
- `npm run check:exports`: 115 runtime subpath exports agree with root.
- `npm run check:lockfile`: pass, registry HTTPS and integrity.
- `npm audit --omit=dev --audit-level=high`: zero known vulnerabilities.
- `actionlint`: pass. zizmor was not available locally; its existing CI job remains.
- `git diff --check`: pass.
- `CHROME_CHANNEL=chrome npm run check:examples`: pass on Chrome 156; 12 combinations of 390/1440 widths × light/dark × 0/1/48 records; no page/console errors, document overflow or serious/critical axe violations. Keyboard skip link, search, empty recovery, retry and workflow navigation pass.
- All 12 matrix screenshots and phone invoice/watchlist screenshots were visually inspected. Charts retain proportions/gaps; long tables contain horizontal scrolling. Initial strict console check found a favicon 404; fixed with an explicit empty favicon.
- Test suite round-trips every Gregorian day from 1918-04-13 through 2043-04-13 via BS. This establishes internal consistency, not independent official certification of every date.
- Built tarball dry-run: 132 files, approximately 344 kB unpacked. No sources, screenshots, local paths, example data or development dependencies in the tarball.

Local review: `http://127.0.0.1:5181/` while the development server is running. Reproduce with `npm run build && npm run examples -- --port 5181`.

Screenshots: `test-results/showcase/{390,1440}-{light,dark}-{0,1,48}.png`, `390-Invoices.png`, `390-Watchlist.png`; machine results: `test-results/showcase/results.json`. Artifacts are intentionally gitignored; the checked-in script regenerates them.

Known limits: full manual component parity audit, full local gallery, non-Chromium/assistive-technology checks, complete bilingual workflow copy, accounting editors and specialised financial components are not finished. The showcase build emits Vite's expected `use client` directive warnings for its browser-only bundle; distributed library modules preserve those directives. No remote CI, npm publication, docs deployment, consumer migration or PR was performed.
