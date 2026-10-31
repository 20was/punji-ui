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

