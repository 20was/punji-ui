---
'@punji/ui': minor
---

Add `@punji/ui/icons` (beta): one icon set that replaces punji-web's icon copies. `Icon` by name (`size` sm/md/lg, `label` makes it an image, otherwise decorative), a tree-shakeable export per glyph (one icon is about 400 B gzipped), and `NavIcon` / `SettingIcon` with the web kit's props. Web's glyph and component names are kept; where two web sets used one name for different drawings the later set is prefixed (see "Migrating from the web kit" on the Icons page).
