# Release and versioning

How an npm release works as implemented at `cfe3d47`.

> **Nothing has been published.** `package.json` is `0.0.0`, there is no `CHANGELOG.md`, and no npm package, git tag or GitHub release exists. Publishing needs explicit owner approval and the owner steps below. Do not enable the release gate or publish from a laptop.

## Flow

1. A PR that changes what ships adds a changeset (`npm run changeset`, files in `.changeset/`). 31 are pending now.
2. The PR merges to `main` after `CI OK`.
3. On every push to `main`, `.github/workflows/release.yml` runs (only when `github.repository == '20was/punji-ui'` **and** repository variable `UI_NPM_RELEASE_ENABLED == 'true'`; otherwise the job is skipped, which is the current state).
4. If changesets are pending, the Changesets action opens or updates the PR `chore(release): version packages` (runs `npm run version-packages`: `changeset version`, then refreshes `package-lock.json` without scripts). Merging it triggers step 3 again.
5. With no pending changesets, the action runs `npm run release` (`npm run build && changeset publish`), tags, and creates a GitHub release with the changelog.
6. A CycloneDX SBOM (`npm sbom --omit dev --omit peer`) is attached to that release.

## What the workflow enforces

| Property | Mechanism |
| --- | --- |
| Protected environment | `environment: npm` (approval rules are set in GitHub; not verifiable from the repo) |
| No npm token | npm Trusted Publishing via OIDC; job has `id-token: write`; no `NPM_TOKEN` anywhere |
| Provenance | `publishConfig.provenance: true` and `NPM_CONFIG_PROVENANCE=true` |
| npm version | Step fails unless npm >= 11.5.1 (needed for OIDC) |
| Install | `npm ci --ignore-scripts`, then `npm audit signatures`, no dependency cache on the publish path |
| Gates again | `npm run verify` runs before publishing, because the version PR is pushed by a token that must still start CI |
| Version PR triggers CI | Opened with secret `PUNJI_UI_PR_TOKEN` (single-repo, contents and pull requests), since PRs from the default token do not start workflows |
| Least privilege | `permissions: {}` at top; `contents`, `pull-requests`, `id-token` write on this job only; actions pinned by SHA; `concurrency: release` without cancel |
| Changelog | `@changesets/changelog-github`, repo `20was/punji-ui` |

`npm run verify` does not run the Playwright visual gate (that is the separate CI `visual` job), so a release relies on `CI OK` having passed on the merged commit.

## Versioning policy (pre-1.0)

| Change | Bump |
| --- | --- |
| Breaking change | minor |
| Everything else | patch. Existing changesets also use minor for new API; follow CONTRIBUTING.md and say why in the summary |
| 1.0 | After the release-critical gaps in [AUDIT.md](AUDIT.md) are closed |

From `0.0.0`, the pending minor changesets produce `0.1.0`. Only the latest `0.x` receives security fixes ([SECURITY.md](SECURITY.md)). `.changeset/config.json`: `access: public`, `baseBranch: main`, `commit: false`.

## Pre-release checklist

| # | Step | Command or job | Type |
| --- | --- | --- | --- |
| 1 | Lint, types, tests, build | `npm run lint`, `typecheck`, `test`, `build` | CI `verify` |
| 2 | Deep property tests | `npm run test:deep` | Manual, local |
| 3 | Size budgets | `npm run size` | CI `verify` |
| 4 | Package shape (publint, attw, tarball, exports) | `npm run check:package` | CI `verify` |
| 5 | Lockfile and signatures | `npm run check:lockfile`, `npm audit signatures` | CI `verify` |
| 6 | Examples build and browser check | `build:examples`, `typecheck:examples`, `check:examples` | CI `verify` |
| 7 | Visual regression and browser axe | `npx playwright test` | CI `visual` (never run on GitHub yet; run `npm run test:visual:docker` locally first) |
| 8 | Workflow lint and security | actionlint, zizmor, CodeQL, dependency review | CI |
| 9 | Review the changesets and version PR diff (version, changelog text, lockfile) | Version PR | Manual |
| 10 | Dry-run the tarball | `npm pack --dry-run --json --ignore-scripts` (also done by `check-pack`) | Manual spot check |
| 11 | Clean-consumer install test: packed tarball into a fresh app outside the repo; strict `tsc` (root, subpaths, CSS imports, a required-prop negative test), server render, pure utilities in Node, Vite production build | `npm run check:consumer` (also run by `release.yml` before publishing) | Automated. A Next.js App Router build is still manual |
| 12 | Verify docs examples (README quick start, [docs/INTEGRATION.md](docs/INTEGRATION.md)) against the packed tarball | Copy the snippets into the scratch app | **Manual; no automation exists** |
| 13 | Owner visual review, native Nepali copy review, VoiceOver/NVDA checks | See [QUALITY.md](QUALITY.md) | **Manual** |
| 14 | Owner approval to publish | | **Manual** |

## First-publish owner steps

Required before the workflow can do anything; none has been done or verified here.

1. Confirm the `@punji` npm scope/organisation exists and the owner can publish `@punji/ui` publicly.
2. Configure the npm Trusted Publisher for `@punji/ui`: repository `20was/punji-ui`, workflow file `release.yml`, environment `npm`. (Unverified: whether npm lets you configure this before the package exists; if not, the very first publish needs a different bootstrap, decided by the owner.)
3. Create the GitHub environment `npm` with the required reviewers/branch rules the owner wants.
4. Create secret `PUNJI_UI_PR_TOKEN` (fine-grained, this repository only; contents and pull requests).
5. Make sure `main` is protected with `CI OK` required.
6. Set repository variable `UI_NPM_RELEASE_ENABLED=true`. This is the last step; the next push to `main` opens the first version PR.
7. Merge the version PR only after the checklist above, with explicit approval.

`release.yml` mentions "the plan, What the owner must do"; that document is not in this repository.

## First release and punji-web

Decided 2026-10-31 (docs/INTEGRATION.md section 9): the first release is `0.1.0` with no release
candidate; punji-web pins it exactly (`"@punji/ui": "0.1.0"`, `save-exact=true`). Release candidates
remain available later for risky changes:

```sh
npx changeset pre enter rc   # then merge a version PR as usual
npx changeset pre exit       # before the stable release
```

Changesets publishes prereleases under the pre tag (`rc`); check `npm dist-tag ls @punji/ui` after one.
While unpublished, the local loop is `npm pack` plus `npm install --no-save <tgz>` in punji-web (never committed).
