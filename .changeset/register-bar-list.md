---
"@punji/ui": patch
---

Register the package-safe BarList module and its stylesheet for automatic syncing when its upstream source lands. Keep first-time registrations inactive until their source exists, while retaining removal checks for modules that have already shipped. Classify the latest broker modules without shipping product-specific code.
