<!--
  TODO(owner): add the wordmark here. The files go in .github/assets/
  (punji-wordmark-light.svg for light, punji-wordmark-dark.svg for dark). They
  stay out of the npm package ("files" lists dist only). Then uncomment:

<p align="center">
  <a href="https://design.punji.app">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/assets/punji-wordmark-dark.svg">
      <img alt="Punji" src=".github/assets/punji-wordmark-light.svg" height="56">
    </picture>
  </a>
</p>
-->

<h1 align="center">Punji UI</h1>

<p align="center">
  Accessible React components that stay small, follow the WAI-ARIA patterns and theme with plain CSS variables.
</p>

<p align="center">
  <a href="https://github.com/20was/punji-ui/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/20was/punji-ui/actions/workflows/ci.yml/badge.svg?branch=main"></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/20was/punji-ui"><img alt="OpenSSF Scorecard" src="https://api.scorecard.dev/projects/github.com/20was/punji-ui/badge"></a>
  <img alt="npm: not published yet" src="https://img.shields.io/badge/npm-not%20published%20yet-lightgrey">
  <a href="./LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-blue"></a>
</p>

<p align="center">
  <a href="https://design.punji.app">Documentation</a> ·
  <a href="./ROADMAP.md">Roadmap</a> ·
  <a href="./CONTRIBUTING.md">Contributing</a> ·
  <a href="./SECURITY.md">Security</a>
</p>

> [!IMPORTANT]
> **Pre-release (0.x), not on npm yet.** This repository holds the package
> pipeline and two components that prove it. The full kit moves here in the
> extraction release; until then the components live in the Punji web app and
> are documented at [design.punji.app](https://design.punji.app). APIs can
> change before 1.0.

## Why Punji UI

The figures below come from checks that run on every pull request; the last column names the check.

| | What it means | Checked by |
| --- | --- | --- |
| **Small** | `Button` adds 419 B and `SegmentedControl` 679 B to an app (minified and gzipped, React excluded); every component has a budget that fails the build when exceeded. | [size-limit](./.size-limit.json) |
| **No runtime dependencies** | `dependencies` is empty. React 19 is the only peer. No CSS-in-JS runtime: styles are plain CSS (1.7 kB gzipped for everything). | [package.json](./package.json), tarball check |
| **Tree-shakeable** | ES modules, one file per component, `"sideEffects"` lists only CSS. Import from the root or from `@punji/ui/button`. | publint, [are-the-types-wrong](https://arethetypeswrong.github.io) |
| **Accessible** | Real `<button>` and `<a>` elements, WAI-ARIA patterns (toggle group, tabs with a roving tab stop), arrow keys, Home and End, one visible focus ring, 44 px touch targets. axe-core runs in the tests and fails on any serious issue. | [Vitest + axe-core](./test) (roles, names, keyboard) |
| **Themeable** | Every colour, size and radius is a `--pu-*` CSS variable inside a cascade layer, so your own CSS wins without `!important`. Light and dark follow the system, or force one with `data-theme`. | [token check](./scripts/check-css.mjs) |
| **Verifiable releases** | Published from GitHub Actions with npm Trusted Publishing (no long-lived token) and a provenance attestation, plus an SBOM on every GitHub release. | [release workflow](./.github/workflows/release.yml) |

Type is set for Latin and Devanagari together (Geist and Mukta, both under the
SIL Open Font License), so English and Nepali interfaces share one scale.

## Screenshots

<!-- TODO: light and dark captures of the docs site's component pages. Not added
     yet: the docs site was not rendering when this README was written, and the
     README never shows an image that is not a real capture. -->

Live examples of every component, in light and dark: [design.punji.app](https://design.punji.app).

## Quick start

> Coming soon: the package is not on npm yet. These steps work from the first release.

```sh
npm install @punji/ui
```

Import the CSS once at your app's root, then use the components:

```tsx
import '@punji/ui/styles.css';
import { Button, SegmentedControl } from '@punji/ui';
import { useState } from 'react';

export function Toolbar() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  return (
    <>
      <SegmentedControl
        label="Period"
        prefix="period"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
        ]}
      />
      <Button onClick={() => console.log(period)}>Apply</Button>
    </>
  );
}
```

For the smallest CSS, import the tokens and only the components you draw:

```ts
import '@punji/ui/tokens.css';
import '@punji/ui/css/button.css';
```

`SegmentedControl` carries `'use client'`, so it works in React Server Component
apps such as Next.js without a wrapper.

## Theming

Override any token on `:root` or on a subtree:

```css
:root {
  --pu-color-accent: #4f46e5;
  --pu-color-accent-fill: #4f46e5;
  --pu-color-accent-fill-hover: #4338ca;
  --pu-radius-control: 6px;
}
```

Light and dark follow `prefers-color-scheme`. To force one, set
`data-theme="light"` or `data-theme="dark"` on `<html>` or on any element.

## Components

The two components in this package today, and their documentation:

| Component | Docs |
| --- | --- |
| Button | [design.punji.app/components/button](https://design.punji.app/components/button) |
| SegmentedControl | [design.punji.app/components/segmented-control](https://design.punji.app/components/segmented-control) |

The rest of the kit (fields, select, tabs, checkbox, switch, dialogs, drawer,
toast, tooltip, table, skeleton and more) is listed in the [roadmap](./ROADMAP.md).

## Browser support

The last two years of evergreen browsers: Chrome and Edge 111+, Firefox 113+,
Safari and iOS Safari 16.4+ (the versions with CSS cascade layers and
`color-mix()`). React 19 or later.

## Accessibility

Every component follows its [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
pattern, works with the keyboard alone, draws one visible focus ring, respects
`prefers-reduced-motion`, and passes axe-core with no serious or critical issue in
the test suite. Colour contrast is measured on the documentation site's
foundations page. If something does not work with your assistive technology,
please [open an issue](https://github.com/20was/punji-ui/issues/new/choose).

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md): how to run the checks, the bar a new
component has to meet, and how releases work. Everyone taking part follows the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Please report vulnerabilities privately, as described in [SECURITY.md](./SECURITY.md).

## Licence

The code is [MIT](./LICENSE). The fonts it is designed for (Geist, Mukta) are
under the SIL Open Font License and are not bundled. The Punji name and logo are
trademarks and are not covered by the MIT licence: see [TRADEMARKS.md](./TRADEMARKS.md).
