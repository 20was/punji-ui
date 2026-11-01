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

# Second batch: figures, bars, charts, totals, pages

Seven more modules from `punji-web`, same rules: subpath `@punji/ui/<name>`, stylesheet `@punji/ui/css/<name>.css`,
size budget, caller-supplied copy (the few English defaults are overridable), synthetic NEPSE-style examples. No new
tokens. Where a component prints a figure it takes a string or a `MoneyDisplay`; none does tax or fee arithmetic.

## HeadlineFigure and FigureChip (`summary-figure`)

Same module and stylesheet as `SummaryFigure` (the same punji-web file, and the pair are the two sizes of "one figure
that matters", so one import and one CSS file). `HeadlineFigure` is a page's or a view's lead figure; `SummaryFigure`
is the one figure to act on inside a card.

`HeadlineFigure`: `label`, `labelAction` (a small control on the label's line), `currency` ("Rs", smaller and muted; omit
it when `value` is a `MoneyDisplay`), `value`, `aside` (on the figure's baseline), `line` (one sentence), `children`
(FigureChips), `size` (`xl | lg`), `testId`, `valueTestId`. The figure never truncates; a long label wraps.
`FigureChip`: `tone` (`up | down | flat`), `children`, `srLabel` (spoken, unseen: "Loss"). The tint never carries
the direction: write the sign in the text.

```tsx
<HeadlineFigure label="Worth now" currency="Rs" value="12,48,000" line="Across 14 holdings.">
  <FigureChip tone="up">+Rs 8,240 (+0.7%) today</FigureChip>
  <FigureChip tone="down">-Rs 21,400 (-1.7%) this week</FigureChip>
</HeadlineFigure>
```

## SplitBar, DivergingBar, NetBar, NetBarHead (`bars`)

Bars that print beside their figures; the bars are `aria-hidden` unless given a `label`, because the words beside them
say the same thing.

- `SplitBar parts label`: one whole split into parts, each part's `label` under the bar (first at the start, last at
  the end). Zero, negative and non-finite parts draw no width. With neither part labels nor `label` it warns in
  development, since its meaning would be colour alone.
- `DivergingBar value max label`: a rise grows right, a fall left, from a drawn centre line, on a shared `max`. A bad
  `max` or value draws nothing, never `NaN%`.
- `NetBar value max text tip`: the same with its signed figure `text` in the cell. `tip { title, rows { label, value, tone } }`
  is read out on pointer hover (not touch) and always spoken after the figure for a screen reader.
- `NetBarHead left right`: the column head; its arrows are `aria-hidden`.
- Own tone classes (`gain | loss | neutral | nepse | chart`), not `MeterBar`'s: the modules stay independent.

```tsx
<SplitBar parts={[
  { key: 'u', value: 141, tone: 'gain', label: '141 up' },
  { key: 'f', value: 12, tone: 'neutral', label: '12 unchanged' },
  { key: 'd', value: 96, tone: 'loss', label: '96 down' }]} />
```

## Sparkline (`sparkline`)

A small trend line, no axes, for use beside a printed figure. `values` (oldest first; null, undefined and non-finite
entries are dropped, not drawn as zero), `width`, `height`, `tone` (`gain | loss | flat | chart`; default from first
versus last), `fluid` (fill the container, keep the aspect, strokes do not scale), `maxPoints` (default 120), `label`
(an `img`; decorative without), `testId`. Fewer than two real values draw a dashed rule instead of an empty box. A flat
or single-valued series is a level line. Opposite finite extremes cannot overflow to `NaN`.

Decision: punji-web had two. `kit/Sparkline` (the small component) and `charts/LineSvg`'s `Sparkline` (with
`ChartInspect` hover, `title` required, minimum four points, no fluid width). The kit one is the better base: decorative
by default, fluid, tone override, graceful with two points, and it does not need a hover-inspection stack for a 72px
line. Merged in from the other: downsampling of very long series (`maxPoints`; here by each bucket's extremes, with the
first and last kept, so a spike survives). Dropped: the hover readout (a sparkline is decorative; a reader who needs
the values has the figure beside it or `ColumnChart`'s table) and the always-`img` role. `LineSvg` itself (the full-size
line chart) is not part of this batch.

```tsx
<Sparkline values={closes} label="NABIL, up 3.9 percent in 30 days" />
```

## ColumnChart and ColumnLegend (`column-chart`)

