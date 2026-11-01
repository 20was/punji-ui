<!-- Maintained with src/styles/tokens.css, src/styles/contrast.css and src/theme/theme.ts. -->

# Theming, contrast, density and RTL

Every component reads `--pu-*` custom properties from the `punji.tokens`
cascade layer ([tokens.md](tokens.md)). Four things change them, each an
attribute on any element, so a page, a section or one panel can differ:

| What | Attribute | Values | CSS |
| --- | --- | --- | --- |
| Colour theme | `data-theme` | none (follow the system), `light`, `dark`, `light-hc`, `dark-hc` | `tokens.css`, `css/contrast.css` |
| Density | `data-pu-density` | `compact`, `comfortable` (default), `spacious` | `tokens.css` |
| Direction | `dir` | `ltr`, `rtl` | component CSS (logical properties), `base.css` |
| Forced colours | none: the OS turns it on | `forced-colors: active` | `css/contrast.css` |

`@punji/ui/styles.css` has all of it. With granular CSS, add
`@punji/ui/css/contrast.css` after `tokens.css` for the high-contrast themes
and forced-colours rules.

The live switcher is on the docs site: [Theming](https://design.punji.app/get-started/theming/)
and [Accessibility modes](https://design.punji.app/foundations/accessibility-modes/).

## Choosing modes from a setting

`themeAttributes` from `@punji/ui/theme` (pure, no React) maps a user setting
to the attributes. `system` and `comfortable` leave their attribute off.

```ts
import { themeAttributes } from '@punji/ui/theme';

themeAttributes({ theme: 'dark', contrast: 'more', density: 'compact' });
// { 'data-theme': 'dark-hc', 'data-pu-density': 'compact' }
```

Spread the result on an element (`<div {...attrs}>`) or copy it onto
`document.documentElement` in an effect. Set the attributes before first
paint to avoid a flash; see the SSR guide on the site.

## High contrast

`light-hc` and `dark-hc` set every colour token. They meet WCAG 2.2 AAA:

- Text tokens: 7:1 or more on `bg`, `surface` and `surface-tint` (1.4.6).
- Control borders, the chart colour and series: 4.5:1 or more (stricter than
  the 3:1 of 1.4.11).
- Borders and dividers are solid, shadows become 2 px outlines, focus rings
  are 3 px.

With no `data-theme` on `<html>`, the page switches to them when the system
asks for more contrast (`prefers-contrast: more`, for example macOS
"Increase contrast"). An explicit `data-theme` always wins.

### The contrast gate

`scripts/check-contrast.mjs` (`npm run check:contrast`, and part of
`npm run lint`) reads the token blocks, composites translucent colours over
their surface, and checks 41 pairs in all four themes. It also fails when the
`prefers-color-scheme` dark block drifts from `[data-theme='dark']`, when a
high-contrast theme leaves a colour unset, or when the `prefers-contrast`
blocks differ from their theme. `--json` prints every ratio.

| Pair | light | dark | light-hc | dark-hc |
| --- | --- | --- | --- | --- |
| `text` on `surface` | 17.43 | 15.95 | 21.00 | 21.00 |
| `text-muted` on `surface` | 7.26 | 7.36 | 16.48 | 16.83 |
| `text-tertiary` on `bg` | 5.38 | 5.93 | 13.58 | 14.45 |
| `link` on `surface` | 6.01 | 13.61 | 12.69 | 18.31 |
| `gain` on `surface-tint` | 5.48 | 12.34 | 8.72 | 15.18 |
| `loss` on `surface-tint` | 5.92 | 6.96 | 8.19 | 10.15 |
| `warn` on `surface-tint` | 5.80 | 9.00 | 8.86 | 12.23 |
| `on-accent-fill` on `accent-fill` | 14.92 | 14.92 | 12.69 | 18.31 |
| `text-inverse` on `surface-inverse` | 15.95 | 16.83 | 21.00 | 21.00 |
| `border-control` on `surface-tint` | 3.53 | 3.40 | 18.43 | 17.40 |
| `chart` on `surface` | 3.76 | 13.61 | 9.93 | 18.31 |

Lowest text ratio per theme: light 5.13 (`gain` on `bg`), dark 4.90
(`text-tertiary` on `surface-tint`), light-hc 8.09, dark-hc 9.33. The
standard themes target AA (4.5:1), the `-hc` themes AAA (7:1).

## Forced colours (Windows High Contrast)

The OS replaces author colours with a small system palette and removes
backgrounds and shadows. `css/contrast.css` redraws what would otherwise
vanish, using system colours only:

- Focus: a 2 px `Highlight` outline everywhere, including inputs whose ring
  is normally a box-shadow on the wrapper.
- Edges: buttons, chips, segmented controls, cards, popovers, drawers,
  option lists and tooltips keep a `CanvasText` border.
- Selected, pressed and current (tabs, segmented controls, chips, options,
  account and keypad chips, date presets, shell navigation): `Highlight`
  background with `HighlightText`. Checkboxes, table selection boxes and
  switches are redrawn with `forced-color-adjust: none`.
- Data fills: gain bars solid, loss bars hatched, extra series striped.
- Charts: SVG paint is not forced, so marks are drawn in `CanvasText`. Up
  candles are hollow and down candles filled; the second, third and fourth
  series are dashed, dotted and dash-dotted; depth asks are dashed; loss
  sparklines are dashed.
- Gain and loss text keeps its sign (`+`, `−`) and arrow (`▲`, `▼`) in every
  mode, so colour is never the only signal.

## Density

`data-pu-density` sets these tokens for everything below the element. They
are kept out of the colour theme blocks, so a nested `data-theme` does not
reset density.

| Token | compact | comfortable | spacious | Read by |
| --- | --- | --- | --- | --- |
| `--pu-control-sm` | 28px | 32px | 36px | small buttons, segmented controls |
| `--pu-control-md` | 32px | 36px | 44px | buttons, `md` fields, steppers |
| `--pu-control-lg` | 36px | 44px | 52px | fields, large buttons |
| `--pu-cell-y` / `--pu-cell-x` | 5px / 8px | 10px / 12px | 14px / 16px | table cells, amortisation and rate tables |
| `--pu-row-min` | 36px | 48px | 56px | `DataRow` |
| `--pu-row-lg` | 56px | 72px | 80px | `ValueRow` |

Use compact for trading screens, order blotters and dense ledgers;
comfortable for mobile banking; spacious for kiosks and low-vision users.

Touch targets: compact never goes below 28 px (WCAG 2.5.8 asks for 24 px).
Buttons extend their hit area to `--pu-tap-min` (44 px) on coarse pointers,
and on a coarse pointer compact keeps the comfortable field heights
(44 px and 36 px). Components with their own `density` prop (`StockTable`,
`HoldingsTable`) keep it; the attribute changes the shared tokens.

## Brand theming

`createTheme` from `@punji/ui/theme` builds a typed, validated brand:

```ts
import { createTheme } from '@punji/ui/theme';

const { css, issues, vars } = createTheme(
  {
    light: { accent: '#0b5cad' },                 // accentFill, hover, onAccentFill, link, chart are derived
    dark: { accent: '#8bbcff' },
    radius: { control: '8px', card: '16px' },
    font: { body: '"Inter", system-ui, sans-serif' },
    finance: 'green-up',                          // or 'red-up', 'blue-orange'
  },
  { selector: ':root', strict: false },           // or "[data-brand='acme']" to scope it
);
```

- **Output:** CSS for the `punji.tokens` layer with the same selector shapes
  as `tokens.css`, so it wins when loaded after the package stylesheet.
  Generate it at build time and serve it as a file.
- **Contrast on generation:** accent and link need 4.5:1 on `bg`, `surface`
  and `surface-tint`; the text on the fill needs 4.5:1 on the fill and its
  hover; the chart colour needs 3:1 on `surface`. Misses are returned in
  `issues` (`{ theme, token, against, ratio, min }`); `strict: true` throws a
  `RangeError` instead. Missing values are derived: the fill is the accent,
  the hover moves 10% toward black (light) or white (dark), the text on the
  fill is black or white, whichever contrasts more.
- **Finance semantics stay out of the brand.** There is no brand key for gain,
  loss, debit or credit. `finance` picks a vetted palette: `green-up` (the
  default, no override), `red-up` (a rise in red, for markets that use it;
  do not combine with a component's own `convention="red-up"`), or
  `blue-orange` (distinct for red-green colour blindness). Each passes 4.5:1
  on every surface. `financePalette(name)` returns the colours.
- **High contrast is never branded.** At `:root` the `-hc` themes win on
  specificity and the system dark block skips `prefers-contrast: more`; a
  scoped brand skips sections inside a `-hc` theme and steps aside under
  `prefers-contrast: more`.
- **Safe input:** colours must be `#rgb` or `#rrggbb`, radii a length
  (`px`, `rem`, `em`), fonts only names, quotes, commas and hyphens, and the
  selector plain (no braces, semicolons, comments or angle brackets). Anything
  else throws a `TypeError`, so a brand read from a database cannot inject
  CSS.

`contrastRatio(a, b)` is exported for your own checks.

### Without JavaScript

The CSS recipe is the same shape by hand: set the brand tokens for both
themes in your own stylesheet after the package CSS (see the "Override
tokens" and "Override the accent for one section" sections of the Theming
guide), and check each colour with `contrastRatio` or any WCAG checker.

## Right to left

- Component CSS uses logical properties (`margin-inline-start`,
  `inset-inline-end`, `padding-inline`, `border-start-start-radius`,
  `text-align: start | end`), so layout, borders, popovers, option lists,
  pinned table columns, progress fills and meters mirror under `dir="rtl"`.
- Chevrons and arrows that point along the line (`ChevronRight`,
  `ChevronLeft`, pagination, `CheckRow`, `DrawerHeader` back, `CompanySearch`
  back, `NetBarHead` arrows) carry `pu-flip` and mirror.
- The `Switch` thumb and the drawer entrance move with `--pu-dir` (1 or -1,
  set by `dir`). `RangeSlider`'s fill, `Meter` and `RangeBar` marks use
  logical insets, so they line up with the native inputs.
- `VirtualFinancialTable` pins with `insetInlineStart` / `insetInlineEnd`;
  the pinned edge shadow flips, and drag-resizing inverts its direction.
- Amounts and changes (`MoneyDisplay`, `Figure`, `Delta`, `PriceChange`,
  figure chips) render as an isolated left-to-right run, so the sign,
  digits and currency keep their order inside Arabic or Hebrew text.
- Charts (`CandlestickChart`, `PerformanceChart`, `DepthChart`,
  `ColumnChart`) keep time running left to right; their plot area is `ltr`.
- Not mirrored on purpose: checkmarks, spinners, the down chevron of selects
  and "show more".

The visual fixtures `rtl` and `theme-modes` (`test/visual/fixtures-rtl.tsx`)
draw these pieces in RTL beside LTR, and every density and high-contrast
theme. Their baselines are pending (`npm run test:visual:update` in Docker).

## Known gaps

- `VirtualFinancialTable` row height is a JS prop (`rowHeight`), so density
  does not change it; pass a smaller `rowHeight` for compact screens.
- Physical 4-value shorthands inside a few component-specific rules were
  converted automatically; components with JS-positioned overlays (`InfoTip`,
  `Tooltip`, chart tooltips) position in physical pixels, which is correct
  for fixed and LTR-plot overlays.
- No manual Windows High Contrast or screen-reader pass yet; the forced-colours
  rules are checked by unit tests and the fixtures, not on a Windows machine.
