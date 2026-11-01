# Contributing a component

The path from "this kit needs X" to a merged component. Read [CONTRIBUTING.md](../CONTRIBUTING.md) for setup and
the general checks; this page covers a new component end to end. It is written for people and for coding agents.

## 1. Agree on it first

Open a **Component request** issue (the form asks for the data shape, states, keyboard model and locale needs) or
pick an accepted one. A component joins only if it meets [the bar](../CONTRIBUTING.md#the-bar-for-a-new-component):
general purpose, a WAI-ARIA pattern, tokens only, tested, documented, a visual fixture, exported twice.

Check first that it is not already a [Showcase pattern](https://design.punji.app/#showcase): screens built from
existing components stay patterns (copy them with `npx shadcn@latest add https://design.punji.app/r/<name>.json`),
not package API.

## 2. Scaffold it

```sh
npm ci --ignore-scripts
npm run new:component -- rate-badge --group=banking   # --dry-run lists the files first
```

`--group` is the docs sidebar group (`financial-primitives`, `stock-market`, `portfolio`, `accounting`, `banking`,
`share-issues`, `data`, `forms`, `layout`, `feedback`, `developer`). The generator writes:

| File | What it is |
| --- | --- |
| `src/rate-badge/RateBadge.tsx` | The component: a props interface with a doc comment on every prop, no hooks yet (so no `'use client'`) |
| `src/styles/rate-badge.css` | Its stylesheet in `@layer punji.components`, imported from `src/styles/styles.css` (before `contrast.css`) |
| `src/index.ts` | The root export |
| `package.json` | The `./rate-badge` subpath export (its CSS ships as `@punji/ui/css/rate-badge.css` through the `./css/*.css` entry) |
| `.size-limit.json` | A JS budget and a CSS budget, deliberately loose (1 kB, 0.5 kB) |
| `test/rate-badge.test.tsx` | A first test and an axe run |
| `site/src/examples/rate-badge/basic.tsx` | The first live example, imported from `@punji/ui/rate-badge` like a consumer |
| `site/src/registry-community.ts` | The docs page entry (`/components/rate-badge/`) with every field to fill |
| `test/visual/fixtures-community.tsx`, `test/visual/manifest.ts` | A visual fixture, marked `pending` until its baseline exists |
| `.changeset/rate-badge.md` | A minor changeset |

The scaffold lints, typechecks, tests, builds and fits its budgets as it is. Every place you must write real content
says `TODO`.

## 3. Build the real thing

1. **Behaviour.** Write the component. If it uses hooks, portals or inline handlers, add `'use client'` as the first
   line (`scripts/check-source.mjs` fails either way). No new runtime dependency.
2. **Money and numbers.** Amounts are `bigint` minor units or exact decimal strings, never `number`. Format with
   `@punji/ui/money` and `@punji/ui/format`; anything that divides takes an explicit rounding mode. Direction is never
   colour alone: a sign, an arrow or a word.
3. **Locale.** No user-facing copy baked in: labels are props. Support `nepalMoneyConfig()`, Devanagari digits and
   Bikram Sambat dates where they apply.
4. **CSS.** `--pu-*` tokens only (`scripts/check-css.mjs` fails on a raw colour), logical properties so it mirrors in
   `dir="rtl"`, one focus ring, 44 px targets under `(pointer: coarse)`, works in light, dark and both high-contrast
   themes and in all three densities.
5. **Tests.** Roles and names, pointer and keyboard, every state (loading, empty, error, missing value), edge cases,
   axe. Pure helpers get property tests (`test/fc.ts`).
6. **Docs page.** Fill every field of the entry in `site/src/registry-community.ts`: a unique `description` of 120 to
   160 characters (the search-result text), a `lead` of at most 140, `use`, `avoid`, `keyboard`, `accessibility`,
   `responsive`, `related`. Add examples for the main variants. Then **link the page**: add its slug to the `related`
   list of one or two existing pages (`check:seo` fails on a page nothing links to). Optionally add a search title
   in `site/src/seo-titles.ts` (40 to 62 characters).
7. **Budgets.** `npm run build && npx size-limit`, then set each new limit a little above what it measures.
8. **Visual fixture.** Show every state side by side in the fixture, run `npm run test:visual:update` (Docker), commit
   the baselines and remove `pending: true` from the manifest entry ([docs/VISUAL-TESTING.md](VISUAL-TESTING.md)).
9. **Changeset.** Rewrite `.changeset/rate-badge.md` for the changelog.

When the page is reviewed, a maintainer may move the entry from `registry-community.ts` into the domain's registry
file and the fixture into the domain's fixture file.

## 4. Check before you open the pull request

```sh
npm run lint && npm run typecheck && npm test -- --maxWorkers=3 && npm run build \
  && node scripts/check-pack.mjs && npx size-limit && npm run typecheck:site \
  && npm run site:build && npm run check:seo && npm run check:site
```

Then look at the page at 390 and 1440 px wide in light and dark (`npm run site:preview`). The pull request template
repeats the bar as a checklist.

## For coding agents

- Every docs page has a Markdown twin at `<page>/index.md`, listed in [llms.txt](https://design.punji.app/llms.txt).
  Read the pages of the components you compose before writing new ones.
- Run the generator instead of creating files by hand, so nothing is missed, then search for `TODO`.
- Do not claim behaviour you have not tested; do not edit baselines without running the Docker visual gate.
