# Security audit, November 2026

Scope: the `@punji/ui` package (0.1.0 on npm, Trusted Publishing with provenance), its supply chain, the GitHub
Actions workflows on `main` plus `docs.yml`, `wrangler.jsonc` and `scripts/site-headers.mjs` from
`feat/docs-cutover` (PR #33), the library code in `src/`, the docs site in `site/`, and repository settings
(read through the GitHub API, not changed). Audited on 2026-11-01 against `main` at `1e5965e`.

Severity: **High** means a realistic path to publishing malicious code or taking over the repository.
**Medium** means a real weakness that needs another failure, or a spoofing risk for end users. **Low** means
defence in depth or a narrow DoS. **Info** records a control that was checked and holds.

Summary: 0 critical, 2 high, 7 medium, 15 low, 9 info. Eight are fixed on this branch. The rest are planned
below, most of them settings the owner has to change.

## Threat landscape this audit was measured against

- **Self-propagating npm worms (Shai-Hulud, September 2025; Shai-Hulud 2.0, November 2025; Mini Shai-Hulud
  II and III, May 2026).** They steal npm and GitHub tokens from developer machines and CI, then publish
  infected versions of every package the victim maintains. In the TanStack case (May 2026) a Pwn Request
  poisoned the Actions cache. The legitimate release workflow then ran the attacker's code while it held
  `id-token: write`, read the OIDC token from runner memory, and swapped it at npm for publish rights. The
  malicious versions carried **valid SLSA provenance**. Trusted Publishing was not bypassed: it was the attack
  vector. The lesson for this repository: provenance shows which workflow built a package, not that the
  workflow ran only your code.
- **Maintainer phishing and typosquats.** Fake npm "2FA reset" emails led to the September 2025 takeover of
  chalk and debug. Typosquats are published continuously.
- **npm's response.** Trusted Publishing is the recommended path. npm 12 turns dependency lifecycle scripts
  off by default and sets `--allow-git` to none (both available behind warnings since 11.16). 2FA-bypass
  granular tokens lose management rights in August 2026 and direct publish rights around January 2027.
  Staged publishing (`npm stage publish`, then a human 2FA approval) is the human-in-the-loop alternative.
- **GitHub's response.** SHA pinning can now be enforced in repository settings, and immutable releases and
  rulesets are available. GitHub warns specifically about `pull_request_target` and cache poisoning.
- **OWASP CSV injection list (updated August 2025).** `=`, `+`, `-`, `@`, tab, CR, **LF**, and the full-width
  forms of the four formula characters.

Sources: [DevOps.com: How GitHub plans to secure npm after recent supply chain attacks](https://devops.com/how-github-plans-to-secure-npm-after-recent-supply-chain-attacks/),
[GitHub changelog: npm install-time security and GAT bypass2fa deprecation (2026-07-07)](https://github.blog/changelog/2026-07-07-npm-install-time-security-and-gat-bypass2fa-deprecation),
[The Hacker News: npm 12 disables install scripts by default](https://thehackernews.com/2026/07/npm-12-disables-install-scripts-by.html),
[Aikido: Shai-Hulud and Trusted Publishing](https://www.aikido.dev/blog/shai-hulud-trusted-publishing),
[Upwind: Shai-Hulud 2.0](https://www.upwind.io/?p=14565),
[OWASP: CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection),
[OWASP www-community PR #1116 (adds LF)](https://github.com/OWASP/www-community/pull/1116).

## Findings

### 1. npm and supply chain

| ID | Severity | Finding | Evidence | Status |
| --- | --- | --- | --- | --- |
| S1 | Info | The lockfile has 290 entries. Every one resolves to `https://registry.npmjs.org` with an integrity hash, and the CI gate `check:lockfile` (lockfile-lint) enforces this. Only `fsevents` (optional, macOS) declares an install script. `.npmrc` sets `ignore-scripts=true` and `save-exact=true`. Every workflow installs with `npm ci --ignore-scripts`. | `package-lock.json`; `.npmrc:1-2`; `package.json` `check:lockfile`; `ci.yml:83-87` | Holds |
| S2 | Info | `npm audit signatures`: 229 packages have verified registry signatures and 90 have provenance attestations. `npm audit` (all dependencies and runtime only) finds 0 vulnerabilities. Dev dependencies are pinned exactly. | run on 2026-11-01 | Holds |
| S3 | Info | One runtime dependency, `@remotemerge/nepali-date-converter@1.2.5`: pinned exactly, no scripts, no dependencies, provenance attested. It is a single-maintainer package, so a phished maintainer is the residual risk; the exact pin means consumers get 1.2.5 until we bump it. | `package.json` `dependencies`; `npm view` | Accepted risk |
| S4 | Info | Tarball surface. `files` is `dist` plus two markdown files. `check-pack.mjs` allows only `dist/**/*.{js,d.ts,css}` and the files npm always adds, with an unpacked-size budget. `sourceMap` and `declarationMap` are off. | `package.json` `files`; `scripts/check-pack.mjs`; `tsconfig.build.json:7-8` | Holds |
| S5 | Low | The tarball gate checked paths, never content: a credential or a `sourceMappingURL` inlined into a `dist` file would have shipped. | `scripts/check-pack.mjs` (before) | **Fixed**: `check-pack` now scans every packed file for source-map references and npm, GitHub, AWS, Slack and private-key patterns |
| S6 | Info | Dependabot runs weekly with a **7-day cooldown** for npm and Actions, which is the main defence against a worm-infected release landing here within hours. Security updates are enabled. | `.github/dependabot.yml:15-16,35-36` | Holds |
| S7 | Low | npm 12 defaults (`allow-scripts` allowlist, `allow-git=none`) are not set yet. The repo already gets most of the benefit from `ignore-scripts` and a registry-only lockfile. | `.npmrc` | Planned (P-npm-3) |

### 2. GitHub Actions

| ID | Severity | Finding | Evidence | Status |
| --- | --- | --- | --- | --- |
| A1 | **High** | **The release job runs the whole dev toolchain while it holds publish credentials.** One job has `id-token: write` (npm OIDC), `contents: write` and `pull-requests: write`, and later steps use `PUNJI_UI_PR_TOKEN`. In that same job it runs `npm run verify` (vite, vitest, TypeScript, oxlint, lightningcss, size-limit, publint, attw, Playwright: about 230 packages' code) and `npx playwright install --with-deps` (downloads browsers, runs apt as root). One compromised dev dependency gets the TanStack outcome: it reads the OIDC token from the runner and publishes a malicious `@punji/ui` with valid provenance. The `npm` environment's required reviewer does not help, because approval happens before the job starts. `ignore-scripts` does not help either, because this is code that `verify` runs on purpose, not an install script. | `.github/workflows/release.yml:28-32` (permissions), `:55-62` (Chromium, `verify`, `check:consumer`), `:76` (PR token) | Planned (P-gh-1) |
| A2 | **High** | **`PUNJI_UI_PR_TOKEN` can bypass the `main` ruleset.** It is a fine-grained PAT of `20was`, who has the admin role. The `main` ruleset gives the admin role bypass mode **always**, so the token can push straight to `main` with no PR and no CI. That push would then trigger the release workflow. It is also a **repository** secret, so any workflow that reaches `main` can read it, not only the gated `npm` environment. Its expiry has not been verified. | API: ruleset 25376618 `bypass_actors: [{RepositoryRole 5, always}]`; `actions/secrets` lists `PUNJI_UI_PR_TOKEN` at repository level; `release.yml:76` | Planned (P-gh-2, owner) |
| A3 | Medium | Every harden-runner step uses `egress-policy: audit`, so outbound traffic is logged and never blocked. This includes `release.yml`, where blocking would stop an OIDC token from being sent to an attacker's host. | `release.yml:34-36`; `ci.yml:72-74,125-127`; `docs.yml` (PR #33) | Planned (P-gh-3) |
| A4 | Medium | Repository Actions settings: `allowed_actions: all`, `sha_pinning_required: false`, and the workflow token can approve pull requests (`can_approve_pull_request_reviews: true`). Every action is SHA-pinned today, but nothing enforces it. | API `actions/permissions`, `actions/permissions/workflow` | Planned (P-gh-4, owner) |
| A5 | Medium | No ruleset protects tags. Anyone with write access, or the PR token, could move or delete a `v*` tag, so a release tag would no longer point at the commit that was published. | API: only the branch ruleset exists | Planned (P-gh-5, owner) |
| A6 | Info | No `pull_request_target` or `workflow_run` trigger. No `${{ github.event.* }}` is interpolated into a `run:` script; untrusted values reach scripts through `env:` (`ci.yml:222-228`, `release.yml:84-90`). The top level has `permissions: {}` and each job sets its own. Checkouts use `persist-credentials: false`. Every action and the Playwright container are pinned by SHA or digest. actionlint (checksum-verified) and zizmor run on workflow changes. | all workflows | Holds |
| A7 | Info | Cache poisoning. The release job turns the setup-node cache off (`package-manager-cache: false`). CI caches only on `pull_request` and `push`, which cannot write to `main`'s cache scope from a fork. `npm ci` checks cache contents against lockfile integrity. | `release.yml:45-46`; `ci.yml:81` | Holds |
| A8 | Info | The `npm` environment requires reviewer `20was` and allows deployments only from branch `main` (verified through the API). The npm package is set to `mfa=publish` and there is no `NPM_TOKEN` secret anywhere. | API `environments`, `deployment-branch-policies`; `docs/RELEASE-SETUP-RUNBOOK.md` Part H | Holds |
| A9 | Low | An unused repository secret, `PUNJI_WEB_READ_TOKEN`: no workflow on `main` or PR #33 references it. An unused credential is pure exposure. | API `actions/secrets` | Planned (P-gh-6, owner) |
| A10 | Low | CodeQL ran only when `src/`, `scripts/` or workflow files changed. Site-only PRs were not analysed, and Scorecard SAST scored 9 ("26 of 30 commits checked"). | `.github/workflows/codeql.yml:4-8` (before) | **Fixed**: no path filter, so every PR and every push to `main` is analysed |

### 3. Library code (`src/`)

| ID | Severity | Finding | Evidence | Status |
| --- | --- | --- | --- | --- |
| L1 | Medium | **CSV formula injection gaps.** Cells were neutralised for a leading `= + - @`, tab and CR, but not for **LF** or the **full-width `＝ ＋ － ＠`**, which OWASP now lists (Japanese Excel reads them as formulas). `transactionsToCsv`, `ledgerToCsv` and `holdingsToCsv` all go through `toCsv`, so they inherited the gap. | `src/export/csv.ts:32` (before) | **Fixed**: the trigger set now includes `\n` and U+FF1D, U+FF0B, U+FF0D, U+FF20. Tests in `test/export.test.ts`; `docs/EXPORT.md` and `docs/BANKING.md` updated |
| L2 | Medium | **Extension spoofing in download names.** `safeFilename` kept bidirectional controls, so `downloadText('statement‮vsc.exe')` saved a file that displays as `statementexe.csv`. Download names often include user data (an account or payee name). | `src/export/filename.ts:8` (before) | **Fixed**: U+061C, U+180E, U+200B–U+200F, U+202A–U+202E, U+2060–U+2069 and U+FEFF become `_`. Tested |
| L3 | Medium | **Recipient and amount spoofing with bidi overrides.** References are cleaned (`formatTransactionReference`), but counterparty, receipt party and beneficiary **names** are printed as given. An RLO inside a name could visually reorder the amount, account tail or nickname rendered beside it. `.pu-money` was already isolated; the name elements were not. | `src/transaction-list/TransactionList.tsx:97`, `src/payment-receipt/PaymentReceipt.tsx:92`, `src/beneficiary-selector/BeneficiarySelector.tsx:156-158`; `src/styles/banking.css:42,68,114,115` | **Fixed**: `unicode-bidi: isolate` on `.pu-tx-name`, `.pu-receipt-name`, `.pu-bene-name` and `.pu-bene-nick`, so an override cannot leak past the name. Tested in `test/banking.test.ts`. The name itself is not rewritten, because legitimate RTL names exist |
| L4 | Low | **ReDoS in `safeFilename`.** `/^[.\s]+\|[.\s]+$/g` and `/[.\s]+$/g` are quadratic on a long run of spaces or dots: measured 1.2 s for 40,000 characters, and about 30 s for 200,000. | `src/export/filename.ts:10,12` (before) | **Fixed**: linear trimming. A test bounds 200,000 characters under 1 s. The cut at 150 UTF-16 units no longer splits a surrogate pair |
| L5 | Low | **ReDoS in money input.** `CurrencyInput`'s `SHAPE = /^-?\d*\.?\d*$/` was tested *before* the 40-character cap, and `formatDecimalInput` used `/^(-?)(\d*)(\.?)(\d*)$/`. Both are ambiguous (`\d*\d*`) and quadratic on a long pasted string with no dot. | `src/currency-input/CurrencyInput.tsx:57,89`; `src/money/money.ts:206` (before) | **Fixed**: unambiguous `(?:\.\d*)?` forms, and the length is checked first. A test runs 100,000 digits |
| L6 | Low | The invisible-character set used for account numbers and references missed U+061C (Arabic letter mark, a bidi control) and U+180E. | `src/banking/account.ts:12` (before) | **Fixed**, tested |
| L7 | Info | Every other regex in `src/` and `scripts/` was checked by hand. They are anchored, have length caps (`parseMoney` 100, `format` 64, `parseRate` 40, decimal 100), or run only on the repository's own build output (`scripts/site-headers.mjs`, `check-*`). No other super-linear pattern was found. | grep of `.test`, `.exec`, `.match`, `.replace`, `.split` and `new RegExp` | Holds |
| L8 | Low | **Masked PIN in the DOM.** With `mask`, `OtpInput` still gives box 1 `autocomplete="one-time-code"`, so the browser may offer an SMS code for a PIN. With `name`, it writes the whole code into a hidden input's `value`. React also mirrors controlled `value` into the attribute, so session-replay or DOM-scraping tools can record the PIN unless the app masks them. | `src/otp-input/OtpInput.tsx:131,133,158` | Planned (P-lib-1) |
| L9 | Low | **Double-click and key-repeat confirm.** `InlineConfirm` focuses the danger button as soon as it mounts. A second click, or a held Enter from the gesture that opened it, can confirm at once. This is the 2025 "double-clickjacking" pattern, and it matters for "Remove payee" or "Cancel order". | `src/inline-confirm/InlineConfirm.tsx:68` | Planned (P-lib-2) |
| L10 | Low | **No homoglyph or mixed-script check** for payee names or nicknames: `Nabil` and `Nаbil` (Cyrillic а) look the same in `BeneficiarySelector`. | `src/beneficiary-selector/BeneficiarySelector.tsx:79,156` | Planned (P-lib-3) |
| L11 | Low | `href` props (`Button`, `CardLink`, `Rows`, `LinkTable`, `StatusPill`, `CheckRow`, `Layout`) are passed through unfiltered. React 19, the peer range `^19`, replaces `javascript:` URLs with a throwing URL, so script execution is blocked. `data:` and other schemes are not blocked, though browsers refuse top-level `data:` navigation. | `src/button/Button.tsx:80`, `src/card-link/CardLink.tsx:54,62` | Accepted risk (documented; P-lib-4 optional helper) |
| L12 | Low | `rollUp` builds `values[period]` on a plain object. A period named `__proto__` is silently dropped. This does not pollute `Object.prototype` (assigning a non-object to `__proto__` is ignored), but the total for that period goes missing. | `src/ledger/statement.ts:79-80` | Planned (P-lib-5) |
| L13 | Info | No `dangerouslySetInnerHTML`, `innerHTML` assignment, `eval` or `new Function`; `check-source.mjs` fails the build if one appears. `useClipboard` uses only the async Clipboard API and never stores or logs the text. `useStorage` requires a `validate` guard on stored data. The only `console` call is the dev warning helper. `AccountNumber` never writes the unmasked number to the DOM while masked, and auto-hides on a timer and when the tab is hidden. `BankAccountCard` leaves a hidden balance out of the DOM. | `scripts/check-source.mjs:18`; `src/use-clipboard/useClipboard.ts`; `src/use-storage/useStorage.ts:9-10`; `src/account-number/AccountNumber.tsx` | Holds |
| L14 | Info | **Rounding.** Money is bigint minor units. Every division takes an explicit mode (`divideRounded`). Rates are parsed exactly without `Number`. `parseLocalizedDecimal` *rejects* extra fraction digits (`precision`) rather than truncating, so there is no silent salami rounding. `maskAccountNumber` never reveals more than half the number. | `src/calculations/rounding.ts`; `src/nepal/decimal.ts:21`; `src/banking/account.ts:48-57` | Holds |
| L15 | Info | Pasted input: `OtpInput` maps Devanagari and Arabic-Indic digits, then strips everything else. Money parsing strips bidi marks and caps the length at 100. `StatementUpload` treats the MIME type as a hint and says so. | `src/otp-input/OtpInput.tsx:53-58,113-118`; `src/money/money.ts:233-234`; `src/statement-upload/validate.ts:25` | Holds |

### 4. Docs site (PR #33: `scripts/site-headers.mjs`, `wrangler.jsonc`, `docs.yml`)

| ID | Severity | Finding | Evidence | Status |
| --- | --- | --- | --- | --- |
| D1 | Medium | **Deploy job supply chain.** `npx --yes wrangler@4.156.0` resolves wrangler's transitive dependencies at deploy time, with no lockfile, integrity check or `audit signatures`. The same runner first runs the whole build toolchain, and a process left behind by a build step can read a later step's environment, which here holds `CLOUDFLARE_API_TOKEN`. "Workers Scripts: Edit" covers every Worker in the account. | `docs.yml` (PR #33) `Deploy` step; header comment | Planned (P-cf-1) |
| D2 | Low | CSP: `script-src` is `'self'` plus the hash of each inline script, which is strong. But `style-src 'unsafe-inline'`, there is no `report-to`, and Trusted Types are off. | `scripts/site-headers.mjs:20-35` (PR #33) | Planned (P-cf-2) |
| D3 | Low | `workers_dev: true` serves the same site on `punji-ui-docs.<account>.workers.dev`: a second origin outside the custom domain's zone settings (WAF, HSTS policy). | `wrangler.jsonc` (PR #33) | Planned (P-cf-3) |
| D4 | Info | Headers: HSTS (1 year, includeSubDomains), nosniff, Referrer-Policy, Permissions-Policy, COOP, `X-Frame-Options: SAMEORIGIN` with `frame-ancestors 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `worker-src 'none'`. No third-party origins at all, so there is nothing to SRI. | `scripts/site-headers.mjs:36-48` | Holds |
| D5 | Info | Preview frame: the `example` param must match `^[a-z0-9-]+$` for both parts and exist in the build's glob map (`Object.hasOwn`). The fallback message uses `textContent`. `theme` is allowlisted to `light` or `dark`. The frame is same-origin by design, so the unsandboxed iframe is justified. | `site/src/frame.tsx:10-26`; `site/preview-frame/index.html:12-15`; `site/src/app/PhoneFrame.tsx:50` | Holds |
| D6 | Info | `_redirects` is generated from a fixed map to internal pages only, and `check-seo` fails if a target is missing. Legacy `#/slug` links resolve through the nav map or fall back to `/`. No open redirect. | `scripts/site-prerender.mjs:159-170`; `site/src/main.tsx:14-24` | Holds |

### 5. Repository hygiene

| ID | Severity | Finding | Evidence | Status |
| --- | --- | --- | --- | --- |
| R1 | Info | `SECURITY.md` has supported versions, private reporting through GitHub advisories (enabled, verified through the API), an email fallback, and response targets of 3 and 10 days. Secret scanning and push protection are on. There are 0 open secret-scanning and 0 open Dependabot alerts. | `SECURITY.md`; API | Holds |
| R2 | Low | Secret scanning's non-provider patterns and validity checks are off. | API `security_and_analysis` | Planned (P-gh-7, owner) |
| R3 | Low | Scorecard open alerts: Branch-Protection 3 (admins can bypass, 0 approvals, code-owner review not required, last-push approval off, up-to-date branches off), Code-Review 0, Maintained 0 (the repository is under 90 days old), CII-Best-Practices 0. For a single maintainer, zero required approvals is a deliberate trade-off; the admin bypass is not (see A2). | API code-scanning alerts | Planned (P-gh-2, P-gh-8) / Accepted risk (approvals, Maintained) |

## What changed on this branch

- `src/export/csv.ts`: neutralises LF and full-width formula starts (L1).
- `src/export/filename.ts`: replaces bidi and zero-width controls, trims in linear time, never splits a surrogate pair (L2, L4).
- `src/currency-input/CurrencyInput.tsx`, `src/money/money.ts`: unambiguous input regexes, length checked first (L5).
- `src/banking/account.ts`: adds U+061C and U+180E to the invisible set (L6).
- `src/styles/banking.css`: bidi-isolates party names (L3).
- `scripts/check-pack.mjs`: scans the tarball's content for secrets and source-map references (S5).
- `.github/workflows/codeql.yml`: no path filter (A10).
- Tests in `test/export.test.ts`, `test/money.test.ts` and `test/banking.test.ts`. Docs in `docs/EXPORT.md` and `docs/BANKING.md`. A patch changeset. The `export` and `download` size budgets rise by 40 B gzip each (`.size-limit.json`).

## Prioritised fix plan

### Now (this week)

1. **P-gh-2 (A2), owner, GitHub.** Close the PR-token bypass:
   - Settings → Rules → Rulesets → `main` → Bypass list: change the admin role from **Always** to
     **For pull requests only**, or remove it.
   - Settings → Environments → `npm` → Environment secrets: add `PUNJI_UI_PR_TOKEN` there, then delete the
     repository-level copy (Settings → Secrets and variables → Actions).
   - Confirm the PAT's expiry and that it has only `Contents` and `Pull requests` (read and write) on
     `punji-ui`. Better still, replace it with a GitHub App installed only on `punji-ui`
     (`actions/create-github-app-token`), so the token is not the admin user.
2. **P-gh-1 (A1), code PR.** Split `release.yml` so no dev-dependency code runs where publish credentials exist:
   - Job `gates`: `contents: read`, no secrets, no `id-token`. It runs `verify` and `check:consumer`, then
     `npm pack` and uploads the tarball and its SHA-256 as an artifact.
   - Job `version`: `contents: write` and `pull-requests: write` with the PR token. It runs only
     `changeset version` (to open or update the PR). No `id-token`.
   - Job `publish`: `environment: npm`, `id-token: write`, harden-runner in **block** mode. It runs when
     the version on `main` is not on npm yet. It downloads the artifact, checks the SHA-256, and runs
     `npm publish ./punji-ui-<v>.tgz --provenance --access public`. It runs no `npm ci` and no project
     scripts. Tag creation and the GitHub release (with the SBOM) go in a separate job holding only
     `contents: write`.
   - Optionally, publish with `npm stage publish` so every release also needs a human 2FA approval on
     npmjs.com. Malicious code would then be stuck in staging even if it ran in the job.
3. **P-gh-4 (A4), owner, GitHub.** Settings → Actions → General: choose **Allow 20was, and select
   non-20was, actions** and list the actions in use (`actions/*`, `github/codeql-action/*`,
   `step-security/harden-runner`, `dorny/paths-filter`, `zizmorcore/zizmor-action`,
   `ossf/scorecard-action`, `changesets/action`). Tick **Require actions to be pinned to a full-length
   commit SHA**. Under Workflow permissions, untick **Allow GitHub Actions to create and approve pull
   requests**. Check first: the version PR is opened with the PR token, not the workflow token, so this
   should not break it.
4. **P-cf-1 (D1), code on PR #33 plus owner on Cloudflare.**
   - Add `wrangler` (exact version) to `devDependencies`, so it is in the lockfile with integrity and
     `npm audit signatures` covers it. Then run `npx wrangler deploy` without `--yes`.
   - Split `docs.yml` into a `build` job (no secrets) that uploads `site/dist` as an artifact, and a
     `deploy` job (`environment: docs`, harden-runner block mode) that only downloads the artifact and
     deploys.
   - Owner, Cloudflare dashboard → My Profile → API Tokens: give the token **Account → Workers Scripts:
     Edit** on this account only, plus **Zone → Workers Routes: Edit** on `punji.app` only if the custom
     domain needs it. Set a TTL (90 days). Optionally restrict client IPs. Store it as an **environment**
     secret on `docs`, not a repository secret.
   - Owner, GitHub → Environments → `docs`: deployment branches = `main` only.

### Next (this month)

5. **P-gh-3 (A3), code.** Switch harden-runner to `egress-policy: block` in `release.yml` (the publish job
   first) and `docs.yml`, with an `allowed-endpoints` list built from the audit-mode insights of recent runs
   (`registry.npmjs.org:443`, `github.com:443`, `api.github.com:443`, `uploads.github.com:443`,
   `objects.githubusercontent.com:443`, Sigstore `fulcio.sigstore.dev:443` and `rekor.sigstore.dev:443`,
   the GitHub OIDC host, `api.cloudflare.com:443` for docs). Keep CI on audit.
6. **P-gh-5 (A5), owner, GitHub.** Settings → Rules → New tag ruleset: target `v*`; restrict creations,
   updates and deletions; bypass for the release GitHub App only (or no bypass, if the publish job
   creates tags with the workflow token and that token is granted). Also enable Settings → General →
   Releases → **immutable releases**, so a published release's assets (the SBOM) cannot be swapped.
7. **P-gh-6 (A9), owner.** Delete the repository secret `PUNJI_WEB_READ_TOKEN`, and revoke the PAT behind it
   if nothing else uses it.
8. **P-lib-1 (L8), code, minor version.** In `OtpInput`, when `mask` is set, use `autocomplete="off"` on every
   box. Add a `hiddenInput={false}` option, or a `formdata` event, so a PIN need not sit in a hidden input.
   Document that apps using session replay must mark PIN fields private (for example `data-private`,
   `ph-no-capture`).
9. **P-lib-2 (L9), code, minor version.** In `InlineConfirm` (and any sheet confirm), ignore confirm clicks and
   key activation for about 400 ms after mount, or until a fresh `pointerdown` or `keydown` arrives that
   started inside the component. Test it with fake timers.
10. **P-npm-1, owner, npm.** npmjs.com → Account → 2FA: use a **security key or passkey (WebAuthn)**, not
    TOTP, because phishing kits relay TOTP codes. Confirm that `@punji/ui` → Settings has **Require two-factor
    authentication and disallow tokens** and that the trusted publisher is still `20was/punji-ui`,
    `release.yml`, `npm`. Review the npm org `punji` members (owner only). Delete any granular tokens on the
    account.
11. **P-gh-7 (R2), owner, GitHub.** Settings → Code security: turn on **non-provider patterns** and
    **validity checks** for secret scanning.

### Later (next quarter)

12. **P-cf-2 (D2), code.** Try `style-src 'self'; style-src-attr 'unsafe-inline'` (React `style` props need
    only attribute styles), add `report-to` with a `Reporting-Endpoints` header, and roll out
    `require-trusted-types-for 'script'` as Report-Only first.
13. **P-cf-3 (D3), code plus owner.** After the custom domain is live, set `workers_dev: false`. Owner,
    Cloudflare → SSL/TLS: Always Use HTTPS on, minimum TLS 1.2. Consider HSTS preload for `punji.app` only
    after checking every subdomain.
14. **P-lib-3 (L10), code.** Add a pure `confusableName(name)` helper, flagging mixed scripts (Latin with
    Cyrillic or Greek) per UTS #39, and a `warning` slot in `BeneficiarySelector` for apps that want to flag
    new or lookalike payees. Server-side checks remain the real control.
15. **P-lib-4 (L11), optional.** Export `safeHref(url, { allow: ['https:', 'mailto:', 'tel:'] })` and document
    it for `href` props that come from data.
16. **P-lib-5 (L12), code, patch.** Build `rollUp` values with `Object.create(null)`, or use
    `Object.defineProperty`, so a `__proto__` period keeps its total. Add a test.
17. **P-npm-3 (S7).** When CI moves to npm 12, commit the `allowScripts` allowlist (empty, or only
    `fsevents`) and set `allow-git=none` in `.npmrc`.
18. **P-gh-8 (R3), owner.** Enable "up-to-date branches" (strict status checks) on the `main` ruleset, and
    apply for the OpenSSF Best Practices badge (bestpractices.dev: the documentation already covers most
    criteria). Accepted for now: 0 required approvals (single maintainer), Scorecard Maintained 0 (repository
    age).

### Owner click list (all settings, in one place)

| Where | Setting | Plan item |
| --- | --- | --- |
| GitHub → Rulesets → `main` | Admin bypass: Always → For pull requests only (or remove) | P-gh-2 |
| GitHub → Environments → `npm` | Move `PUNJI_UI_PR_TOKEN` here; delete the repository copy; check PAT expiry and scope (or use a GitHub App) | P-gh-2 |
| GitHub → Actions → General | Allow selected actions only; require full-SHA pinning; untick "create and approve pull requests" | P-gh-4 |
| GitHub → Rulesets → new tag ruleset | `v*`: block update and delete | P-gh-5 |
| GitHub → General → Releases | Immutable releases on | P-gh-5 |
| GitHub → Secrets | Delete `PUNJI_WEB_READ_TOKEN` | P-gh-6 |
| GitHub → Code security | Secret scanning: non-provider patterns and validity checks on | P-gh-7 |
| GitHub → Environments → `docs` | Branch `main` only; hold `CLOUDFLARE_API_TOKEN` as an environment secret | P-cf-1 |
| Cloudflare → API Tokens | Workers Scripts: Edit on this account only; Workers Routes on `punji.app` only if needed; 90-day TTL | P-cf-1 |
| Cloudflare → SSL/TLS | Always Use HTTPS; minimum TLS 1.2 | P-cf-3 |
| npm → Account | WebAuthn or passkey 2FA; no granular tokens; review org `punji` members | P-npm-1 |
| npm → `@punji/ui` → Settings | Confirm "Require 2FA and disallow tokens" and the trusted publisher | P-npm-1 |
