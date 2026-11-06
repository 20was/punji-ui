---
'@punji/ui': minor
---

Colour tokens punji-web's kit uses, now in every theme (light, dark, light-hc, dark-hc): `--pu-color-focus-ring`, `--pu-color-on-accent` (text on the accent colour, not the fill), `--pu-color-surface-elevated`, `--pu-color-info`, `--pu-color-btn-line`, `--pu-color-chart-fill`, `--pu-color-inverse-shimmer` and `-shimmer-hi`. Focus outlines now read `--pu-color-focus-ring` (equal to the accent, so no visual change). `createTheme` takes `onAccent` and `focusRing` (derived from the accent, contrast-checked 4.5:1 and 3:1) and derives `chart-fill` from the chart colour. `info` and `btn-line` differ from punji-web where its values missed contrast.
