---
'@punji/ui': patch
---

A batch of defect fixes.

- `Tabs`: the count badge no longer fades with opacity, so it passes axe colour contrast.
- `NumberField` now parses what it was documented to accept: the text stays as typed, and the new `onValueChange` reports it through `parseLocalizedDecimal` (grouping commas, Devanagari digits, `integer`, `maxFractionDigits`, `grouping`) as an exact decimal string or a reason it is not a number yet. Nothing is rounded.
- `ValueRow`: the chevron sits beside the figure instead of wrapping to a new line at wide widths.
- `CurrencyInput` right-aligns the amount as it is typed, with the currency code at the end.
- `ColumnChart` and `PriceChart` use the shared chart frame. `PriceChart` gains the keyboard and pointer readout the other charts have (arrow keys, Home, End, Escape; the focused value is announced).
- `chart-math` adds `aggregateByPeriod` (candles to calendar weeks, months, quarters or years) and `rebaseOnto`; `PerformanceChart` starts a benchmark that begins later level with the portfolio on its first date instead of at 0%.
- `DatePicker` and `DateRangePicker`: the popover, calendar and range footer are a separate chunk (`DatePickerPanel`) loaded on the first hover, focus or open, which cuts the initial JavaScript of `TransactionHistory` by about 18% (20.5 to 16.8 kB gzip). The panel renders synchronously once loaded; a test that opens a picker for the first time should `await` the dialog.
- Documented every prop of `Chip`, `ChipRow`, `ShowMore`, `InlineConfirm`, `Avatar`, `StatusTag`, `StatGrid`, `StatTile`, `Sheet`, `Dock` and the drawer screen parts, and exported their props types.
