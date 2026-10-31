---
"@punji/ui": patch
---

Consumer fixes found by installing the packed package into a fresh app: CSS exports (`styles.css`, `tokens.css`, `css/*.css`) now ship empty declarations so TypeScript resolves `import '@punji/ui/styles.css'` without an app-level `*.css` declaration, and `MoneyDisplay`, `PriceChange` and `CurrencyInput` require `currency` or `preset` in their types (previously a missing currency type-checked and threw at render).
