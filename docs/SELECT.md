# Select

The existing `Select` remains a controlled, real HTML select. Supporting desktop
browsers get a Punji-themed options menu through `appearance: base-select` and
`::picker(select)`. Touch devices and unsupported browsers retain their platform
picker. There is no replacement keyboard engine, hidden proxy or new dependency.

```tsx
import { Select } from '@punji/ui/select';
import '@punji/ui/styles.css';

<Select label="Sector" labelPlacement="above" value={sector}
  onChange={setSector} options={sectors} />
```

For selective CSS imports, use tokens.css, css/base.css and css/select.css.
The public value/options/onChange, labels, sizes, block, bare, loading, disabled,
HTML attributes and select event targets are preserved. `native` is an additive
escape hatch to retain the platform picker on every device. There is no multi-
select API expansion; enhanced styling is restricted to single-line selects.

## Design

The menu uses a token surface, restrained border/shadow, 4px inset, compact option
rows, a selected checkmark and soft background, distinct keyboard focus, muted
unavailable options and labelled groups. Long labels wrap inside the bounded
menu. The closed control retains 32/36/44px sizes. Invalid/user-invalid controls
use the existing loss token. `block` fills a caller-sized container; use it when
selection changes must not change the control's width. Bare controls retain the
existing parent-owned focus/surface contract.

The browser-owned selectedcontent element truncates long selected labels without
overlapping the chevron and follows the real native selection. A small layout
effect owns only this inert display button, keeping new select markup out of
React versions that still reject it and out of older server HTML parsers. React
continues to own the select and all options; there is no mirrored value state.

The browser owns placement in its top layer, keyboard/typeahead conventions,
selection, dismissal, form values, required validation and accessible semantics.
Unlike the previous OS menu, the enhanced desktop menu can be styled. It cannot
extend outside the browser viewport. The fallback is intentional, not a claim
that every browser supports the enhanced menu.

## Compatibility and checks

Enhancement requires both CSS feature support and a fine pointer with hover.
No user-agent sniffing is used. Server HTML stays a plain native select. The
existing SSR-safe media hook enables the browser-owned selected-content button
only after hydration on supporting desktop clients. Chrome
135 introduced this feature; other browser support must be checked rather than
assumed. The default unsupported/touch path uses the same select/options DOM.
`native` forces that path. Consumers can still override package CSS layers.

`npm run portal` serves the full local portal at `/components/select` with real
built exports: market sectors, sizes, groups, Nepali labels, 48 brokers, long
labels, loading/disabled/empty states and a working required form. Query fixtures
`?items=0`, `?items=1`, `?items=48` exercise list cardinalities.

`npm run check:select` (CHROME_CHANNEL=chrome when needed) verifies 390/1440,
light/dark, 0/1/48 options, grouping, long labels, keyboard/pointer selection,
unavailable options, Escape/outside dismissal, native form submission, touch
fallback, overflow, console errors and serious/critical axe findings. Screenshots
are saved under ignored test-results/select and also require visual review.
The browser matrix uses installed Chromium; it is not Safari/Firefox or assistive-
technology certification. Native screen-reader checks remain part of release QA.

The read-only portal bridge gives the legacy Select CSS its own lower cascade
layer, after declaring Tailwind reset layers and before library component styles.
It validates the source boundary and changes no consumer file. This prevents the
preview from overriding the very package component being reviewed.

See [upstream research](research/select-2026-10-29.md).
