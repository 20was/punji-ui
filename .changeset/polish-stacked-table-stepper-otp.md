---
'@punji/ui': patch
---

`FinancialTable` now stacks each row into a card on a phone and in any container narrower than 640px (a narrow card or sidebar), like `StockTable`; it is on by default when the first column is a row header, and `stack={false}` turns it off. `NumberField` stepper buttons repeat while held, quickening, and stop on release, leave or blur (keyboard use is unchanged). `OtpInput` codes of 7 or more boxes wrap into two balanced rows when one row cannot fit at full size, so boxes keep their 44px tap target.
