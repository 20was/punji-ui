<a href="https://design.punji.app">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/punji-ui-banner-dark.svg">
    <img alt="Punji UI: calm, accessible React components. Themed with CSS variables, light and dark, first-class Devanagari." src=".github/assets/punji-ui-banner-light.svg" width="100%">
  </picture>
</a>

> [!WARNING]
> Work in progress — not ready for public use yet. APIs and styles will change without notice, and nothing is published to npm. Follow along or open an issue; please don't depend on it in production.

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

## Financial-library development

This repository now owns the reusable components and tokens. The consumer app
is a read-only completeness reference; reverse sync is retired. This is still
pre-release software, with substantial work remaining before production use.

- [Audit and prioritised backlog](docs/audit/README.md)
- [Architecture and release boundaries](docs/ARCHITECTURE.md)
- [Engineering research and upstream credits](docs/RESEARCH.md)
- [Financial components and Nepal APIs](docs/FINANCIAL.md)
- [Accounting display components and ledger helpers](docs/ACCOUNTING.md)
- [Banking and payments display components and their security boundary](docs/BANKING.md)
- [Reusable hooks and upstream credits](docs/HOOKS.md)
- [CSV export and its security boundary](docs/EXPORT.md)

Run `npm run portal` for the full portal with new utility documentation (requires
the sibling consumer checkout; see [portal setup](portal/README.md)).

Run `npm ci --ignore-scripts`, `npm run build`, then `npm run examples` for the
local portfolio, invoice and watchlist showcase. Examples import the actual
public package. The deployed design site still belongs to the consumer repo.

ES modules, declarations, root/subpath exports and explicit CSS distribution
remain. React 19 is a peer; one pinned MIT calendar dependency provides BS
conversion. CI checks lint, types, behavioral/accessibility tests, builds,
bundle budgets, package exports and tarball contents. These checks do not yet
constitute a complete production-readiness assessment.

Type is set for Latin and Devanagari together (Geist and Mukta, both under the
SIL Open Font License), so English and Nepali interfaces share one scale.

## Screenshots

<!-- TODO: light and dark captures of the docs site's component pages. Not added
     yet: the docs site was not rendering when this README was written, and the
     README never shows an image that is not a real capture. -->

