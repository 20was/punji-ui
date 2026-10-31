---
"@punji/ui": patch
---

Fix two layout defects found by the new visual regression gate: a `ValueRow` without a `lead` no longer squeezes its figure out of the row on narrow containers (the name now truncates instead), and `Card tone="inverse"` now actually renders on the inverse surface.