One column per period, the parts stacked from the baseline, the net total printed over it, the label under it, on a
labelled round scale that includes zero. `series {key,label,tone}`, `columns {key,label,short,values}`, `label`
(required), `format`, `formatAxis` (pass a compact one, such as "1.2L", on narrow charts), `height` (clamped 96 to
480), `minSlots` (default 6: two years are two columns, not two slabs), `legend`, `axis`, `labels { empty, period,
total, none }`. Tones: `chart | series2 | series3 | series4 | neutral | gain | loss`.

Edge cases are decided and tested:

| Data | Behaviour |
|---|---|
| empty (no columns or no series) | prints `labels.empty` ("No data"), no axes, still a named figure |
| single value | one column, centred among `minSlots` slots at normal width |
| all zero or all missing | baseline and a printed zero over each column; no scale (there is none to show) |
| negative | stacks below the baseline on its own scale; printed total is the net; the first series is nearest the baseline |
| constant | equal columns on a round scale, filling most of the plot |
| outlier | honest linear scale: the others are short, but each non-zero part keeps at least 2px and every figure is printed (or in the table) |
| missing, null, NaN, Infinity | draws nothing; the table says `labels.none`, never 0 |

Sizing is bounded: full container width, columns at most 92px wide, `height` clamped. The chart measures its container:
a narrow one prints short labels, thins the labels counting back from the latest (so the latest always shows), and
drops printed totals before they would overlap (the table still has them).

Accessible alternative: the drawing is `aria-hidden`; a visually hidden `<table>` (caption = `label`, a head row of
period, each series and the total) follows it. Series are told apart by the legend and the table, not by colour alone.

Not migrated from punji-web: `mirror` (bought against sold either side of a zero line, with hover and arrow-key
readout), `fill` (grow to the container's height) and the hover inspector. They belong with the broker and dividend
pages that use them; the table replaces the readout. Open: a mirror variant can be added when the inspector is.

```tsx
<ColumnChart legend label="Dividends received by fiscal year" format={(v) => `Rs ${v.toLocaleString('en-IN')}`}
  series={[{ key: 'cash', label: 'Cash dividend', tone: 'chart' }, { key: 'bonus', label: 'Bonus shares', tone: 'series2' }]}
  columns={[{ key: '80', label: '2080/81', short: '80/81', values: [120000, 31000] },
            { key: '81', label: '2081/82', short: '81/82', values: [134500, 0] }]} />
```

Put a `ColumnLegend` in a Card header only when it fits on one line; otherwise use the chart's own `legend`.

## Breakdown and BreakdownRow (`breakdown`)

How a total is made: one row per part (label, optional note, amount) and the total ruled off. A `<dl>`; each label is
read with its amount. The caller computes and formats every amount (a string or a `MoneyDisplay` for an exact one) and
marks the total; the component knows no fee or tax rule. Put the sign in the amount; `tone` (`up | down`) only tints it.
`Breakdown`: `tone` (`inverse` default, for a form's summary; `tint`), `live` (polite announcements as a form is
filled), `testId`. `BreakdownRow`: `label`, `note`, `value`, `total`, `tone`, `testId`.

```tsx
<Breakdown live>
  <BreakdownRow label="Sale amount" note="100 shares at Rs 1,240" value="Rs 1,24,000.00" />
  <BreakdownRow label="Broker commission" note="0.40% of the amount" value="- Rs 497.00" tone="down" />
  <BreakdownRow label="You receive" total value={<MoneyDisplay value="123503.00" preset={nepalMoneyConfig()} />} />
</Breakdown>
```

## Pagination (`pagination`)

A list shown a page at a time: "6–10 of 12", page numbers up to `maxNumbers` pages (default 4), previous and next as
named icon buttons. `page` (one-based), `total`, `pageSize`, `onPageChange`, `label` (required), `previousLabel`,
`nextLabel`, `pageLabel(n)`, `rangeLabel(range, total)`, `maxNumbers`, `testId`. An empty list reads "0 of 0"; an
out-of-range or non-finite page is clamped.

Decision: one model, no duplicate logic. The arithmetic everywhere is `paginate` from `use-pagination` (one-based,
clamped). `Pagination` takes the hook's state directly:

```tsx
const pager = usePagination({ total: rows.length, defaultPageSize: 5 });
<Pagination {...pager} onPageChange={pager.setPage} label="Holdings pages" />
rows.slice(pager.startIndex, pager.endIndex)
```

`DataTable`'s built-in footer now computes its range and page count with the same `paginate` (its props stay
zero-based, and an out-of-range `pageIndex` is clamped instead of printed), and `tablePagination(pager)` maps the hook's
state to those props. Use `DataTable pagination` when the list is a table, `Pagination` for a card list. Migration
from punji-web: its `page` was zero-based and `onPage` the callback: pass `page + 1` and
`onPageChange={(p) => set(p - 1)}`, or switch to `usePagination`. Its `pageCount(total, size)` is
`paginate(total, 1, size).pageCount`, and `pageOf(index, size)` is `pageOfIndex(index, size) - 1`.

