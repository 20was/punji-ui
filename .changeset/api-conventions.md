---
'@punji/ui': minor
---

One prop vocabulary across components ([docs/API-CONVENTIONS.md](https://github.com/20was/punji-ui/blob/main/docs/API-CONVENTIONS.md)): `size` on the sm/md/lg scale, `variant` for visual style, `tone` for semantic colour (`gain`/`loss`/`flat`, `danger`, `neutral`), `labels` for words, `on*` handlers, `x` + `defaultX` + `onXChange` pairs and `pu-` classes, enforced by `scripts/check-api-conventions.mjs` in lint. Components that differed take the conventional name; the old one keeps working as a deprecated alias until the next major, with identical output:

- `ChoiceGroup` `variant` (was `appearance`), `CheckRow` `variant` (was `kind`), `HoldToConfirm` `variant` (was `tone`).
- `tone: 'gain' | 'loss'` on `FigureChip`, `BreakdownRow`, `KeyStats` items and `MarketBreadth` `extra` (was `'up' | 'down'`).
- `tone: 'danger'` on `Note` and `InlineState` (was `'error'`).
- `labels` on the payment fields (was `messages`) and on `Delta` (was `words`; `labels` is partial).
- `MenuButton` items take `tone: 'neutral'` (was `'default'`, never released).
