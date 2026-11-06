# Tables

## Which table to use

| You have | Use | Why |
|---|---|---|
| A page of records (up to a few hundred rows) you lay out cell by cell | `DataTable` + `DataListRow` (`@punji/ui/table`) | Plain semantic `<table>`; you write the cells. |
| Typed records and per-column render callbacks; groups, subtotals or a totals row | `FinancialTable` (`@punji/ui/financial`) | The same table driven by columns, with phone stacking, states, `groupBy`, `totals` and `expectedTotals`. |
| Thousands of rows (floorsheet, blotter, statement lines) | `VirtualFinancialTable` (`@punji/ui/virtual-table`) | Draws only the rows in view; pinning, resizing, multi-sort, virtual group headers and a sticky totals row. |
| A known financial document (holdings, ledger, statement, aging, trial balance, amortisation, stock list) | The domain table (`HoldingsTable`, `LedgerTable`, ...) | Fixed columns and finance rules already wired. Or the column presets in `@punji/ui/table-presets` (`holdingsColumns`, `ledgerColumns`, ...) on a `FinancialTable`. |
| Sorting, grouping, totals or reconciliation without a UI (server, worker, export) | `@punji/ui/table-core` | Pure functions, no React. |

Every table is controlled: you filter and sort, the table draws. None of them fetches data.

## The column model: `ColumnDef<Row>` (beta)

