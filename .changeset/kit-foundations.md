---
'@punji/ui': minor
---

The first part of the Punji UI kit, mirrored from the Punji web app: Button
(with `linkComponent` for router links), Select, SegmentedControl and
SegmentedSwitch, Tabs, Chip and ChipRow, Checkbox, Switch, ChoiceGroup,
ShowMore, Card and StatusPill, plus the `formatFigure`, `toneOf`,
`parseNumber`, `searchSymbols` and `segmentTarget` helpers. Every module has
its own subpath (`@punji/ui/controls`, `@punji/ui/select`, …) and stylesheet
(`@punji/ui/css/<module>.css`, with `css/base.css` shared). The tokens are
Punji's theme as `--pu-*` variables, light and dark. The placeholder
`@punji/ui/segmented-control` subpath is now `@punji/ui/controls`.
