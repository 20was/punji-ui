---
"@punji/ui": patch
---

FinancialTable keeps `emptyBody` and `emptyAction` when `search` or `pagination` is set; they were dropped and only the title rendered, so a "no matching records" state lost its reset action.
