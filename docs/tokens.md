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

High-contrast themes (`data-theme="light-hc"` and `"dark-hc"`, in
`css/contrast.css`) give every colour token its own value, checked to WCAG
AAA by `scripts/check-contrast.mjs`. Density (`data-pu-density`) changes the
control, cell and row tokens listed under "Density and direction" below.
Both are documented in [THEMING.md](THEMING.md).

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
| `--pu-color-gain` | `#284800` | `#c8f23d` |
| `--pu-color-gain-soft` | `rgba(40, 72, 0, 0.1)` | `rgba(200, 242, 61, 0.12)` |
| `--pu-color-inverse-gain` | `#c8f23d` | `#284800` |
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
| `--pu-color-series-3` | `#b07300` | `#f5b84b` |
| `--pu-color-series-4` | `#7e4fd6` | `#c9a7ff` |
| `--pu-color-series-5` | `#0b7f75` | `#3fd0c0` |
| `--pu-color-series-6` | `#b8326f` | `#ff7eb6` |
| `--pu-color-series-7` | `#0a6fae` | `#5cc8ff` |
| `--pu-color-series-8` | `#c2570c` | `#ff9a52` |
| `--pu-color-series-9` | `#2f8a4c` | `#7ddc8f` |
| `--pu-color-series-nepse` | `#3552c8` | `#8ea8ff` |
| `--pu-color-series-nepse-soft` | `rgba(53, 82, 200, 0.1)` | `rgba(142, 168, 255, 0.14)` |
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
| `--pu-font-mono` | same stack as body | - |
| `--pu-font-code` | `ui-monospace, 'SFMono-Regular', Menlo, monospace` | - |
| `--pu-font-weight-regular` | `400` | - |
| `--pu-font-weight-medium` | `500` | - |
| `--pu-font-weight-semibold` | `600` | - |
| `--pu-font-weight-bold` | `700` | - |
| `--pu-line-height-tight` | `1.2` | - |
| `--pu-line-height-normal` | `1.5` | - |
| `--pu-font-numeric` | `tabular-nums` | - |
| `--pu-tracking-display` | `-0.032em` | - |
| `--pu-tracking-label` | `0.11em` | - |
| `--pu-nav-height` | `72px` | - |
| `--pu-content-default` | `1440px` | - |
| `--pu-text-xl` | `clamp(1.3125rem, 1.05rem + 0.85vw, 1.75rem)` | - |
| `--pu-shadow-md` | `none` | - |
| `--pu-shadow-card` | `0 1px 2px rgba(18, 19, 20, 0.05), 0 8px 24px -16px rgba(18, 19, 20, 0.18)` | `none` |
| `--pu-motion-base` | `220ms` | - |
| `--pu-motion-fast` | `140ms` | - |
| `--pu-radius-4` | `4px` | - |
| `--pu-radius-6` | `6px` | - |
| `--pu-radius-8` | `8px` | - |
| `--pu-radius-12` | `12px` | - |
| `--pu-radius-16` | `16px` | - |
| `--pu-radius-24` | `24px` | - |
| `--pu-radius-full` | `9999px` | - |
| `--pu-radius-card` | `var(--pu-radius-24)` | - |
| `--pu-radius-control` | `var(--pu-radius-12)` | - |
| `--pu-seg-thumb` | `#ffffff` | `#2e3237` |
| `--pu-seg-thumb-shadow` | `0 1px 2px rgba(18, 19, 20, 0.1)` | `none` |
| `--pu-shadow-lg` | `0 24px 60px -16px rgba(17, 18, 20, 0.22), 0 0 0 1px rgba(17, 18, 20, 0.04)` | `0 24px 60px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)` |
| `--pu-shadow-sm` | `none` | - |
| `--pu-space-0-5` | `0.125rem` | - |
| `--pu-space-1` | `0.25rem` | - |
| `--pu-space-2` | `0.5rem` | - |
| `--pu-space-3` | `0.75rem` | - |
| `--pu-space-4` | `1rem` | - |
| `--pu-space-5` | `1.25rem` | - |
| `--pu-space-6` | `1.5rem` | - |
| `--pu-space-7` | `1.75rem` | - |
| `--pu-space-8` | `2rem` | - |
| `--pu-space-9` | `2.25rem` | - |
| `--pu-space-10` | `2.5rem` | - |
| `--pu-space-11` | `2.75rem` | - |
| `--pu-space-12` | `3rem` | - |
| `--pu-space-16` | `4rem` | - |
| `--pu-space-20` | `5rem` | - |
| `--pu-space-24` | `6rem` | - |
| `--pu-tap-min` | `44px` | - |
| `--pu-text-base` | `clamp(1rem, 0.95rem + 0.25vw, 1.125rem)` | - |
| `--pu-text-lg` | `clamp(1.125rem, 1rem + 0.75vw, 1.5rem)` | - |
| `--pu-text-sm` | `clamp(0.8125rem, 0.77rem + 0.22vw, 0.9375rem)` | - |
| `--pu-text-xs` | `clamp(0.6875rem, 0.65rem + 0.16vw, 0.75rem)` | - |

