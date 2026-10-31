# Visual regression and browser accessibility gate

A self-contained Playwright gate that runs in this repository's CI without `punji-web`. It renders a fixture app against the **built package** (through the export map, like `examples/`), compares element-level screenshots to committed baselines, drives the important interactions, and runs axe-core in a real browser.

## What is covered

| Spec | What it does |
| --- | --- |
| `test/visual/specs/visual.spec.ts` | One screenshot per fixture, theme (light, dark) and viewport. |
| `test/visual/specs/interactions.spec.ts` | Combobox and select keyboard, drawer and sheet focus trap and Escape, popover, command palette, toasts, tabs arrow keys, table sort, search, pagination and selection, date picker, checkbox and switch, hover and focus-visible screenshots. Runs on the 1440 project. |
| `test/visual/specs/a11y.spec.ts` | axe-core (injected from the `axe-core` devDependency) on every fixture in both themes at 390 and 1440. Fails on `serious` and `critical`. Colour contrast is included, unlike the jsdom tests. |

Fixtures live in `test/visual/` (`fixtures.tsx`, `data.ts`, `manifest.ts`), separate from `src/`. Data is synthetic NEPSE-style (NABIL, NTC, HDL, NPR prices), never live. Each fixture is one URL: `/?fixture=<id>&theme=light|dark`; the root page lists them. Theme uses the library's own mechanism, `data-theme` on `<html>`.

Viewports: 390, 768 and 1440 for every fixture; 375, 1024 and 1920 additionally for fixtures marked `layout: true` in `manifest.ts` (tables, financial layouts, the shell). Overlays and the shell are captured as a full viewport, everything else as the fixture element.

Determinism: animations disabled, carets hidden, reduced motion, fixed locale and time zone, fonts awaited, two animation frames before each capture, fixed "today" in date components, toast timers frozen in the toast fixture. Tolerance is `maxDiffPixelRatio: 0.001`.

## Environment and baselines

Baselines are **linux/amd64 Chromium rendered inside the official Playwright image** `mcr.microsoft.com/playwright:v<version>-noble`, the same image CI uses (pinned by digest in `.github/workflows/ci.yml`). Files are `test/visual/__screenshots__/<project>/<name>-linux.png`. Do not generate baselines on macOS or Windows: fonts and anti-aliasing differ, and the `-darwin` or `-win32` files would not be used by CI.

On Apple Silicon the scripts force `--platform linux/amd64` (emulated), so the output is identical to CI at the cost of speed (about 4 to 9 minutes for the full run).

## Commands

```sh
npm run test:visual:docker      # compare, inside the container (needs Docker running)
npm run test:visual:update      # regenerate every baseline, inside the container
npm run test:visual:docker -- --project=m390 -g "button"   # any Playwright args pass through
npm run test:visual             # host run: fine for the interaction and axe specs, screenshots will not match
npm run typecheck:visual        # types for the fixture app, specs and config
```

The container installs dependencies into a named Docker volume (`punji-ui-visual-node-modules`), so your host `node_modules` is untouched. Remove the volume with `docker volume rm punji-ui-visual-node-modules` after a dependency change that confuses it.

`playwright.config.ts` starts `npm run visual:serve` (build the package, build the fixture app, `vite preview` on 127.0.0.1:4173). It never reuses a running server, so a stale build cannot be tested by accident.

## Updating baselines intentionally

1. Make the visual change in `src/` (or the fixture).
2. Run `npm run test:visual:update`.
3. **Open the changed PNGs** (`git status test/visual/__screenshots__`) and review them: padding, alignment, overflow, clipping, contrast, both themes, 390 and 1440. A passing update only means "this is what it renders now".
4. Commit the PNGs with the change that caused them. Reviewers see the diff in the PR.
5. Run `npm run test:visual:docker` once more; it must pass without `--update-snapshots`.

When a CI run fails, download the `visual-regression-diffs` artifact (uploaded on failure only): it holds `*-expected.png`, `*-actual.png`, `*-diff.png`, traces and the HTML report. If the difference is intended, update as above. If it is not, fix the code.

## Adding a fixture

1. Add the component states to `test/visual/fixtures.tsx` and register it in `registry`.
2. Add `{ id, title }` to `test/visual/manifest.ts` (`layout: true` for width-sensitive pieces, `page: true` for overlays).
3. `npm run test:visual:update`, review the new PNGs, commit. The visual and axe specs pick it up automatically.

## Upgrading Playwright

`@playwright/test` and `playwright` are pinned to the same exact version. When bumping both, update the image tag and digest in `.github/workflows/ci.yml` (`docker buildx imagetools inspect mcr.microsoft.com/playwright:v<version>-noble` prints the digest), then regenerate every baseline: a new Chromium build usually shifts anti-aliasing.

## Known limits

- The themed `<select>` picker and other top-layer native popups are not captured by Playwright screenshots; select behaviour is covered by the keyboard spec instead.
- Baselines are one OS (Linux). Cross-browser rendering (Firefox, WebKit) is not compared.
- The a11y spec fails on serious and critical violations only, matching the existing `scripts/check-examples.mjs` bar.
