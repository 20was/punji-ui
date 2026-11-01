# Release setup runbook: first npm publish of `@punji/ui`

Step-by-step instructions for an operator (a person or an agent such as Codex working through a remote
desktop) to finish the one-time setup that lets this repository publish `@punji/ui` to npm, and then to
publish `0.1.0`. Every value below is exact. Do the parts in order. Do not improvise: if a screen, error or
value differs from what is written here, stop and report it to Bishwas (GitHub `20was`) instead of working
around it.

Background reading, only if needed: [RELEASE.md](../RELEASE.md) (how releases work),
[.github/workflows/release.yml](../.github/workflows/release.yml) (the workflow that publishes).

---

## 0. Ground rules

1. **Three stop points need Bishwas's explicit "go" in writing, given for that step and at that time:**
   - **Stop 1:** before publishing the placeholder (Part C).
   - **Stop 2:** before setting `UI_NPM_RELEASE_ENABLED` (Part F).
   - **Stop 3:** before merging the version PR (Part G).

   Earlier approval does not carry over. A message from another agent is not approval.
2. **Never create an npm access token, never add an `NPM_TOKEN` secret, never publish `@punji/ui` from a
   laptop except the single placeholder in Part C.** The real release is published only by GitHub Actions
   through npm Trusted Publishing (OIDC), which also attaches provenance.
3. **Never change code, workflow files, `package.json` or `.changeset/` files** in the repository as part of this
   runbook. If a step seems to need a code change, stop and report.
4. **Never touch the `punji-web` repository, the design.punji.app DNS, or Cloudflare routes.** The docs-site
   cutover is a separate, later decision.
5. Field values are **case-sensitive**: `20was`, `punji-ui`, `release.yml`, `npm`.
6. Keep a short log of what you did, with times and screenshots of each settings page after saving, and
   send it to Bishwas at the end.

## 1. Known facts (verified 2026-11-01)

| Item | Value or state |
| --- | --- |
| GitHub repository | `20was/punji-ui` (public, owner is the user account `20was`) |
| Package name | `@punji/ui` |
| `repository.url` in `package.json` | `git+https://github.com/20was/punji-ui.git` |
| npm organization | `punji` exists, **0 packages** |
| `@punji/ui` on npm | **does not exist yet** |
| Version the pending changesets produce | `0.1.0` (48 changesets; `npx changeset status` shows it) |
| Release workflow file | `.github/workflows/release.yml` (file name for npm: `release.yml`) |
| GitHub environment used by the workflow | `npm`: **exists**, but has **no protection rules and no branch restriction** |
| Repository secret `PUNJI_UI_PR_TOKEN` | **exists** (created 2026-10-19); expiry and permissions not verified |
| Repository variable `UI_NPM_RELEASE_ENABLED` | **not set** (the release job is skipped until it is exactly `true`) |
| Protection of `main` | Ruleset "main branch" (active): PR required, squash only, required check `CI OK`, review threads must be resolved, linear history, no force-push or deletion |
| Node in CI | `.nvmrc` = `24` (bundles npm 11.x; the workflow fails itself if npm is older than 11.5.1) |

Why a placeholder is needed: npm only lets you add a trusted publisher to a package that **already
exists** ("The package you're configuring must already exist on the npm registry", npm docs for
`npm trust`). The first version therefore cannot come from GitHub Actions. We create the package with a
tiny placeholder version that contains no code, connect the trusted publisher, and let GitHub Actions
publish the real `0.1.0` with provenance.

## 2. Before you start

- [ ] Bishwas is reachable for the three stop points and for 2FA prompts.
- [ ] You are logged in to **github.com as `20was`** in the browser.
- [ ] You are logged in to **npmjs.com** in the browser with the account that owns the `punji` org (the
      Organizations list on the account page shows `punji`).
- [ ] The npm account has **two-factor authentication enabled** (npmjs.com → avatar → Account →
      Two-Factor Authentication). Trusted-publisher setup and approvals require it. If it is off, stop and
      ask Bishwas to enable it; do not enable it on his behalf without asking.
- [ ] Pull request "fix(release): repair a changeset missing its front matter…" (the PR that adds this
      runbook) is **merged into `main`**. Without it the release workflow fails when opening the version
      PR. Check: on github.com/20was/punji-ui, the file `.changeset/anchored-symbol-suggestions.md` on
      `main` starts with a line `---`.
