# Searchable and paginated tables

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
- **Limits**: columns are not virtualised (all columns render for drawn rows); `wide` and `hideUnder` do not apply (use pinning and horizontal scroll); there is no stacked phone layout; browsers cap element height (about 33 million px in Chromium), so at 40 px rows the practical ceiling is about 800,000 rows.

Measured numbers and the benchmark: [PERFORMANCE.md](PERFORMANCE.md).
