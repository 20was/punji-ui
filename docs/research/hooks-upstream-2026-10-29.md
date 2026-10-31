# Hook implementation research — 2026-10-29

Inspected source and actual licence files via pinned GitHub revisions. No new external packages installed.

| Project | Evidence inspected | Decision |
|---|---|---|
| [MUI](https://github.com/mui/material-ui/tree/19d7436dc391254bca34e6d439cf54f920e1d398) | MIT LICENSE; mui-system useMediaQuery.ts; mui-material useMediaQuery.test.js (missing matchMedia, default snapshots, hydration, query changes, observing changes and StrictMode). Release API latest v10.0.0-alpha.0 dated 2026-10-12. | Adapt its memoized MediaQueryList + useSyncExternalStore pattern, preserving the MIT notice in the published tarball. React 19 support allows omitting old React compatibility branches, theme dependency and optional noSsr mode. |
| [usehooks-ts](https://github.com/juliencrn/usehooks-ts/tree/61949134144d3690fe9f521260a16c779a6d3797) | MIT LICENSE and useMediaQuery implementation. Latest release API usehooks-ts@3.1.1 dated 2025-02-05. | Learn explicit SSR defaults; prefer external-store integration over requiring callers to disable initial browser reads for hydration. Its legacy Safari listener fallback is unnecessary for Punji's documented browser baseline. No source copied. |
| [react-use](https://github.com/streamich/react-use/tree/fbe99c6327e6af94df03bc8bd6ecc5e3ff04fbcc) | Unlicense LICENSE; src/useMedia.ts; tests/useMedia.test.ts including SSR/hydration tests. Latest release API v17.6.1 dated 2026-06-10. | Adopt the test scenarios, with new tests using our existing React 19 tooling. Avoid a new all-purpose hooks dependency or effect-driven mirror of external browser state. No source copied. |

Release entries are maintenance evidence, not proof of security or a claim that latest is stable. MUI's inspected release is an alpha; no MUI package is installed. The adapted source is explicitly credited in THIRD_PARTY_NOTICES.md, and packaging requires that file.

## Implemented

- useMediaQuery(query, serverMatch=false): explicit SSR/hydration snapshot; reads native media-query matches in browser; observes changes; cleans up subscriptions on query switch/unmount. No hard-coded breakpoints, storage, theme provider or global cache.
- useHydrated(): extracted from Punji's existing web pattern; false during SSR/hydration, true after hydration and immediately in client-only rendering. No timers or global hydration flags.
- useStableOrder(sorted, keyOf, sortId) and pure keepOrder(previous, next): adapted from Punji web. Keeps stable positions during live updates but returns latest objects; new sort ID or membership reorders. Rejects duplicate keys rather than losing rows; returns a new array without casting readonly inputs to mutable output. Input arrays and row objects must be updated immutably.

Tests cover real SSR/hydrateRoot behavior with no recoverable mismatch, StrictMode subscriptions, query switching, absent matchMedia, live object freshness, sort/membership changes and duplicate key rejection. These tests validate contracts; they do not certify every browser or replace the existing visual component checks.

Whole-export gzip measured about 21.18 kB after adding three hooks (about 0.38 kB above the previous measurement). Aggregate budget is now 21.8 kB to account for these additive APIs; existing component budgets are unchanged. Each new module has its own budget, and the root Button tree-shaking check remains 640 B. No CSS or UI elements changed.
