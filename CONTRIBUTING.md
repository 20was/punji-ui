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

`npm run verify` runs every gate CI runs, in order:

| Script | What it checks |
| --- | --- |
| `npm run lint` | oxlint (correctness, React hooks, jsx-a11y, imports) and the CSS token guard |
| `npm run typecheck` | TypeScript, strict |
| `npm run test` | Vitest in jsdom, including axe-core on every component |
| `npm run build` | `tsc` to ES modules and types, Lightning CSS for the stylesheets |
| `npm run size` | size-limit budgets for every component and the CSS |
| `npm run check:package` | publint, are-the-types-wrong and the tarball allowlist |

Run `npm run verify` before you push. CI runs the same steps once; please do not
push to "see if CI passes".

## The bar for a new component

A component joins the kit only when all of this is true. The pull request
template repeats it as a checklist.

1. **It is general purpose.** Useful in any product: a dashboard, a store, a
   form, an admin tool. Product-specific pieces stay in the product.
2. **It follows a WAI-ARIA pattern.** Name the [APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/)
   it implements (or the native element it wraps) and implement its keyboard
   model in full. Prefer the platform: `<button>`, `<a>`, `<input>`, `<dialog>`,
   the Popover API.
3. **It has no runtime dependency.** `dependencies` stays empty. If something
   seems to need a library, open an issue first.
4. **It has a budget.** Add an entry to `.size-limit.json`. A typical control is
   under 1 kB gzipped; anything larger explains why in the pull request.
5. **It uses tokens only.** Colours, sizes, radii and motion come from `--pu-*`
   variables; the token guard fails on a raw colour. It works in light and dark,
   draws one focus ring, has 44 px touch targets on touch screens and respects
   `prefers-reduced-motion`.
6. **It is tested.** Behaviour (pointer and keyboard), the ARIA roles and names,
   and an axe-core run with no serious or critical violation.
7. **It is documented.** A page on the documentation site: examples, props, when
   to use it, do and don't, content guidance (English and Nepali) and
   accessibility notes.
8. **It is exported twice.** From the root (`@punji/ui`) and from its own subpath
   (`@punji/ui/<name>`), with its own CSS file under `@punji/ui/css/`.

## Changesets and releases

Every pull request that changes what ships adds a changeset:

```sh
npm run changeset
```

Before 1.0, a breaking change is a **minor** and everything else a **patch**.
Write the summary for the people who use the package.

On merge to `main`, the release workflow opens or updates a "Version packages"
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
