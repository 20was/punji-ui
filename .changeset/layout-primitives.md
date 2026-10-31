---
'@punji/ui': patch
---

Add `Stack` and `Cluster` (`@punji/ui/stack`), two layout primitives that put children in a column or a wrapping row with a `gap` from the `--pu-space-*` scale, and `CodeBlock` (`@punji/ui/code-block`), a plain monospace box for CSV or JSON text with an optional label and Copy button. The documentation examples now use them instead of site-only CSS classes, so copied code works in an app. The `styles.css` budget rises from 26.8 to 27 kB and Everything from 87.3 to 87.5 kB gzip.
