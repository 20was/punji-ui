# Quality standards

What is enforced today at the current `main`, and what is not. Contributor workflow: [CONTRIBUTING.md](CONTRIBUTING.md). Browser gate detail: [docs/VISUAL-TESTING.md](docs/VISUAL-TESTING.md).

## Gates

| Gate | Command | Checks | Runs in CI |
| --- | --- | --- | --- |
| Lint | `npm run lint` | oxlint with `--deny-warnings` over `src test scripts examples portal playwright.config.ts` (correctness errors, hooks rules, jsx-a11y, import cycles, no `any`, no `eval`); then `check-css`, `check-source`, `check-boundaries` | `verify` job |
| Types | `npm run typecheck` | `tsc --noEmit`, strict | `verify` |
| Unit, property, axe (jsdom) | `npm run test` | Vitest in jsdom; fast-check properties; axe-core, serious and critical only, colour contrast disabled (no layout in jsdom) | `verify` |
| Deep properties | `npm run test:deep` | Same tests with `FC_NUM_RUNS=2000` (default 100). A failure prints seed and path to replay | Not in CI; run locally via `npm run verify:deep` |
| Build | `npm run build` | `tsc` ESM and declarations, Lightning CSS | `verify` |
| Examples | `npm run typecheck:examples`, `build:examples`, `check:examples` | Examples typecheck and build against the built package; `check:examples` drives them in Chromium with axe (serious/critical) | `verify` |
| Portal types | `npm run typecheck:portal` | Portal pages typecheck | `verify` |
| Size | `npm run size` | size-limit, gzip, one entry per subpath in `.size-limit.json` (`npm run size` lists them): per subpath, root "Everything" and a root Button tree-shaking check; limits live in the file | `verify` |
| Package | `npm run check:package` | `publint --strict`; `attw --profile esm-only`; `check-pack.mjs` (tarball allowlist, notices present, `MAX_UNPACKED` cap); `check:exports` (subpaths equal root) | `verify` |
| Lockfile | `npm run check:lockfile` | lockfile-lint: npm registry, HTTPS, integrity | `verify` |
| Signatures | `npm audit signatures` | Registry signatures and provenance of installed packages | `verify` and `release` |
| Visual, interaction, axe (browser) | `npm run test:visual:docker` (CI runs `npx playwright test`) | Screenshots vs committed baselines, keyboard/focus interactions, axe with colour contrast | `visual` job |
| Visual types | `npm run typecheck:visual` | Fixture app, specs, config | Local `verify` only |
| Workflow lint | actionlint, zizmor | Workflow files | `workflows` job |
| Other | CodeQL, dependency-review, OpenSSF Scorecard | Separate workflows | Separate workflows |

`npm run verify` = lint, typecheck, test, build, size, `check:package`, `build:examples`, `typecheck:examples`, `typecheck:portal`, `typecheck:visual`. It does **not** run `check:lockfile`, `check:examples`, `npm audit signatures` or the Playwright gate; CI does (see CONTRIBUTING.md).

Also available, not in `verify` or CI: `check:portal`, `check:calendar`, `check:fields`, `check:select`, `check:table`, `audit:web`. They are browser checks against the sibling portal; they need a punji-web checkout (`npm run portal` setup) and were not run for this page.

The required status check is the aggregate job `CI OK`. Its `visual` job is defined but **has not yet run on GitHub**; baselines were produced locally in the same pinned image.

## Test conventions

- Tests never use `Math.random` or the wall clock: fake timers and seeded fast-check inputs.
- Property tests: shared settings in `test/fc.ts`; a rendering property uses `deep(n)` for its own run count.
- Each component needs behaviour tests (pointer and keyboard), role and name assertions, and a jsdom axe run (`test/axe.ts`, `seriousViolations`).
- Browser gate: 6 Playwright projects. 390, 768, 1440 for every fixture; 375, 1024, 1920 additionally for fixtures marked `layout: true`. Light and dark. Tolerance `maxDiffPixelRatio: 0.001`. axe runs at 390 and 1440 in both themes and fails on serious and critical. Chromium on Linux only.

