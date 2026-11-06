---
'@punji/ui': minor
---

One gain and loss convention. The theme (`createTheme({ finance })`) is now the single source of truth: components read `--pu-color-gain` and `--pu-color-loss` only, so a red-up theme plus a chart's own `convention` prop no longer swaps colours twice. The `convention` prop is now an absolute per-instance override (no default; leave it off to follow the theme). New tokens `--pu-hue-green`, `--pu-hue-red` (and `-soft`) and `--pu-finance-convention`. Gain and loss now differ in lightness as well as hue in every theme (light gain `#2f5300`, loss `#b23a26`; at least 1.4:1, asserted by `check-contrast`); the red-up and blue-orange palettes follow. Visual baselines may need regeneration.
