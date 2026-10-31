<!-- Maintained with src/styles/tokens.css. -->

# Design tokens

Every colour, size, radius, font and duration the components read is a `--pu-*`
CSS variable, defined in `@punji/ui/tokens.css` inside the `punji.tokens` cascade
layer. The values are Punji's own theme (graphite and lime in dark, a sage
ground with off-white cards in light), mapped one to one: Punji's `--name`
is `--pu-name` here. A token that refers to another token keeps the
reference, so overriding `--pu-color-accent` also moves what is built on it.

Light and dark follow `prefers-color-scheme`; `data-theme="light"` or
`data-theme="dark"` on any element forces one for that subtree. A dash in
the dark column means the light value applies in both.

| Token | Light | Dark |
| --- | --- | --- |
| `--pu-ambient` | `none` | - |
| `--pu-color-accent` | `#3f6a00` | `#c8f23d` |
| `--pu-color-accent-fill` | `#c8f23d` | - |
| `--pu-color-accent-fill-hover` | `#b9e62a` | `#d6ff5a` |
| `--pu-color-bg` | `#e4e7de` | `#0d0e10` |
| `--pu-color-border` | `rgba(18, 19, 20, 0.07)` | `rgba(255, 255, 255, 0.07)` |
| `--pu-color-border-control` | `#7a7e78` | `#6e7480` |
| `--pu-color-border-default` | `rgba(18, 19, 20, 0.1)` | `rgba(255, 255, 255, 0.1)` |
| `--pu-color-border-strong` | `rgba(18, 19, 20, 0.18)` | `rgba(255, 255, 255, 0.18)` |
| `--pu-color-card-border` | `#d9dcd2` | `#24272b` |
| `--pu-color-chart` | `#5e8c00` | `#c8f23d` |
| `--pu-color-gain` | `#3f6a00` | `#c8f23d` |
| `--pu-color-gain-soft` | `rgba(63, 106, 0, 0.1)` | `rgba(200, 242, 61, 0.12)` |
| `--pu-color-inverse-gain` | `#c8f23d` | `#3f6a00` |
| `--pu-color-inverse-line` | `#2a2e33` | `#dcded6` |
| `--pu-color-inverse-loss` | `#ff8a78` | `#a3321f` |
| `--pu-color-inverse-muted` | `#a3a8ae` | `#4f5358` |
| `--pu-color-inverse-nepse` | `#8ea8ff` | `#3552c8` |
| `--pu-color-inverse-row` | `#1f2226` | `#ffffff` |
| `--pu-color-inverse-warn` | `#f5b84b` | `#7e5200` |
| `--pu-color-link` | `#3f6a00` | `#c8f23d` |
| `--pu-color-loss` | `#a3321f` | `#ff8a78` |
| `--pu-color-loss-soft` | `rgba(163, 50, 31, 0.1)` | `rgba(255, 122, 102, 0.14)` |
| `--pu-color-on-accent-fill` | `#0d0e10` | - |
| `--pu-color-on-loss` | `#ffffff` | `#1c0806` |
| `--pu-color-scrim` | `rgba(17, 18, 20, 0.45)` | `rgba(0, 0, 0, 0.6)` |
| `--pu-color-series-10` | `#8a5a2b` | `#d6a77a` |
| `--pu-color-series-11` | `#a336b8` | `#e07cf0` |
| `--pu-color-series-12` | `#77700f` | `#e8dc6a` |
| `--pu-color-series-3` | `#d08a10` | `#f5b84b` |
| `--pu-color-series-4` | `#7e4fd6` | `#c9a7ff` |
| `--pu-color-series-5` | `#0b7f75` | `#3fd0c0` |
| `--pu-color-series-6` | `#b8326f` | `#ff7eb6` |
| `--pu-color-series-7` | `#0a6fae` | `#5cc8ff` |
| `--pu-color-series-8` | `#c2570c` | `#ff9a52` |
| `--pu-color-series-9` | `#2f8a4c` | `#7ddc8f` |
| `--pu-color-series-nepse` | `#3552c8` | `#8ea8ff` |
| `--pu-color-shimmer-base` | `#dcdfd5` | `rgba(255, 255, 255, 0.07)` |
| `--pu-color-shimmer-highlight` | `#eceee7` | `rgba(255, 255, 255, 0.12)` |
| `--pu-color-surface` | `#f7f8f3` | `#17191c` |
| `--pu-color-surface-inverse` | `#17191c` | `#f3f4ef` |
| `--pu-color-surface-solid` | `#f7f8f3` | `#17191c` |
| `--pu-color-surface-subtle` | `rgba(18, 19, 20, 0.04)` | `rgba(255, 255, 255, 0.04)` |
| `--pu-color-surface-tint` | `#eceee7` | `#1f2226` |
| `--pu-color-tag-bg` | `#4a3a12` | `#fbe7c2` |
| `--pu-color-tag-text` | `#fbe7c2` | `#6b4600` |
| `--pu-color-text` | `#121314` | `#f3f4f1` |
| `--pu-color-text-inverse` | `#f3f4f1` | `#121314` |
| `--pu-color-text-muted` | `#4f5358` | `#a3a8ae` |
| `--pu-color-text-tertiary` | `#585c61` | `#8a8f96` |
| `--pu-color-track` | `#dde0d6` | `#2a2e33` |
| `--pu-color-warn` | `#7e5200` | `#f5b84b` |
| `--pu-color-warn-accent` | `#d08a10` | `#f5b84b` |
| `--pu-control-lg` | `44px` | - |
| `--pu-control-md` | `36px` | - |
| `--pu-control-sm` | `32px` | - |
| `--pu-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | - |
| `--pu-font-body` | `'Geist', 'Mukta', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | - |
| `--pu-font-display` | `'Geist', 'Mukta', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | - |
| `--pu-motion-base` | `220ms` | - |
| `--pu-motion-fast` | `140ms` | - |
| `--pu-radius-2xl` | `8px` | - |
| `--pu-radius-3xl` | `8px` | - |
| `--pu-radius-card` | `24px` | - |
| `--pu-radius-control` | `12px` | - |
| `--pu-radius-full` | `9999px` | - |
| `--pu-radius-lg` | `16px` | - |
| `--pu-radius-md` | `16px` | - |
| `--pu-radius-sm` | `0.5rem` | - |
| `--pu-radius-xl` | `8px` | - |
| `--pu-seg-thumb` | `#ffffff` | `#2e3237` |
| `--pu-seg-thumb-shadow` | `0 1px 2px rgba(18, 19, 20, 0.1)` | `none` |
| `--pu-shadow-lg` | `0 24px 60px -16px rgba(17, 18, 20, 0.22), 0 0 0 1px rgba(17, 18, 20, 0.04)` | `0 24px 60px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)` |
| `--pu-shadow-sm` | `none` | - |
| `--pu-space-1` | `0.25rem` | - |
| `--pu-space-16` | `4rem` | - |
| `--pu-space-2` | `0.5rem` | - |
| `--pu-space-3` | `0.75rem` | - |
| `--pu-space-4` | `1rem` | - |
| `--pu-tap-min` | `44px` | - |
| `--pu-text-base` | `clamp(1rem, 0.95rem + 0.25vw, 1.125rem)` | - |
| `--pu-text-lg` | `clamp(1.125rem, 1rem + 0.75vw, 1.5rem)` | - |
| `--pu-text-sm` | `clamp(0.8125rem, 0.77rem + 0.22vw, 0.9375rem)` | - |
| `--pu-text-xs` | `clamp(0.6875rem, 0.65rem + 0.16vw, 0.75rem)` | - |
