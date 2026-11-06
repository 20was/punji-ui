---
'@punji/ui': minor
---

Add `LinkProvider` (from `@punji/ui/link`, also on the root): give the kit your router's link once and Button, CardLink, StatusPill, CheckRow, ValueRow, LinkTable and PageHeader render in-app `href`s through it. A component's own `linkComponent` prop still wins, and the fallback is a plain `<a>`. `LinkComponent` now also receives a `ref`. New `safeHref` guards every rendered `href`: `javascript:`, `vbscript:`, `data:` and other unlisted schemes render an `<a>` without `href` (and a development warning); relative paths, http(s), mailto and tel pass. A `target="_blank"` link always gets `rel="noopener noreferrer"`. Absolute mailto and tel addresses now render a plain `<a>` instead of the router link. New guide: Using with a router (React Router, Next.js, TanStack Router).
