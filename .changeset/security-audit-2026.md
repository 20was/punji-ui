---
'@punji/ui': patch
---

Security hardening from the 2026 audit (docs/SECURITY-AUDIT-2026.md). `toCsv` and `neutralizeFormula` now also prefix cells that start with a line feed or with the full-width `＝ ＋ － ＠`, matching OWASP's current CSV-injection list. `safeFilename` (and so `downloadText`) replaces bidirectional and zero-width controls, so a name such as `invoice‮fdp.exe` cannot disguise its extension, trims long runs of dots and spaces in linear time instead of quadratic, and never cuts a surrogate pair. `CurrencyInput` and `formatDecimalInput` use unambiguous patterns, so a long pasted string cannot stall the tab (ReDoS). `normalizeAccountNumber` and `formatTransactionReference` also strip U+061C and U+180E. Counterparty, receipt and beneficiary names are bidi-isolated (`unicode-bidi: isolate`), so a direction override inside a name cannot reorder the amount or account number beside it. The `export` and `download` size budgets rise by 40 B gzip each.