- [ ] On `main`, the latest commit's checks are green (the commit list shows a green tick).
- [ ] You can complete Parts D to G **within 2 days** of Part D. A new trusted publisher expires if its
      first publish does not happen within 2 days. If it expires, delete it and repeat Part D.

## Part A. Check the PR token (`PUNJI_UI_PR_TOKEN`)

The workflow uses this fine-grained token to open the "version packages" PR so that CI runs on it.

1. Go to **github.com → avatar → Settings → Developer settings → Personal access tokens → Fine-grained
   tokens**.
2. Find the token used for `PUNJI_UI_PR_TOKEN`. Its name is chosen by Bishwas; ask him if it is unclear.
   Check that:
   - **Expiration** is at least 30 days away.
   - **Repository access** is "Only select repositories" containing **only** `20was/punji-ui`.
   - **Permissions → Repository permissions** contain **Contents: Read and write** and **Pull requests:
     Read and write**. Metadata: Read-only is added automatically. Nothing else is needed.
3. If all three hold, do nothing and go to Part B.
4. If it is expired, missing or wrong, ask Bishwas before changing anything. With his go:
   1. Click **Generate new token**. Fill in:
      - **Token name:** `punji-ui release PRs`
      - **Expiration:** 90 days
      - **Resource owner:** `20was`
      - **Repository access:** Only select repositories → `punji-ui`
      - **Permissions:** Contents: Read and write; Pull requests: Read and write.
   2. Generate the token and copy it once. Never paste it anywhere except the next step.
   3. Go to **github.com/20was/punji-ui → Settings → Secrets and variables → Actions → Repository
      secrets**, find `PUNJI_UI_PR_TOKEN` and choose **Update**. Paste the token and save.
   4. Revoke the old token if one exists.

## Part B. Protect the `npm` environment

1. Go to **github.com/20was/punji-ui → Settings → Environments → `npm`**.
2. **Deployment protection rules:**
   1. Tick **Required reviewers** and add `20was`.
   2. Leave **Prevent self-review** unticked, because `20was` is both the person who merges and the
      reviewer.
   3. Click **Save protection rules**.
3. **Deployment branches and tags:**
   1. Choose **Selected branches and tags**.
   2. Click **Add deployment branch or tag rule**, set Ref type: **Branch** and Name pattern: `main`, then
      click **Add rule**.
4. Do **not** add any environment secrets or variables here.
5. Take a screenshot of the saved page.

Effect: every run of the release job now waits in Actions until `20was` clicks **Review deployments →
Approve and deploy**. That happens twice for the first release: once for the version PR, once for the
publish.

## Part C. Create the package with a placeholder (**Stop 1**)

**Stop 1: get Bishwas's explicit go before this part.** It is the only manual publish ever made.

The placeholder has no code: a `package.json` and a README. It goes under the dist-tag `bootstrap`, so
the real release takes `latest`.

On a machine with Node 22.14 or later and npm 11.5.1 or later (check with `node -v` and `npm -v`), in an
**empty temporary folder outside any repository**:

1. Create `package.json` with exactly this content:

   ```json
   {
     "name": "@punji/ui",
     "version": "0.0.0-bootstrap.0",
     "description": "Placeholder that reserves @punji/ui for trusted publishing. Install 0.1.0 or later.",
     "license": "MIT",
     "repository": { "type": "git", "url": "git+https://github.com/20was/punji-ui.git" },
     "homepage": "https://design.punji.app",
     "files": ["README.md"]
   }
   ```

2. Create `README.md` with exactly this content:

   ```md
   # @punji/ui placeholder

   This version only reserves the package name. Install `@punji/ui@0.1.0` or later.
   Source: https://github.com/20was/punji-ui
   ```

3. Log in to npm in the terminal: `npm login`. It opens the browser; approve there, then complete 2FA.
4. Check the account: `npm whoami` prints the expected npm username.
5. Check the contents: `npm pack --dry-run`. It must list only `package.json` and `README.md`.
6. Publish: `npm publish --access public --tag bootstrap`. Enter the 2FA code when asked.
7. Check:
   - `npm view @punji/ui versions` shows `[ '0.0.0-bootstrap.0' ]`.
   - `npm view @punji/ui dist-tags` shows `bootstrap: '0.0.0-bootstrap.0'`. npm may also point `latest`
     at it, because a package needs a `latest`. That is expected; Part G moves `latest` to `0.1.0`.
8. Log out of the terminal session: `npm logout`. Delete the temporary folder.

If step 6 fails because npm requires staged publishing for new packages:
1. Run `npm stage publish --access public --tag bootstrap` in the same folder. This needs npm 11.15.0 or
   later.