## Scales and deprecated aliases

- **Radius** is `4, 6, 8, 12, 16, 24, full` (`--pu-radius-<px>`). A card takes `--pu-radius-card`, a button, chip or field takes `--pu-radius-control`; override those two to retheme (`createTheme` does).
- **Space** is a 4px grid, `--pu-space-<n>` is `n * 4px`; `--pu-space-0-5` is 2px. Existing `1` to `4` and `16` are unchanged.
- **Type**: weights `regular/medium/semibold/bold` (400/500/600/700), line heights `tight` 1.2 and `normal` 1.5. `--pu-font-numeric` is the `font-variant-numeric` for figures; override it to `normal` to turn tabular figures off everywhere.
- `scripts/check-css.mjs` (part of `npm run lint`) fails if a scale is not strictly increasing or a `var(--pu-*)` has no definition.

**Deprecated** (still defined with their original, non-monotonic values; components no longer read them; removed in the next major):

| Deprecated | Value | Use instead |
| --- | --- | --- |
| `--pu-radius-sm` | `0.5rem` | `--pu-radius-8` |
| `--pu-radius-md` | `16px` | `--pu-radius-16` |
| `--pu-radius-lg` | `16px` | `--pu-radius-16` |
| `--pu-radius-xl` | `8px` | `--pu-radius-8` |
| `--pu-radius-2xl` | `8px` | `--pu-radius-8` |
| `--pu-radius-3xl` | `8px` | `--pu-radius-8` |

Note: overriding a deprecated name no longer restyles components. Override the scale step or the card and control aliases.

## Stacking (z-index)

Components read one scale, so layers never collide. Low to high, with gaps for
your own layers in between. A popover or tooltip opened inside a drawer or
sheet sits above it, and toasts sit above modals.

| Token | Value | Used by |
| --- | --- | --- |
| `--pu-z-base` | `0` | page content |
| `--pu-z-raised` | `1` | a lifted element inside one component |
| `--pu-z-sticky` | `100` | dock, drawer header and footer |
| `--pu-z-dropdown` | `200` | option lists, suggestions |
| `--pu-z-overlay` | `1000` | drawer, sheet and command palette backdrops |
| `--pu-z-modal` | `1100` | full-screen company search sheet |
| `--pu-z-popover` | `1200` | popovers, including their full-screen form on phones |
| `--pu-z-toast` | `1300` | toasts |
| `--pu-z-tooltip` | `1400` | tooltips |
| `--pu-z-skip-link` | `1500` | skip links |

## Reduced motion

With `prefers-reduced-motion: reduce`, every element whose class starts with
`kit-` or `pu-` (and its `::before` and `::after`) gets near-instant animations
and transitions, from the `punji.components` layer. The loading spinner keeps
turning, and progress that JS drives (the hold-to-confirm fill) still updates.

## Density and direction

Set on `:root` and by `data-pu-density` (control heights included); `--pu-dir`
follows `dir`. Full table and touch-target rules: [THEMING.md](THEMING.md#density).

| Token | Default (comfortable) | compact | spacious |
| --- | --- | --- | --- |
| `--pu-cell-x` | `12px` | `8px` | `16px` |
| `--pu-cell-y` | `10px` | `5px` | `14px` |
| `--pu-control-lg` | `44px` | `36px` (`44px` on coarse pointers) | `52px` |
| `--pu-control-md` | `36px` | `32px` (`36px` on coarse pointers) | `44px` |
| `--pu-control-sm` | `32px` | `28px` | `36px` |
| `--pu-row-lg` | `72px` | `56px` | `80px` |
| `--pu-row-min` | `48px` | `36px` | `56px` |
| `--pu-dir` | `1` | `-1` under `dir="rtl"` | - |

## Gain and loss colour convention

`--pu-color-gain` and `--pu-color-loss` are what a rise and a fall look like; components read only these. The theme sets
them (`createTheme({ finance: 'red-up' })` swaps them). The fixed hues `--pu-hue-green`, `--pu-hue-green-soft`,
`--pu-hue-red` and `--pu-hue-red-soft` do not swap: they are what a component's `convention` prop points gain and loss at
(`[data-convention='red-up']` or `'green-up']`). `createTheme` writes `--pu-finance-convention` (absent means `green-up`).
In the light theme gain (`#284800`) and loss (`#a3321f`) differ in lightness by 1.50:1 as well as hue; the contrast gate
requires 1.4:1 in every theme. See [THEMING.md](THEMING.md#gain-and-loss-colour-convention).
