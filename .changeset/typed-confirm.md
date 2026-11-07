---
'@punji/ui': minor
---

`InlineConfirm` and `AlertDialog` take `match` (the reader types a word before the confirm works; the field takes focus and Enter confirms), `matchLabel` and `fieldTestId`, and `strength: 'caution' | 'danger'` (the primary or the danger button). `confirmMatches(typed, match)` is exported. Without the new props they behave as before.