## MetricTile and MetricRow (`metric-tile`)

One headline figure with its label, a `MeterBar` showing its size, and a note, as cells on the card's surface split by
hairlines. `MetricTile`: `label`, `value`, `meter`, `note`, `tone` (`tint | inverse`: the one figure to act on),
`compact` (no meter anywhere in the row). `MetricRow`: `label` (names the group), `count` (2, 3 or 4 where there is
room; two by two on a phone, by container width), `dense`. The meter is decorative: the figure must also be printed.

Decision: a separate module, not an extension of `FinancialSummary`. `FinancialSummary` is a plain `{ label, value,
note }` array on `StatTile`, a semantic `<dl>`; `MetricTile` adds a meter slot that keeps tiles aligned, a lead tone,
compact and dense densities, and container-query columns. Folding those in would bloat the array API for callers who
want none of them. Use `FinancialSummary` for a metrics list, `MetricTile` for cells with meters.

```tsx
<MetricRow label="Portfolio totals">
  <MetricTile label="Invested" value="Rs 9,80,000" note="14 holdings"
    meter={<MeterBar parts={[{ value: 80, tone: 'chart' }]} max={100} />} />
  <MetricTile tone="inverse" label="Total return" value="+Rs 2,68,000" note="27.3% on cost"
    meter={<MeterBar parts={[{ value: 27, tone: 'gain' }]} max={100} />} />
</MetricRow>
```

## Market components

`StockTable`, `MarketMovers`, `MarketIndices`, `MarketStatus`, `PriceLimitIndicator`, `Watchlist` and `MarketHeatmap`, with their pure helpers (`sortQuotes`, `rankMovers`, `getMarketSession`, `circuitLimits`, `squarify`): see [MARKET.md](MARKET.md).

Portfolio: `HoldingsTable`, `PortfolioAllocation`, `PortfolioOverview`, `DividendHistory`, `TransactionHistory` and the pure `@punji/ui/portfolio` helpers (`holdingsSummary`, `allocateHoldings`, `transactionLedger`, `dividendsByFiscalYear`): see [PORTFOLIO.md](PORTFOLIO.md).

Accounting: `DebitCredit`, `LedgerTable`, `JournalEntryView`, `TrialBalance`, `StatementTable`, `PaymentStatus`, `FinancialPeriodSelector` and the pure `@punji/ui/ledger` helpers (`isBalanced`, `trialBalance`, `runningBalance`, `rollUp`, `ledgerToCsv`): see [ACCOUNTING.md](ACCOUNTING.md).

Banking and payments: `AccountNumber`, `BankAccountCard`, `TransactionList`, `TransactionStatus`, `PaymentReceipt`, `PaymentTimeline`, `BeneficiarySelector`, `BillSummary` (a biller's bill before payment) and the pure `@punji/ui/banking` helpers (`maskAccountNumber`, `isValidIban`, `formatTransactionReference`, `transactionsToCsv`): display only, masked by default; see [BANKING.md](BANKING.md).

Lending, deposits, KYC and remittance: `LoanCalculator`, `AmortisationTable`, `DepositCalculator`, `InterestRateTable`, `NepalAddressPicker` (with the lazy `@punji/ui/nepal-address-data` list), `IdNumberInput`, `DocumentUpload`, `OnboardingWizard`, `RemittanceTracker`, `InsurancePremiumCard`, `RiskMeter` (a fund riskometer) and the pure `@punji/ui/lending`, `@punji/ui/invest` (XIRR, SIP, units at a NAV, term cover) and `@punji/ui/kyc` helpers; see [LENDING.md](LENDING.md).