`@punji/ui/table-core` defines one column type that every table normalises to. `FinancialColumn<T>` and `VirtualColumn<T>` keep their props; `fromFinancialColumn()` and `fromColumn()` map them (and DataTable's `Column<K>`) onto it.

```ts
interface ColumnDef<Row, Node = unknown> {
  id: string;                      // sort key, totals key, React key
  header: Node;
  accessor?: (row: Row) => CellValue;   // Money | bigint | number | string | Date
  cell?: (row: Row) => Node;
  kind?: 'text' | 'money' | 'quantity' | 'price' | 'percent' | 'date' | 'custom';
  align?: 'start' | 'end';         // default: 'end' for money, quantity, price, percent
  sortable?: boolean;
  sortKey?: (row: Row) => SortKey; // default: the accessor's value
  aggregate?: 'sum' | 'count' | 'min' | 'max' | ((values, rows) => CellValue);
  formatAggregate?: (value: CellValue, rows: readonly Row[]) => Node;
  hideUnder?: 760 | 1024 | 1256;   // 760 is the old `wide`
  pin?: 'left' | 'right';
  rowHeader?: boolean;
}
```

On a `FinancialColumn` the same ideas are spelled `kind`, `value` (the accessor), `aggregate` and `formatAggregate`, next to the existing `render`, `num`, `wide` and `hideUnder`. `num` still wins over `kind` for alignment.

Rules the helpers keep:

- **Never sort formatted text.** Money sorts by currency code, then exact bigint minor units; bigint and number compare by value (`compareValues`, `compareRowsBy`, `sortRows`). Missing values (null, undefined, NaN) sort last in both directions.
- **Exact sums.** `sum` adds Money and bigint with bigint arithmetic. Money in two currencies throws `MixedCurrencyError`; there is no implicit conversion. Numbers add as numbers, so keep money out of `number`.
- **Groups.** `groupRows(rows, by, columns)` returns `{ key, rows, subtotals }[]` in order of each key's first appearance, rows in input order. Sort first.
- **Totals that reconcile.** `footerTotals(rows, columns)` gives each aggregate column's total. `reconcile(expected, computed)` returns `{ status: 'ok' | 'mismatch', difference }` with `difference = computed − expected`, exactly. The sum of the group subtotals always equals the footer total (property-tested).

```tsx
const columns: FinancialColumn<Invoice>[] = [
  { key: 'id', label: 'Invoice', rowHeader: true, render: (i) => i.id },
  { key: 'amount', label: 'Amount', kind: 'money', value: (i) => i.amount, aggregate: 'sum',
    formatAggregate: (v) => isMoney(v) && <MoneyDisplay value={v.minor} preset={preset} />,
    render: (i) => <MoneyDisplay value={i.amount.minor} preset={preset} /> },
];

<FinancialTable
  caption="Receivables, NPR"
  columns={columns}
  rows={invoices}               // sorted by customer first
  rowKey={(i) => i.id}
  emptyTitle="No open invoices"
  groupBy={(i) => i.customer}   // a row group per customer, with subtotals
  expectedTotals={{ amount: statementTotal }} // a totals row, and a badge: "Reconciles" or "Off by …"
/>
```

Grouping, subtotals, totals and reconciliation are not in the tables' own code: without `totalsEngine={tableTotals}` (from `@punji/ui/table-totals`) a table loads them on first use, so the first draw is the plain rows; pass the engine for server output and the first paint. A table that never uses them does not ship them.

Totals are over the `rows` you pass: with pagination that is the current page. To check a whole data set, compute `footerTotals` over it and pass a control total in `expectedTotals`.

### Grouping accessibility

- **FinancialTable / DataTable**: each group is its own `<tbody>` (`DataRowGroup`), headed by a row whose `<th scope="rowgroup">` holds a native disclosure button with `aria-expanded`. `scope="rowgroup"` relates every cell in the group to the group name, which is the HTML table model for exactly this structure. The subtotal cells sit under their columns, so a screen reader reads "Amount, Cash, NPR 799.75". Collapsed rows are not drawn; the page checkbox still selects them.
- **VirtualFinancialTable**: rows are windowed into one `<tbody>`, so a group header is a row of its own: a `<th scope="row">` with the button and the subtotal cells, counted in `aria-rowcount` with its own `aria-rowindex`. With a row focused, Enter or Space opens or closes a group header, Right opens and Left closes.
- **Not a treegrid.** `role="treegrid"` and `aria-level` only make sense with the full grid keyboard model (cell focus, arrow keys between cells); these are read-only data tables, so WAI-ARIA's guidance is to keep native table semantics and use disclosure buttons. `aria-level` is not valid on rows of a plain table and is not used.
- The totals row is a `<tfoot>` row with a "Total" row header (sticky at the bottom of the virtual table's scroll box). The reconciliation badge is a word and an icon, never colour alone. All words come through `totalsLabels`.

## Searchable and paginated tables

`DataTable` keeps native table semantics and provides optional controlled search, selection and page controls. `FinancialTable` passes the same controls through while rendering typed financial rows. Neither component fetches data or guesses which business fields are safe to search.

```tsx
const matching = rows
  .filter((row) => matches(row, query))
  .toSorted(compareRows);
const pageRows = matching.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

<FinancialTable
  caption="Holdings · NPR"
  columns={columns}
  rows={pageRows}
  rowKey={(row) => row.symbol}
  emptyTitle="No holdings match your search."
  search={{
    label: 'Search holdings',
    placeholder: 'Symbol or company',
    value: query,
    onChange: setQuery,
  }}
  pagination={{
    pageIndex,
    pageSize,
    rowCount: matching.length,
    onPageChange: setPageIndex,
  }}
/>
```

Selection is also controlled. Give each `DataListRow` a stable domain ID; select-page changes only the visible rows and keeps selections from other pages or filters:

```tsx
<DataTable
  caption="Open invoices"
  columns={columns}
  selection={{
    selectedRowIds,
    onChange: setSelectedRowIds,
    rowLabel: (id) => `Select invoice ${id}`,
  }}
>
  {pageRows.map((invoice) => (
    <DataListRow key={invoice.id} rowId={invoice.id}>
      {/* cells */}
    </DataListRow>
  ))}
</DataTable>
```

## Data contract

- Search, sorting and pagination operate in that order over the complete client data set: filter first, sort the matches, then slice the requested page. Pass the filtered total as `rowCount`; never pass only the current page length.
- `pageIndex` is zero-based and `pageSize` is a positive integer. Display labels are one-based. Changing the search value sends page `0` through `onPageChange` when the current page is later than the first.
- These props control the search input and page buttons. The caller owns row filtering, sorting, network requests, and the current row set. This supports local data, server pagination and URL-backed state without making the component infer financial semantics.
- For server-side data, apply the query and sort on the server, request the requested page, and pass the filtered server total in `rowCount`. A search over only the currently loaded page can produce false “no match” results.
- Selection IDs must be stable domain identifiers, never visible row positions or page offsets. IDs stay in controlled component state and are not written to row DOM attributes; provide a user-facing `rowLabel` rather than a private key. The header checkbox selects or clears only selectable rows on the current page; individual IDs already selected elsewhere remain selected. `selectionDisabled` on `DataListRow` excludes that row from selection. Filtering a row out of view does not silently discard its selected ID.
- If the current data set has no rows, `empty` is shown inside the table and the search remains available. `loading` keeps the column headers and marks the table region busy. `FinancialTable` also keeps its established full-page loading and error states.

## Accessibility and safe rendering

The search field and row selection checkboxes have accessible names, page buttons sit in a caption-named navigation region, and the selection checkbox announces partial selection. Stacked phone tables expose a visible select-page control outside the clipped header. Selection count and range updates are announced politely. Table captions and column headers remain semantic, including when the visual header is clipped by the mobile stack layout.

Render values as React nodes; the components do not use HTML injection. Keep search accessors explicit in the caller when data includes private or sensitive fields. Validate selected IDs and permissions on the server before bulk operations. Punji UI does not log queries or row data. Client-side permissions are not a security boundary.

Import the aggregate stylesheet once:

```ts
import '@punji/ui/styles.css';
```

The individual table stylesheet is `@punji/ui/css/table.css`; it needs `tokens.css` and `base.css` as described in [Using Punji UI](../README.md#using-the-library).


## Large tables: VirtualFinancialTable

For thousands of rows (a floorsheet, a trade blotter, statement lines), `VirtualFinancialTable` from `@punji/ui/virtual-table` takes the same typed columns as `FinancialTable` but draws only the rows in view. It has no pagination: pass every filtered, sorted row.

```tsx
import { VirtualFinancialTable, compareByRules, type SortRule } from '@punji/ui/virtual-table';
import { TableExport, rowsWithIds } from '@punji/ui/table-export';
import '@punji/ui/css/table.css';
import '@punji/ui/css/virtual-table.css';

const rowKey = (t: Trade) => t.id; // stable: keys are recomputed when it changes
const [sort, setSort] = useState<SortRule[]>([{ key: 'time', dir: 'desc' }]);
const rows = useMemo(() => trades.filter(matches).toSorted(compareByRules(sort, accessors)), [trades, sort, query]);

<VirtualFinancialTable
  caption="Floorsheet · NPR"
  columns={columns}            // { key, label, render, num?, rowHeader?, sortable?, width?, minWidth?, maxWidth?, pin?: 'left' | 'right', resizable? }
  rows={rows}
  rowKey={rowKey}
  emptyTitle="No trades match"
  height={480}                 // the scroll box's maximum height
  rowHeight={40}               // fixed; `measureRows` measures drawn rows instead
  sort={sort}
  onSortChange={setSort}       // Shift-click or Shift+Enter adds a column
  columnWidths={widths}        // controlled widths, e.g. from useLocalStorage
  onColumnResize={(key, width) => setWidths((w) => ({ ...w, [key]: width }))}
  selection={{ selectedRowIds, onChange: setSelectedRowIds, rowLabel: (id) => `Select trade ${id}` }}
  toolbar={<TableExport columns={csvColumns} filename="floorsheet" visibleRows={rows} allRows={trades} selectedRows={rowsWithIds(rows, selectedRowIds, rowKey)} />}
/>
```

- **Virtualisation**: the window plus `overscan` rows (default 8) are drawn; spacer rows hold the height. `aria-rowcount` on the table and `aria-rowindex` on each row give screen readers the true size and position. The focused row stays drawn when it scrolls away, so focus is never lost. Server rendering draws the first screenful from `height` and `rowHeight`, so hydration matches.
- **Keyboard**: one row is in the tab order; Up and Down move between rows, Page Up and Page Down jump a screen, Home and End go to the first and last row; Space toggles selection. Sort heads are buttons; resize handles are focusable separators (Left/Right 10 px, Shift 40 px, Home/End to the bounds).
- **Pinning**: `pin: 'left'` columns come first and `pin: 'right'` last, both sticky while the table scrolls sideways. The selection column is always pinned left.
- **Resizing**: pointer drag on a head's right edge or the keyboard; widths are clamped to `minWidth` (default 64) and `maxWidth` (default 560). `onColumnResize` fires when a drag ends and on every key, so persisting there is cheap. Without `columnWidths` the table keeps widths itself.
- **Multi-sort**: `nextSortRules` is the transition the heads use (plain press: only this column, flipping when it already was; Shift: add ascending, then descending, then remove). The primary column carries `aria-sort`; with more than one rule each sorted head shows its priority number and reads its direction and priority, and every change is announced. `compareByRules` sorts with missing values last.
- **Live rows**: pass a new `rows` array per batch, ideally once per animation frame, replacing only the changed row objects. Rows inserted or removed above the view keep the reader's rows in place; a re-sort keeps the scroll offset.
- **Export**: `TableExport` writes CSV through `toCsv` with formula neutralisation always on (it cannot be turned off here) and a UTF-8 BOM by default, from the rows you pass for each scope. It runs in the browser only; nothing is sent anywhere. `allRows` should hold only data the user may download.
- **Groups and totals (beta)**: `groupBy` adds a header row per group (a virtual row, with its subtotals and a disclosure button); `collapsedGroups` / `onCollapsedGroupsChange` control which are closed. `totals` (or `expectedTotals`) adds a totals row that sticks to the bottom of the scroll box. Memoise `groupBy` like `rowKey`. The head checkbox selects every row, including rows in closed groups.
- **Limits**: columns are not virtualised (all columns render for drawn rows); `wide` and `hideUnder` do not apply (use pinning and horizontal scroll); there is no stacked phone layout; browsers cap element height (about 33 million px in Chromium), so at 40 px rows the practical ceiling is about 800,000 rows.

Measured numbers and the benchmark: [PERFORMANCE.md](PERFORMANCE.md).
