# Calendar and date pickers

Local portal: `/components/calendar`, `/components/date-picker` and
`/get-started/roadmap`. Run `npm run portal`. These pages use the built library,
the existing portal shell and existing kit controls. No consumer migration.

```tsx
import { useState } from 'react';
import { DatePicker, DateRangePicker } from '@punji/ui/date-picker';
import { Calendar, type DateRange } from '@punji/ui/calendar';
import '@punji/ui/styles.css';

function TransactionDate() {
  const [value, setValue] = useState<string | null>(null);
  return <DatePicker label="Transaction date" name="transactionDate"
    value={value} onChange={setValue} calendar="gregory"
    today="2026-10-29" required />;
}
```

All three components are also root exports. Importing a Button does not import
the calendar. For selective styling import tokens.css and the component CSS for
button, fields, select, popover and calendar (plus base.css for shared focus/reset rules).
The full styles.css is the recommended starting point.

## One storage contract, separate display choices

Values, min, max, defaultMonth, today and unavailable callbacks always use valid
Gregorian `YYYY-MM-DD` strings. They are civil days, not instants. Selecting
2081-01-01 BS returns `2024-04-13`, regardless of machine timezone. Do not parse
these values with `new Date(value)` to produce a user's local date.

- `calendar="gregory"`: proleptic Gregorian years 0001–9999.
- `calendar="bikram-sambat"`: verified converter coverage BS 1975-01-01 through
  2099-12-30. Values outside coverage produce an explicit picker error. An inline
  calendar clamps its viewport to supported coverage without changing selection.
- `onCalendarChange`: optionally show controlled AD/BS display buttons. Switching
  changes display only; it never rewrites the selected day.
- `language="en" | "ne"`: built-in control labels and default month/week names.
- `digits="latn" | "deva"`: independent numeric display. Both are accepted when
  typing a date or year.
- `locale`: Intl Gregorian month/weekday names, such as `fr-FR`. Supply translated
  `labels` for other control languages; this is not a full automatic translation.
- `weekStartsOn`: Sunday 0 through Saturday 6; defaults to Sunday. Pass the
  convention appropriate to your product and locale.

Typed dates use explicit `YYYY-MM-DD` in the **displayed** calendar. They do not
interpret ambiguous 01/02/03 input. Date pickers retain malformed input, show an
error on commit, and block native form validation. They never commit a silently
normalised date. Named hidden inputs submit Gregorian values. Range fields use
`name.start` and `name.end`; disabled fields do not submit. Validate again at your
application boundary: UI validation is not a security or accounting authority.

Pass `today` from the application for deterministic server rendering and the
correct business timezone. Without it, a Kathmandu day is captured on mount.
There is no midnight timer; update the prop when your application's day changes.
Use the separate date-only, instant/timezone, fiscal-year and exact-money utilities
for their respective domains. Calendar selection performs no financial arithmetic.

## Selection and constraints

`Calendar` is controlled with discriminated modes:

| Mode | Value | Behaviour |
| --- | --- | --- |
| single (default) | `string \| null` | Explicit Clear; selecting an existing day retains it |
| range | `DateRange \| null` | `{start, end: null}` while choosing; completed endpoints sorted, inclusive |
| multiple | `readonly string[]` | Toggle days; callbacks return sorted values |

`DatePicker` uses single mode. `DateRangePicker` drafts a range in its popover;
Apply commits it, while Cancel, Escape and outside dismissal discard the draft.
Clearing an optional range also requires Apply. The inline Calendar commits each
step immediately. `required` prevents clearing; multiple mode retains its last
selection. An initial empty required selection remains possible and needs input.

`min`/`max` are inclusive. `isDateUnavailable(iso)` must be a fast, synchronous,
pure predicate. Unavailable days remain keyboard focusable but cannot be selected.
A range crossing any unavailable day is rejected, preserving its starting point.
The predicate is checked across the inclusive interval; avoid expensive I/O or
unbounded ranges with costly predicates. Constraints changing after a value was
chosen do not silently mutate controlled values. Pickers flag invalid values.

`disabled` prevents interaction. An inline `readOnly` calendar permits inspection
and navigation but cannot select or clear. Read-only pickers retain visible values
and prevent opening/editing. Configure application permissions separately.

## Interaction and accessibility

A single grid day enters the Tab sequence. Arrow keys move one day/week;
Home/End move to week boundaries; PageUp/PageDown change months; Shift plus
PageUp/PageDown changes years. Enter or Space selects. Month controls and direct
year entry support birthdays and historical dates without thousands of options.
Unavailable days expose aria-disabled, selected cells expose aria-selected, and
today has aria-current. Month changes are announced through a live heading.

Pickers reuse the shared Popover with portal positioning and viewport collision
handling. Focus starts on the selected/reference day. Escape restores trigger
focus; Tab leaves the popover in form order and outside clicks preserve the
clicked target. There is no backdrop, focus trap or page scroll lock. The panel
anchors 6px from the input box, excluding labels and hints. It follows scrolling,
resizing and visual viewport changes, constrains its height when space is limited,
and dismisses if the reference scrolls offscreen. Alt+Down opens from the input. Required, disabled, readonly, invalid and
hint semantics are carried by the existing Field. Every icon button has a label.
A picker inside a native dialog portals within that dialog to preserve its inert boundary.

The surface uses existing semantic tokens, compact 36px days (44px for touch/phones), four-to-six-week grids,
light/dark themes and responsive stacked range inputs. In an existing panel use
`bare` for inline Calendar rather than nesting surfaces.

## Validation and release boundaries

`npm run verify` checks types, lint, unit tests, exports, packaging, tree shaking
and examples. With the full portal running, `CHROME_CHANNEL=chrome npm run
check:calendar` checks the actual built components, screenshots at 390/1440,
light/dark, 0/1/48 selected-date fixtures, axe, overflow, console errors, keyboard,
typed BS dates, form values, focus and range commit/cancel/clear.

Automated checks and screenshot review are not screen-reader certification.
Before release, complete VoiceOver/NVDA checks and native Nepali editorial review.
Current scope is single-month, date-only Gregorian and BS selection. Time picking,
multi-month views, RTL certification and additional calendar systems remain
separate roadmap items. The local portal still relies on the sibling checkout;
independent production portal ownership remains outstanding.

See [research and rationale](research/calendar-2026-10-29.md).
