# Security policy

## Supported versions

Until 1.0, only the latest published `0.x` release receives fixes. After 1.0, the
latest minor of the current major does.

## Reporting a vulnerability

Please do not open a public issue.

Report it privately through GitHub: **Security → Report a vulnerability** on this
repository (<https://github.com/20was/punji-ui/security/advisories/new>). If you
cannot use GitHub, email contact@punji.app with "SECURITY" in the subject.

You will get an acknowledgement within 3 working days and a first assessment
within 10. We will agree a disclosure date with you, credit you in the advisory
unless you prefer otherwise, and publish a fixed release before the details.

## What this package does to stay safe

- **No runtime dependencies.** Only React is a peer; nothing else runs in your app.
- **No HTML from data.** No `dangerouslySetInnerHTML`, no `eval`, no inline
  event-handler strings. Components render text as text.
- **Releases you can verify.** Every version is published from the
  [release workflow](./.github/workflows/release.yml) with npm Trusted Publishing
  (OIDC, no stored npm token) and carries a provenance attestation. Check it with
  `npm audit signatures` in your project, or on the package's npm page. Each
  GitHub release has a CycloneDX SBOM attached.
- **Hardened CI.** Actions pinned to commit SHAs, least-privilege `permissions`
  per job, no credentials persisted in checkouts, installs with
  `npm ci --ignore-scripts`, a lockfile that may resolve only to the npm registry
  over HTTPS with integrity hashes, registry signature checks, CodeQL, zizmor,
  dependency review on pull requests, and OpenSSF Scorecard.
