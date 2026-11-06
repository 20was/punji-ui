---
'@punji/ui': minor
---

Token scales. Radius is now a monotonic scale, `--pu-radius-4/6/8/12/16/24/full`, with `--pu-radius-card` (24px) and `--pu-radius-control` (12px) as semantic aliases; components read only these. The old `--pu-radius-sm/md/lg/xl/2xl/3xl` are deprecated and keep their original values (out of order), so existing overrides and reads still work; rendered radii are unchanged. Spacing is a 4px scale, `--pu-space-0-5`, `1` to `12`, `16`, `20`, `24` (existing steps keep their values). New type tokens: `--pu-font-weight-{regular,medium,semibold,bold}`, `--pu-line-height-{tight,normal}`, `--pu-font-numeric` (`tabular-nums`, now used by every numeric style), `--pu-text-xl`, `--pu-tracking-display`, `--pu-tracking-label`. Also added for punji-web parity: `--pu-font-mono`, `--pu-font-code`, `--pu-shadow-md`, `--pu-shadow-card`, `--pu-nav-height`, `--pu-content-default`. `npm run lint` now fails if a scale is not monotonic.