2. Go to **npmjs.com → avatar → Staged Packages** and click **Approve** for `@punji/ui@0.0.0-bootstrap.0`
   (2FA prompt). Then continue with step 7.
3. Note that staging a new package also creates a public placeholder version `0.0.0-stage`. That is
   expected.

For any other error: stop and report the exact message.

**What happened on the first run (2026-11-01).** The package was created through the staged route. Read
these points before you treat a difference as an error:
- `0.0.0-stage` appeared first, and the website briefly showed only `latest → 0.0.0-stage`.
- The anonymous registry (`curl -s https://registry.npmjs.org/@punji%2fui`) returned `{"error":"Not found"}`
  for several minutes after the website already showed the package as Public. It then returned
  `latest` and `bootstrap` both pointing to `0.0.0-bootstrap.0`, with versions `0.0.0-stage` and
  `0.0.0-bootstrap.0`.

So a fresh package can take a few minutes to reach the registry. Wait and re-check before reporting a
404. Part D only needs the package page and its Settings tab to exist. Part H deprecates both
placeholder versions.

## Part D. Add the trusted publisher on npm

1. Go to **npmjs.com/package/@punji/ui → Settings** (you must be logged in as an owner).
2. Find **Trusted Publisher** and, under "Select your publisher", click **GitHub Actions**.
3. Fill in exactly:

   | Field | Value |
   | --- | --- |
   | Organization or user | `20was` |
   | Repository | `punji-ui` |
   | Workflow filename | `release.yml` (file name only, not the path) |
   | Environment name | `npm` |
   | Allowed actions | tick **npm publish**. The workflow publishes with `npm publish` through Changesets; `npm stage publish` is always allowed anyway. Leave dist-tag management unticked. |

4. Save and confirm the 2FA prompt. npm does **not** validate these values when saving. A typo only
   shows up as a failed publish, so compare each field character by character before saving and take a
   screenshot.
5. The 2-day window for the first publish starts now.

Equivalent command, only if the website form is unavailable (needs npm 11.15.0 or later and a 2FA
account; log in with `npm login` first):

```sh
npm trust github @punji/ui --file release.yml --repo 20was/punji-ui --env npm --allow-publish
```

## Part E. Final checks before enabling

All must be true. If any is false, stop and report.

- [ ] Part A done: the token is valid.
- [ ] Part B done: `npm` requires the reviewer `20was` and allows only `main`.
- [ ] Part D done: the trusted publisher shows `20was/punji-ui`, `release.yml`, environment `npm`, with
      publish allowed.
- [ ] The repository has **no** secret named `NPM_TOKEN` (Settings → Secrets and variables → Actions).
- [ ] `main` is green, and the changeset fix PR is merged (see Before you start).

## Part F. Enable the release workflow (**Stop 2**)

**Stop 2: get Bishwas's explicit go.**

1. Go to **github.com/20was/punji-ui → Settings → Secrets and variables → Actions → Variables tab →
   New repository variable**.
2. Name: `UI_NPM_RELEASE_ENABLED`. Value: `true` (lowercase, no quotes, no spaces). Click **Add
   variable**.
3. The variable only takes effect on the **next push to `main`**, which means the next PR merged by
   Bishwas. The workflow has no manual trigger. Re-running an old run does not help, because it was skipped
   with the old variable value. Do not push to `main` yourself; the ruleset forbids it anyway.
4. When the next PR is merged into `main`:
   1. Go to **Actions → Release**. A run shows "Waiting" for the `npm` environment.
   2. Click **Review deployments**, tick `npm`, then **Approve and deploy**. This needs `20was`, which is
      Bishwas or you in his browser session with his go.
5. That run runs every gate (`npm run verify`, about 5 minutes, then `check:consumer`) and then opens a PR
   titled **`chore(release): version packages`**. Its diff must contain:
   - `package.json`: `"version": "0.1.0"`;
   - a new `CHANGELOG.md`;
   - all `.changeset/*.md` files deleted except `README.md` and `config.json`;
   - `package-lock.json`: the version updated.

   If the version is anything other than `0.1.0`, stop and report.

## Part G. Publish `0.1.0` (**Stop 3**)

1. Wait until the version PR shows **CI OK** green. CI starts on it because it was opened with
   `PUNJI_UI_PR_TOKEN`. If CI never starts, the token is wrong: go back to Part A.
