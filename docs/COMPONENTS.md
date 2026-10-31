# Status, meter and list components

Ten modules migrated from `punji-web` (`src/components/kit/`), each with its own subpath
(`@punji/ui/<name>`), stylesheet (`@punji/ui/css/<name>.css`, included in `styles.css`) and size budget.
Copy is supplied by the caller; the only built-in text is two overridable English defaults
(`Dismiss` on StepList, `(opens in a new tab)` on CardLink). Examples use synthetic NEPSE-style data.

Links: every component that takes `href` also takes `linkComponent` (see `src/internal/link.tsx`); absolute
`http(s)` addresses always render a plain `<a>`. No router is imported.

Shared rules: tone never carries meaning alone (a status is words, a sign is in the figure); decorative graphics
are `aria-hidden`; every focusable element has a `:focus-visible` outline.

## RetryNote

One part of a page failed to load; says so where the data would be. Not for a whole failed page (use
`EmptyState`) or a banner with an icon tile (use `InlineState`).

Props: `children` (what failed), `retryLabel` (required), `onRetry`, `testId`. Accessibility: `role="alert"`; the
retry is a real `Button`. Composes `ToneIcon` and `Button`.

```tsx
<RetryNote retryLabel="Try again" onRetry={refetch}>Could not load your holdings.</RetryNote>
```

## SummaryFigure

One figure the reader acts on, between hairlines inside a card. Not a page headline.
Props: `label`, `value`, `note`, `tone` (`inverse` default: full-weight label, `tint`: quiet), `size` (`md`, `lg`).
The value never truncates. Pass a `MoneyDisplay` as `value` for exact amounts.

```tsx
<SummaryFigure label="If you sold everything today" value="Rs 1,24,500" note="after Rs 1,120 fees" />
```

## MeterBar, RangeBar, ShareBar, ShareLegend, ShareDonut, DistributionBar (`meter`)

Bars that show size. Use beside a printed figure, never instead of one.

- `MeterBar parts max marker label`: parts end to end on a track; `marker` is a benchmark. Decorative unless `label` (then `img`).
- `RangeBar head fill span marks domain legend label`: a value among others; marks are `strong | accent | dot | tick | edge` with labels placed under the mark. Without `label` the labels are real text; with it the bar is one `img` and the duplicate labels are hidden.
- `ShareBar items label legend foot`: shares of a whole as a stacked bar plus legend (`columns | list | grid | none`). `label` (required) says the shares in words. An item with `onSelect` becomes a button with `aria-pressed`.
- `ShareDonut items label count unit size`, `ShareLegend items layout`: the ring and the legend alone.
- `DistributionBar items label foot`: counts on a five-step scale (`scale0` to `scale4`), bar low to high, legend in the order given.
- `SHARE_TONES`: twelve distinct categorical tones, then `rest`.

Tokens used: `--pu-color-chart`, `--pu-color-series-3..12`, `--pu-color-track` (added, both themes).

```tsx
<ShareBar label="Banking 62 percent, Hydropower 38 percent" items={[
  { key: 'b', label: 'Banking', pct: 62, tone: 'chart' },
  { key: 'h', label: 'Hydropower', pct: 38, tone: 'series2' },
]} />
```

## StatusDisc, CheckList, CheckRow (`check-row`)

A list of checks, one row each: icon disc, title, one line, optional trail visual, figure, status pill, chevron.
Use for verdict lists; for plain label/value use `DataRows`. Rows render `<li>`; draw them in a `CheckList`.

`CheckRow`: `icon`, `tone`, `title`, `line`, `trail`, `figure`, `figureSub(+Tone)`, `status {label,tone}`, `action`,
`kind` (`check | report`), `onClick` (button, `pressed`), `href` + `linkComponent` + `external` + `target`, `tab`,
`ariaLabel`, `ariaHasPopup`, `dataRow`, `testId`. A row with an `action` is plain; the action is its own control.
`CheckList`: `label | labelledBy`, `role` (`list | tablist`). A tab list needs a name and gets Arrow Up/Down, Home and
End focus movement built in (a caller `onKeyDown` runs first and may cancel). Classes are `kit-crow*` (not
`kit-check*`, which `Checkbox` owns). `StatusDisc` is decorative (`aria-hidden`): the status pill carries the words.

