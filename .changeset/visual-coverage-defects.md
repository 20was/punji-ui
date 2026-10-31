---
"@punji/ui": patch
---

Fix eleven visual defects found by the extended visual gate. `Card` keeps its `meta` together on its own line when the title wraps, and wraps its action (such as a `ColumnLegend`) below the title instead of overlapping it. `ChoiceGroup appearance="compact"` shows its selected pill in dark theme when placed on the page. `DateRangePicker` stacks its two fields in containers narrower than 340px. `PriceChart` keeps a readable plot height on phones and spaces its title from the min and max labels. `OrderBook` fits four columns at 390px and shows a scroll shadow when it still overflows. Overlays, sheets, toasts, drawers and popovers set the body font token instead of inheriting the page font. `Pagination` with no items no longer shows a page button. A large `Card` keeps its `meta` at a quiet size, `ShareBar` shows one legend column in cards under 300px, and `KeyStats` with three columns falls back to two instead of overlapping values.