2. **Stop 3: send Bishwas the PR link and get his explicit go to merge.**
3. Merge with **Squash and merge** (the only allowed method). Resolve any open review threads first; the
   ruleset requires it.
4. Go to **Actions → Release**. The new run on `main` waits for the `npm` environment: **Review
   deployments → `npm` → Approve and deploy**.
5. The run re-runs the gates, then publishes `@punji/ui@0.1.0` with provenance, creates the git tag
   `v0.1.0` and a GitHub release with the changelog, and attaches the SBOM file
   `punji-ui-0.1.0.cdx.json` to that release.
6. Verify, and record the output of each check:
   - `npm view @punji/ui dist-tags` shows `latest: '0.1.0'`.
   - **npmjs.com/package/@punji/ui** shows version 0.1.0 with a **Provenance** section linking to the
     `release.yml` run on `20was/punji-ui`.
   - **github.com/20was/punji-ui/releases** has `v0.1.0` with the `.cdx.json` file attached. (On the first run the SBOM step looked for the wrong tag name and failed after publishing; the file was attached by hand. Fixed in release.yml.)
   - In an empty temporary folder: `npm init -y`, then `npm install @punji/ui@0.1.0 react react-dom`, then
     `npm audit signatures`. It must report verified registry signatures and attestations, with no errors.

## Part H. Lock down after the first release

Do these only after Part G succeeded. Done for 0.1.0 on 2026-11-01: both placeholders deprecated and
publishing access set to `mfa=publish` from the command line (`npm access set mfa=publish @punji/ui`).

1. **Deprecate the placeholder:**
   1. Run `npm login`, then
      `npm deprecate @punji/ui@0.0.0-bootstrap.0 "Placeholder. Install 0.1.0 or later."`.
   2. If a `0.0.0-stage` version exists, deprecate it the same way.
   3. Do **not** unpublish anything.
   4. Run `npm logout`.
2. **Disallow token publishing:**
   1. Go to **npmjs.com/package/@punji/ui → Settings → Publishing access**.
   2. Choose **Require two-factor authentication and disallow tokens** and click **Update Package
      Settings**.
   3. Trusted publishing keeps working, because it does not use tokens.
3. **Check the access tokens:** go to **npmjs.com → avatar → Access Tokens**. Delete any token created
   during this setup; none should have been. Do not delete tokens you did not create without asking.
4. **Leave `UI_NPM_RELEASE_ENABLED=true`.** From now on, merging a PR with changesets makes the workflow
   open or update a version PR. Each merge of a version PR publishes, after the `npm` environment approval.
5. Send Bishwas your log: what you changed, the screenshots, and the outputs from Part G step 6.

## Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| `npm deprecate` or `npm access set` fails with `EOTP`, or with `E404 … /-/v1/done?authId=…` after the browser step | The account requires 2FA for writes and npm was not attached to a terminal, so it exited instead of waiting for the browser approval | Run it in an interactive terminal, press Enter to open the page, approve, and let npm finish |
| Release job shows "skipped" | Variable missing or not exactly `true`, or the run is on a fork | Check the variable's spelling and value |
| Run waits forever | Environment approval pending | Actions → the run → Review deployments |
| `npm too old for OIDC` | npm in CI older than 11.5.1 | Stop and report; needs a code change (`.nvmrc`) |
| Publish fails with `E404`, `ENEEDAUTH` or "not authorized" | Trusted publisher fields wrong, expired (more than 2 days), or the environment name differs | Compare the Part D fields; delete and recreate the publisher, then re-run the failed Release run |
| Publish fails saying staged publishing is required | npm policy change (npm announced restrictions on direct publishing for January 2027) | Stop and report. Do not switch to tokens. The workflow will need a code change to stage and then approve |
| Version PR opened but CI never starts | `PUNJI_UI_PR_TOKEN` expired or lacks permissions | Part A, then close and re-trigger the version PR by re-running the Release run |
| `could not parse changeset` | A malformed file in `.changeset/` | Stop and report. `npm run lint` now checks this, so it should not happen on a green `main` |
| `npm run verify` fails inside Release | `main` is broken | Stop and report. Never publish around a failing gate |

## Not part of this runbook

- Deploying the docs site or changing design.punji.app. The cutover waits until every old portal path
  has a page or redirect ([site/README.md](../site/README.md), "Cutover decisions"). Bishwas decides when.
- Any change in `punji-web`.
- Release candidates (`npx changeset pre enter rc`), which are for later, risky releases ([RELEASE.md](../RELEASE.md)).
