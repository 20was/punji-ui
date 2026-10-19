# Roadmap

Punji UI is a general-purpose React kit: the pieces a complete web app needs
(forms, navigation, overlays, feedback, data display), small and accessible.
This file mirrors the status on [design.punji.app](https://design.punji.app).

## Shipped

- **Package pipeline** (this repository): ES modules with one file per component,
  types checked with are-the-types-wrong, size budgets, axe-core tests, Changesets
  releases with npm Trusted Publishing and provenance, SBOMs.
- **Button** and **SegmentedControl**, to prove the pipeline end to end.
- **Design tokens** as CSS variables, light and dark.
- **Documentation**: every component of the kit, with examples, props, usage and
  accessibility notes, at [design.punji.app](https://design.punji.app).

## Next: the extraction release (0.1)

The kit that already runs the Punji web app moves into this package, with its
docs pages, tests and budgets:

- **Inputs**: Field (text, number, date, long text), Select, Tabs, Chip and
  ChipRow, Checkbox, Switch, Range slider, Choice group (radios), List filter.
- **Actions**: Button (router-link support through a `render` prop), Show more,
  Inline confirm.
- **Data display**: Card, Rows and lists, Data table, Stat tile, Figure and
  Delta, Status pill.
- **Feedback**: Empty state and Note, Skeleton, Toast, Tooltip.
- **Overlays**: Sheet, Drawer, Command palette.
- **Layout**: Page layout and header, Phone tab bar.
- **Fonts**: an optional `@punji/ui/fonts.css` with the OFL font files and their
  licence.

Components that only make sense for Punji's own product (market status, the
account shell, stock search) stay in the app.

## Later

- Headless hooks for the same behaviour without the styles (`useSegmented`,
  `useDisclosure`, and so on).
- Combobox, date picker, menu and popover built on the platform (`<dialog>`,
  the Popover API, CSS anchor positioning) rather than a positioning library.
- Visual regression screenshots on pull requests.
- 1.0: a stable API, semver from then on.

Want something here sooner, or something missing? [Open a feature request](https://github.com/20was/punji-ui/issues/new/choose).
