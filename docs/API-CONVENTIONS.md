# API conventions

One prop vocabulary across every component, so a prop learned on one component means the same on the next. The rules
below are what most components already did; the few that differed now take the conventional name and keep the old
one as a deprecated alias until the next major.

`scripts/check-api-conventions.mjs` enforces them (it runs in `npm run lint`, so in the "Lint, types, test, build,
size, package" CI job). It reads every props interface and every inline props type of an exported component in
`src/`. A genuine exception goes in its `ALLOW` list with a reason; an allow-list entry that no longer matches fails
the check, so the list cannot rot.

## Size

`size?: 'sm' | 'md' | 'lg'`. Controls are 32, 36 and 44 px tall; `lg` is the default for form fields because it is
the touch target. A component may offer a subset (`'md' | 'lg'` for fields, `'sm'` for a compact pill) but never a
value outside the scale.

- A measurement is not a size step. Prefer a named prop (`qrSize`, `groupSize`, `pageSize`, `maxSize`).
- Allowed exceptions: `HeadlineFigure` `size="xl"` (the display step above `lg`, for a page's lead figure);
  `SplitPane`, `QrCode` and `StateGlyph` take `size` as a measurement in px.

## Variant and tone

`variant` is the visual style; `tone` is semantic colour. Never `appearance`, `intent`, `kind` (for style) or
`color`.

- **`variant`** values are the component's own styles: `Button` and `HoldToConfirm` take `'primary' | 'secondary' |
  'ghost' | 'danger'`; `ChoiceGroup` takes `'underline' | 'compact'`; `CheckRow` takes `'check' | 'report'`.
- **`tone`** values come from one list:

| Group | Values | Meaning |
| --- | --- | --- |
| Direction | `gain`, `loss`, `flat` | A figure's movement. Never `up`/`down`/`positive`/`negative` on a tone prop. |
| Status | `neutral`, `accent`, `info`, `warn`, `danger`, `highlight` | A state or an alert. `danger` (not `error`) for a failure or a destructive action; `neutral` (not `default`) for no emphasis. |
| Surface | `inverse`, `tint`, `plain` | The ground a block sits on. |
| Data palette | `chart`, `series2` to `series12`, `rest`, `strong`, `scale*`, `nepse` | Chart and meter series. |

Colour never carries meaning alone: a sign, an arrow or a word says the same thing.

`toneOf()` in `@punji/ui/format` returns a *direction* (`'up' | 'down' | 'flat'`), not a tone; the components that
took `up`/`down` as a tone still accept them.

## Words: `labels`

Every user-visible word a component prints or announces can be replaced.

- Several words: one `labels?: Partial<XLabels>` prop (or `XLabels` when every key has a default). Merged over the
  locale pack (`PunjiLocaleProvider`), which is merged over the English defaults. Never `copy`, `messages`,
  `strings`, `translations` or `i18n`.
- A part's or a value-keyed set of words: `<scope>Labels` (`statusLabels`, `columnLabels`, `changeLabels`).
- One word: `<thing>Label` (`loadingLabel`, `retryLabel`, `emptyLabel`, `closeLabel`). The async-state set
  (`loadingLabel`, `errorLabel`, `emptyLabel`, `retryLabel`) is shared by every data component.
- Allowed exception: `ScamWarning` `copy` is scenario *content* (title, summary, warning signs from research), not
  interface words; its words are in `labels`. `words` on `TaxInvoice`, `Payslip`, `ConfirmAmount` and
  `TransferReview` is the amount-in-words line, not interface words.

## Events and handlers

- Handlers are `on<Event>` (`onClick`, `onConfirm`, `onRetry`, `onDismiss`) or `on<Thing>Change` (`onSortChange`,
  `onPageChange`, `onOpenChange`). Never `handle*`, `*Handler` or `*Callback`.
- `onChange` receives the new value, not the DOM event. `onValueChange` is for a field whose callback receives a
  richer result than the value (a check result with `state`, `reason` and the canonical `value`).

## Controlled and uncontrolled

State a caller may own comes as a triple: `x`, `defaultX`, `onXChange`.

- `value` + `defaultValue` + `onChange` (or `onValueChange`, above); `open` + `defaultOpen` + `onOpenChange`;
  `page` + `defaultPage` + `onPageChange`.
- `x === undefined` means uncontrolled. Build it with `useControllableState`, which warns in development when a
  component switches modes.
- `onChange` may stand for `onXChange` when `x` is the component's or the hook's only state
  (`useTableSelection({ selected, defaultSelected, onChange })`).
- `defaultX` without `x` is an uncontrolled starting value only (`defaultAmount` on a calculator). That is allowed.

## Classes

- Every new class uses the `pu-` prefix: `pu-<component>` on the root and `pu-<component>-<part>` inside.
- The `kit-` classes that shipped before this convention are frozen in `scripts/api-conventions-kit-classes.json`.
  They stay (renaming them would break consumer CSS that targets them) and will move to `pu-` names, with the `kit-`
  name kept as an alias for one minor version, in a later release. The check fails on any `kit-` class not in that
  list, and on a list entry no longer used, so the set only shrinks.
- Custom properties are `--pu-*` tokens (`scripts/check-css.mjs`).

## Shared props

- `className`: layout only (margin, grid placement); never restyle the internals.
- `testId`: sets `data-testid` on the root; parts get `<testId>-<part>`.
- `linkComponent`: the router link adapter; components never import a router.
- `ref`: a plain prop (React 19), on the element a caller would measure or focus.

## Deprecating a name

1. Add the conventional prop and keep the old one: `/** @deprecated Use \`variant\`; same values. Kept until the next
   major. */`. The check fails on an `@deprecated` note that does not name its replacement in backticks.
2. For an old *value* of a union (a tone), keep it in the union and say `Deprecated: 'up' and 'down', use \`gain\`
   and \`loss\`.` in the prop's JSDoc; the check accepts a listed value only when the JSDoc says so.
3. Render both identically (`test/api-conventions.test.tsx` compares the markup) and add a minor changeset.
4. Remove the alias in the next major, with a migration note.

## Deprecated aliases in this release

`MenuButton` items' tone `'default'` became `'neutral'` before `MenuButton` was released, so it has no alias.

| Component | Old | New |
| --- | --- | --- |
| `ChoiceGroup` | `appearance` | `variant` |
| `CheckRow` | `kind` | `variant` |
| `HoldToConfirm` | `tone` | `variant` |
| `FigureChip`, `BreakdownRow`, `KeyStats` items, `MarketBreadth` `extra` | `tone: 'up' \| 'down'` | `tone: 'gain' \| 'loss'` |
| `Note`, `InlineState` | `tone: 'error'` | `tone: 'danger'` |
| Payment fields (`IbanInput`, `IfscInput`, `UpiInput`, ...) | `messages` | `labels` |
| `Delta` | `words` | `labels` (partial: give only the words you change) |
