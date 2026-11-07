---
'@punji/ui': patch
---

A bare table's head row no longer paints its own surface. It showed as a white strip when the table sat on a tinted card or the page background; it now takes its container's background. A bare table that scrolls under a sticky head (`page-sticky`) keeps a solid fill.
