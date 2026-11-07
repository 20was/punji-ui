---
'@punji/ui': minor
---

`ThemeProvider`, `useTheme` and `themeInitScript` from `@punji/ui/theme-provider`: the reader's theme (system, light, dark and the two high-contrast themes), saved in localStorage and followed across tabs, written to `<html>` as `data-theme` with `color-scheme` and the `theme-color` meta, and an inline head script that applies it before first paint so there is no flash. Builds on `themeAttributes`. `target` themes one region instead of the page.