## Component definition of done

A component (new or changed) is done when all of these are true. The PR template carries most of them.

| # | Item | How it is checked |
| --- | --- | --- |
| 1 | General purpose; names the APG pattern or native element | Review (PR template) |
| 2 | All states covered: default, hover, focus-visible, active, disabled, loading, error, empty, missing data where relevant | Tests; visual fixture; review |
| 3 | Tokens only; no raw colour | `check-css` |
| 4 | Light and dark | Visual fixture renders both themes |
| 5 | Responsive at 390, 768, 1440 (and 375/1024/1920 if width-sensitive) | Visual fixture; `layout: true` in `test/visual/manifest.ts` |
| 6 | Full keyboard model; one visible focus ring; 44 px touch targets; reduced motion | Behaviour tests; `interactions.spec.ts`; review for the last three (no automated check) |
| 7 | axe clean (serious/critical) | jsdom test and browser `a11y.spec.ts` |
| 8 | `'use client'` iff needed; no new import outside the allowlist | `check-source` |
| 9 | Exported from root and own subpath, own CSS file | `check:exports`, `check-source`, `check:package` |
| 10 | Size budget entry in `.size-limit.json` | `npm run size` |
| 11 | Docs: props, when to use, content guidance (English and Nepali), accessibility notes | Review. The docs site is still in punji-web, so this is a manual step ([AUDIT.md](AUDIT.md)) |
| 12 | Changeset | `npm run changeset`; review (no CI check that one exists) |
| 13 | Visual fixture and committed baselines | `test:visual:update`, then review the PNGs |

## Accessibility

Target: WCAG 2.2 AA, plus the relevant WAI-ARIA Authoring Practices pattern per component. The target is the maintainer's; it is not previously written in the repo docs.

| Covered | Not covered |
| --- | --- |
| axe-core in jsdom (rules except contrast) | Manual screen-reader testing (VoiceOver, NVDA, TalkBack): **not done** |
| axe in Chromium with contrast, both themes, 390 and 1440, every fixture | Contrast is checked by axe only; no manual or APCA review; text over images and gradients not examined |
| Keyboard specs: combobox, select, drawer and sheet focus trap and Escape, popover, command palette, tabs, table, date picker | Zoom and text-spacing (WCAG 1.4.4, 1.4.12), forced-colours mode, 200% reflow: not tested |
| Reduced motion set in the browser gate | Firefox and WebKit: not tested |
| | Touch target size (44 px) and focus ring uniqueness are by review, not automated |
| | axe finds roughly a third of WCAG issues; passing is not conformance. No audit or conformance statement exists |

Gaps recorded in the original audit: full keyboard, mobile and overlay audit, native Nepali copy review, VoiceOver/NVDA checks of the calendar ([docs/CALENDAR.md](docs/CALENDAR.md)).

## Performance

| Standard | Enforced by |
| --- | --- |
| Per-subpath gzip budgets; a typical control under 1 kB gzip | `npm run size` |
| Everything and root Button import within their `.size-limit.json` budgets (Button guards tree-shaking) | `npm run size` |
| Tarball allowlist and `MAX_UNPACKED` cap | `check-pack.mjs` |
| One runtime dependency (converter), isolated to `nepal/calendar` | `check-source`, `check-boundaries` |
| No runtime CSS-in-JS; static CSS in layers | Build design |

Budgets have been raised with each batch of modules ([AUDIT.md](AUDIT.md)); there is no rule that stops this except review.

Not yet profiled or implemented:

- Large tables: no virtualisation (documented as a deliberate first iteration); render time and memory at thousands of rows are unmeasured. `DataTable` pagination and overflow containment are the only mitigations.
- Live-update rendering (`Live`, `LiveFigure`, tween and tint): no measurement of re-render cost under high-frequency ticks.
- Runtime metrics (INP, CLS, memory), SSR hydration cost, Lighthouse: none collected.
- Current gzip numbers were not re-measured for this page; run `npm run build && npm run size`.
