---
"@punji/ui": minor
---

Themes, density, contrast and RTL. High-contrast themes `data-theme="light-hc" | "dark-hc"` (WCAG 2.2 AAA text, applied automatically under `prefers-contrast: more`) and Windows forced-colours support in `css/contrast.css`. Density modes `data-pu-density="compact" | "comfortable" | "spacious"` through new `--pu-cell-x`, `--pu-cell-y`, `--pu-row-min` and `--pu-row-lg` tokens; touch targets stay at least 24 px, and 44 px on coarse pointers. New `@punji/ui/theme`: `createTheme` (typed brand tokens with contrast checks, and finance palettes kept apart from brand colours), `themeAttributes`, `contrastRatio`, `financePalette`, `THEMES`, `DENSITIES`. Component CSS now uses logical properties, so layouts mirror under `dir="rtl"`; chevrons flip, amounts keep left-to-right digits, and Meter, RangeSlider and VirtualFinancialTable pins use logical insets (inline `style.left` is now `style.insetInlineStart`).
