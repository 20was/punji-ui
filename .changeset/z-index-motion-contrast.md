---
'@punji/ui': minor
---

Add a documented z-index scale (`--pu-z-*`) used by every overlay, so a popover or tooltip opened in a drawer or sheet stacks above it and toasts sit above modals. Add a global `prefers-reduced-motion` guard for all `kit-*` and `pu-*` elements. Darken `--pu-color-series-3` in light mode to meet 3:1 against the surface, and check every series colour in `check-contrast`.