```tsx
<CheckList label="Portfolio checks">
  <CheckRow icon={<WarnIcon />} tone="warn" title="Concentration" line="Banking is 62% of holdings"
    figure="62%" status={{ label: 'Watch', tone: 'warn' }} onClick={openDetail} pressed={open} />
</CheckList>
```

## InlineState

A state inside a card: tile, title, line, actions (locked, failed, empty, offline, stale). Use `EmptyState` for a
whole panel, `Note` for a caveat beside data.
Props: `icon` (`lock error clock offline info star bell chart eyeOff check`), `tone` (`error | warn`), `title`, `body`,
`actions`, `layout` (`stack | row`), `bare`, `role` (`alert` for failures, `status` for changing states), `className`,
`testId`. Also exports `StateGlyph`.

```tsx
<InlineState icon="offline" tone="warn" layout="row" role="status" title="Offline. Prices last updated 11:02." />
```

## KeyStats and FactList

`KeyStats`: label-over-value cells, 2 or 3 columns or a `strip`. `items {label, value|null, sub, tone}`, `empty`
(required words for an unknown value, never a dash), `loading` (skeleton values, `aria-busy`), `label`. A `tone`
only tints; put the sign in the value.
`FactList`: one column of label and value lines under a small `title`; `facts {label, value, quiet}`, `stack`.
Both are `<dl>`.

```tsx
<KeyStats label="NABIL session" empty="Not published"
  items={[{ label: 'Open', value: 'Rs 1,020.00' }, { label: 'EPS', value: '38.2', sub: 'Q1 2082/83' }]} />
```

## StepList

Numbered first steps. Props: `steps {title, body}`, `current` (0-based, -1 none; sets `aria-current="step"`), `title`,
`eyebrow`, `lead`, `foot`, `tone` (`inverse | plain`), `layout` (`tiles | rows | banner`), `headingLevel` (2 to 4),
`onDismiss` + `dismissLabel` (banner). An ordered list. The inverse tone needs the `.kit-inv` rule now in `base.css`.

```tsx
<StepList title="Start with your first holding" current={0}
  steps={[{ title: 'Add a holding', body: 'Search for NABIL' }, { title: 'Set an alert' }]} />
```

## CardLink

The one text link in a card header. In-app path: `linkComponent` or `<a>`, same tab, chevron. Absolute URL (or
`external`): new tab, `rel="noopener noreferrer"`, arrow icon, and `newTabLabel` spoken after the words (pass the
reader's language). `ariaLabel` must contain the visible words (WCAG 2.5.3). Props: `href`, `children`, `external`,
`linkComponent`, `newTabLabel`, `ariaLabel`, `className`, `testId`. Also exports `ExternalIcon`.

```tsx
<Card title="Holdings" action={<CardLink href="/portfolio" linkComponent={RouterLink}>Open portfolio</CardLink>} />
```

## LinkTable, LinkTableRow, StockLabel (`link-table`)

A short list where each row opens something, with quiet column heads. Under 560px (or 360 with `compactAt={360}`)
heads hide and each row shows its `compact {lead, trail}` layout. Not for long or sortable data (use `DataTable`).
`LinkTable`: `label` (required), `columns {key,label,track,end}`, `chevron`, `heads`, `compactAt`, `linkComponent`.
`LinkTableRow`: `cells`, `compact`, `href`, `ariaLabel` (must contain the visible text), `testId`. Heads are
`aria-hidden`; a link row reads as one sentence of its cells. `StockLabel`: `symbol`, `tag`, `line`, `extra`, `shrink`.

```tsx
<LinkTable label="Holdings" linkComponent={RouterLink} columns={[
  { key: 's', label: 'Stock', track: 'minmax(0, 1.4fr)' }, { key: 'v', label: 'Value', track: '110px', end: true }]}>
  <LinkTableRow href="/stock/NABIL" cells={[<StockLabel symbol="NABIL" line="Nabil Bank" />, 'Rs 51,230']}
    compact={{ lead: <StockLabel symbol="NABIL" line="Nabil Bank" extra="100 shares" />, trail: 'Rs 51,230' }} />
</LinkTable>
```
