# Roadmap

Punji UI is a general-purpose React kit: the pieces a complete web app needs
(forms, navigation, overlays, feedback, data display), small and accessible.
It is a mirror of the kit that runs the Punji web app: Punji stays the source
of truth, and `npm run sync` brings each change here (see
[CONTRIBUTING.md](./CONTRIBUTING.md#how-the-kit-is-kept-in-sync-with-punji)).
This file mirrors the status on [design.punji.app](https://design.punji.app).

## Shipped (in this repository, not on npm)

- **Package pipeline**: ES modules with one file per module, types checked with
  are-the-types-wrong, size budgets, axe-core and property-based tests,
  Changesets, npm Trusted Publishing and provenance ready for the first release.
- **Design tokens**: Punji's theme as `--pu-*` CSS variables, light and dark
  ([docs/tokens.md](./docs/tokens.md)).
- **The sync** from Punji's web kit, which refuses anything it cannot classify.
- **Inputs and actions**: Button (router links through `linkComponent`),
  Select, SegmentedControl and SegmentedSwitch, Tabs, Chip and ChipRow,
  Checkbox, Switch, ChoiceGroup, ShowMore.
- **Display**: Card, StatusPill.
- **Helpers**: `formatFigure`, `toneOf`, `parseNumber` (Devanagari digits
  too), `searchSymbols`, `segmentTarget`.

## Next

Each step is its own pull request, green on its own:

1. **Inputs and overlays**: Field (text, number, date, long text, symbol),
   CompanySearch, ListFilter, RangeSlider, InlineConfirm, Sheet, Toast and
   Dock, Drawer, CommandPalette, Tooltip and InfoTip.
2. **Data display**: Rows and lists, Data table, Stat tile, Figure and Delta,
   Live figure, Empty state, Note and Skeleton, Page layout and header
   (router links through `linkComponent`), compact amounts.
3. **Month grid**, once it takes general props instead of Punji's data shape.

## Later

- **Publishing to npm**, once the API has settled across these steps. Until
  then the package stays `"private": true`.
- An optional `@punji/ui/fonts.css` with the OFL font files and their licence.
- A general icon set (Punji's navigation glyphs are named for its own pages).
- Headless hooks for the same behaviour without the styles.
- Combobox, date picker, menu and popover built on the platform (`<dialog>`,
  the Popover API, CSS anchor positioning) rather than a positioning library.
- Visual regression screenshots on pull requests.
- 1.0: a stable API, semver from then on.

## Stays in Punji

These are part of Punji's own product, not the kit, and are never mirrored:

| Piece | Why |
| --- | --- |
| Logo, LogoWordmark | Punji brand artwork; the name and logo are trademarks ([TRADEMARKS.md](./TRADEMARKS.md)). |
| Phone tab bar | Punji's own navigation: its sites, routes and sections. |
| Tab routes | Punji's addresses, cookies and session keys. |
| Navigation icons | Glyphs named for Punji's pages (a general set is under Later). |

Want something here sooner, or something missing? [Open a feature request](https://github.com/20was/punji-ui/issues/new/choose).