Consumer-kit examples: [design.punji.app](https://design.punji.app). Package-based examples live in `examples/`; full gallery coverage is still pending.

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

For the smallest CSS, import the tokens, the shared base and only the
components you draw:

```ts
import '@punji/ui/tokens.css';
import '@punji/ui/css/base.css';
import '@punji/ui/css/button.css';
```

Modules that use hooks or their own event handlers carry `'use client'`, so they
work in React Server Component apps such as Next.js without a wrapper.

### Links and routers

The package has no router dependency. A component that takes `href` renders a
plain `<a>`; for in-app paths, pass your router's link once wrapped:

```tsx
import { Link } from 'react-router-dom';
import { Button, type LinkComponent } from '@punji/ui';

const RouterLink: LinkComponent = ({ href, ...rest }) => <Link to={href} {...rest} />;

<Button href="/settings" linkComponent={RouterLink}>Settings</Button>;
```

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
Every token, with its light and dark value: [docs/tokens.md](./docs/tokens.md).

## Components

The modules in this package today. Each one is also its own subpath, the same
subpath Punji's own code imports, and its documentation is on design.punji.app.

<!-- components:start -->
<!-- Public component inventory; maintained in this repository. -->

| Exports | Subpath | Docs |
| --- | --- | --- |
| `Avatar` | `@punji/ui/avatar` | [Avatar](https://design.punji.app/components/avatar) |
| `Button` | `@punji/ui/button` | [Button](https://design.punji.app/components/button) |
| `Card` | `@punji/ui/card` | [Card](https://design.punji.app/components/card) |
| `Checkbox` | `@punji/ui/checkbox` | [Checkbox](https://design.punji.app/components/checkbox) |
| `ChoiceGroup` | `@punji/ui/choice-group` | [Choice group](https://design.punji.app/components/choice-group) |
| `CommandPalette` | `@punji/ui/command-palette` | [Command palette](https://design.punji.app/components/command-palette) |
| `CompanySearch` | `@punji/ui/company-search` | [Company search](https://design.punji.app/components/company-search) |
| `Chip`, `ChipRow`, `SegmentedControl`, `SegmentedSwitch` | `@punji/ui/controls` | [Segmented control](https://design.punji.app/components/segmented-control) · [Chip](https://design.punji.app/components/chip) |
| `Drawer` | `@punji/ui/drawer` | [Drawer](https://design.punji.app/components/drawer) |
| `DrawerScreen`, `DrawerHeader`, `DrawerBody`, `DrawerFooter` | `@punji/ui/drawer-screen` | [Drawer screen](https://design.punji.app/components/drawer-screen) |
| `Field`, `NumberField`, `TextAreaField`, `DateField`, `SelectField`, `SymbolField`, `PriceField` | `@punji/ui/fields` | [Field](https://design.punji.app/components/field) |
| `Figure`, `Delta` | `@punji/ui/figures` | [Figure and Delta](https://design.punji.app/components/figure) |
| `FilterChip` | `@punji/ui/filter-chip` | [Filter chip](https://design.punji.app/components/filter-chip) |
| `FloatingTooltip`, `IconHint` | `@punji/ui/floating-tooltip` | [Tooltip and InfoTip](https://design.punji.app/components/tooltip) |
| `InfoTip`, `Tooltip` | `@punji/ui/info-tip` | [Tooltip and InfoTip](https://design.punji.app/components/tooltip) |
| `InlineConfirm` | `@punji/ui/inline-confirm` | [Inline confirm](https://design.punji.app/components/inline-confirm) |
| `PageLayout`, `PageHeader`, `ListSectionHeader`, `ChevronLeft`, `ChevronRight` | `@punji/ui/layout` | [Page layout and header](https://design.punji.app/components/page-layout) |
| `ListFilter` | `@punji/ui/list-filter` | [List filter](https://design.punji.app/components/list-filter) |
| `Live`, `LiveFigure` | `@punji/ui/live-figure` | [Live figure](https://design.punji.app/components/live-figure) |
| `LockedNote` | `@punji/ui/locked-note` | [Empty state and Note](https://design.punji.app/components/empty-state) |
| `Sheet`, `ToastProvider`, `Dock` | `@punji/ui/overlay` | [Toast](https://design.punji.app/components/toast) · [Sheet](https://design.punji.app/components/sheet) |
| `PopoverAnchor`, `Popover` | `@punji/ui/popover` | [Popover](https://design.punji.app/components/popover) |
| `RangeSlider` | `@punji/ui/range-slider` | [Range slider](https://design.punji.app/components/range-slider) |
| `GroupedCell`, `RowList`, `ValueRow`, `DataRows`, `DataRow`, `Tile` | `@punji/ui/rows` | [Rows and lists](https://design.punji.app/components/rows) |
| `ChevronDown`, `Select` | `@punji/ui/select` | [Select](https://design.punji.app/components/select) |
| `ShowMore` | `@punji/ui/show-more` | [Show more](https://design.punji.app/components/show-more) |
| `EmptyState`, `ToneIcon`, `Note`, `Skeleton`, `SkeletonText` | `@punji/ui/states` | [Empty state and Note](https://design.punji.app/components/empty-state) · [Skeleton](https://design.punji.app/components/skeleton) |
| `StatGrid`, `StatTile` | `@punji/ui/stats` | [Stat tile](https://design.punji.app/components/stat-tile) |
| `StatusPill`, `CountBadge` | `@punji/ui/status-pill` | [Status pill](https://design.punji.app/components/status-pill) |
| `StatusTag` | `@punji/ui/status-tag` | [Status tag](https://design.punji.app/components/status-tag) |
| `Switch` | `@punji/ui/switch` | [Switch](https://design.punji.app/components/switch) |
| `DataTable`, `DataListRow`, `Cell` | `@punji/ui/table` | [Data table](https://design.punji.app/components/data-table) |
| `Tabs`, `PanelTabs` | `@punji/ui/tabs` | [Tabs](https://design.punji.app/components/tabs) · [Panel tabs](https://design.punji.app/components/panel-tabs) |
| `bracketScale`, `valueScale` | `@punji/ui/chart-scale` | [Trend chart](https://design.punji.app/components/trend-chart) |
| `comboClosed`, `comboStep` | `@punji/ui/combo-step` | [Company search](https://design.punji.app/components/company-search) |
| `moveIndex`, `moveChip` | `@punji/ui/command-keys` | [Formatting and live helpers](https://design.punji.app/utilities/formatting) |
| `compactRs` | `@punji/ui/compact` | [Formatting and live helpers](https://design.punji.app/utilities/formatting) |
| `isNum`, `formatFigure`, `shortCompanyName`, `toneOf`, `parseNumber`, `searchSymbols`, `segmentTarget` | `@punji/ui/format` | [Formatting and live helpers](https://design.punji.app/utilities/formatting) |
| `TWEEN_MS`, `TINT_MS` | `@punji/ui/live` | [Formatting and live helpers](https://design.punji.app/utilities/formatting) |

<!-- components:end -->

Financial additions: `AppShell`, `FinancialSummary`, `FinancialTable`, `PriceChart`,
`OrderBook` (`@punji/ui/financial`), `OrderBookDepth` (the bars-and-totals depth view, `@punji/ui/order-book`) and Nepal utilities (`@punji/ui/nepal`).
See [the financial API guide](docs/FINANCIAL.md) and [remaining gaps](docs/audit/README.md).

## Browser support

The last two years of evergreen browsers: Chrome and Edge 111+, Firefox 113+,
Safari and iOS Safari 16.4+ (the versions with CSS cascade layers and
`color-mix()`). React 19 or later.

## Accessibility

Every component follows its [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
pattern, works with the keyboard alone, draws one visible focus ring, respects
`prefers-reduced-motion`, and passes axe-core with no serious or critical issue in
the test suite. Colour contrast is checked by axe-core in a real browser for
every visual fixture in light and dark themes ([visual testing](docs/VISUAL-TESTING.md)). If something does not work with your assistive technology,
please [open an issue](https://github.com/20was/punji-ui/issues/new/choose).

## Where the code lives

Reusable code is maintained directly in this repository. The consumer app is
a reference until a separately planned migration. See [architecture](docs/ARCHITECTURE.md).

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

### Calendar and date pickers

`Calendar`, `DatePicker` and `DateRangePicker` support Gregorian and Bikram Sambat
display, English/Nepali labels, Devanagari digits and canonical Gregorian date-only
values. See [usage, keyboard controls, supported ranges and limitations](docs/CALENDAR.md).
Run `npm run portal` for the full local portal, then open
[Date pickers](http://design.localhost:5184/components/date-picker) or
[Calendar](http://design.localhost:5184/components/calendar).

### Select menus

The existing Select now themes its options menu on supporting desktop browsers,
while preserving native form handling and touch/unsupported-browser fallback.
See [Select usage and compatibility](docs/SELECT.md) and the
[local Select examples](http://design.localhost:5184/components/select).
