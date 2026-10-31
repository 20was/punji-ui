# Contributing to Punji UI

Thank you for helping. This page covers the setup, the checks, the bar a new
component has to meet, and how releases work.

## Setup

You need Node 24 (see `.nvmrc`) and npm 11.

```sh
git clone https://github.com/20was/punji-ui.git
cd punji-ui
npm ci --ignore-scripts
```

## The checks

`npm run verify` runs the main gates CI runs, in order. CI additionally runs `npm run check:lockfile`, `npm audit signatures`, `npm run check:examples` and the Playwright visual gate (`npm run test:visual:docker` locally). What each gate checks and the component definition of done: [QUALITY.md](QUALITY.md).

| Script | What it checks |
| --- | --- |
| `npm run lint` | oxlint (correctness, React hooks, jsx-a11y, imports) and the CSS token guard |
| `npm run typecheck` | TypeScript, strict |
| `npm run test` | Vitest in jsdom, including axe-core on every component |
| `npm run build` | `tsc` to ES modules and types, Lightning CSS for the stylesheets |
| `npm run size` | size-limit budgets for every component and the CSS |
| `npm run check:package` | publint, are-the-types-wrong, the tarball allowlist and the export check |
| `npm run build:examples`, `typecheck:examples`, `typecheck:portal`, `typecheck:visual` | Examples, portal pages and the visual fixture app typecheck and build |

Before pushing, run `npm run verify:deep`: `verify` plus every test again with
2000 inputs per property test (`npm run test:deep`), so a rare input fails on
your machine rather than in CI. A property failure prints its seed and path;
pass them to that `fc.assert` (`{ seed, path }`) to replay it, fix the cause,
then remove the pin. Tests never depend on `Math.random` or the clock: fake
timers and fast-check's seeded inputs only. CI runs the same steps once; please do not
push to "see if CI passes".

## Where the code lives

This repository is the source of truth for reusable Punji UI. Edit `src/`,
exports, CSS and tests here. `punji-web` is a read-only reference; it does not consume the package yet and the docs portal still lives there ([AUDIT.md](AUDIT.md)).
The reverse sync workflow is retired; `npm run sync` fails deliberately to
prevent old automation from overwriting source. Use `npm run audit:web` for a
read-only inventory comparison. See [architecture](docs/ARCHITECTURE.md).

Run `npm run build && npm run examples` for the package-based showcase.
Every new component needs a public root/subpath API, explicit CSS distribution,
realistic examples, accessibility checks, and a changeset. Keep calendar,
display formatting and financial calculations separate.

## The bar for a new component

A component joins the kit only when all of this is true. The pull request
template repeats it as a checklist.

1. **It is general purpose.** Useful in any product: a dashboard, a store, a
   form, an admin tool. Product-specific pieces stay in the product.
2. **It follows a WAI-ARIA pattern.** Name the [APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/)
   it implements (or the native element it wraps) and implement its keyboard
   model in full. Prefer the platform: `<button>`, `<a>`, `<input>`, `<dialog>`,
   the Popover API.
3. **Dependencies are justified.** Review licence, maintenance, security, types and bundle cost. The table-based BS converter is the only runtime dependency besides React peers.
4. **It has a budget.** Set its budget directly in `.size-limit.json`: the measured size plus a little headroom.
   A typical control is under 1 kB gzipped; anything larger explains why.
5. **It uses tokens only.** Colours, sizes, radii and motion come from `--pu-*`
   variables; the token guard fails on a raw colour. It works in light and dark,
   draws one focus ring, has 44 px touch targets on touch screens and respects
   `prefers-reduced-motion`.
6. **It is tested.** Behaviour (pointer and keyboard), the ARIA roles and names,
   and an axe-core run with no serious or critical violation.
7. **It is documented.** A page on the documentation site: examples, props, when
   to use it, do and don't, content guidance (English and Nepali) and
   accessibility notes.
8. **It has a visual fixture.** Add it to `test/visual/` and commit the Docker-rendered baselines ([docs/VISUAL-TESTING.md](docs/VISUAL-TESTING.md)).
9. **It is exported twice.** From the root (`@punji/ui`) and from its own subpath
   (`@punji/ui/<name>`), with its own CSS file under `@punji/ui/css/`.

## Changesets and releases

Every pull request that changes what ships adds a changeset:

```sh
npm run changeset
```

Before 1.0, a breaking change is a **minor** and everything else a **patch**. The full procedure, and the fact that nothing is published yet, is in [RELEASE.md](RELEASE.md).
Write the summary for the people who use the package.

Once `UI_NPM_RELEASE_ENABLED=true` and npm Trusted Publishing are configured, on merge to `main` the release workflow opens or updates a "Version packages"
pull request. Merging that pull request publishes to npm from GitHub Actions with
Trusted Publishing and provenance, tags the release and creates a GitHub release
with the changelog and an SBOM. Nobody publishes from a laptop.

## Commits and pull requests

- One change per pull request, from a branch. `main` is protected.
- Conventional commit titles: `feat(button): …`, `fix(segmented-control): …`,
  `docs: …`, `ci: …`, `chore: …`.
- Keep the diff to what the change needs.

## Security

Never report a vulnerability in an issue or pull request. See [SECURITY.md](./SECURITY.md).
