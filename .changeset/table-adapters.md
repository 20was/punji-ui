---
"@punji/ui": minor
---

Table adapters (experimental): three optional subpaths that keep money exact in a third-party grid. `@punji/ui/tanstack-table` has `toTanStackColumns` (table-core `ColumnDef[]` to TanStack Table v9 column defs), `moneySortFn` and `moneyCell`; `@punji/ui/ag-grid` has `moneyColDef`, `moneyValueFormatter`, `moneyComparator`, `moneyCellRenderer` and `toAgGridColumns`; `@punji/ui/mui-x-grid` has `moneyGridColDef`, `moneyGridValueFormatter`, `moneySortComparator`, `renderMoneyCell` and `toGridColDefs`. Money prints from bigint minor units and compares as bigint (two balances one paisa apart past 2^53 still sort correctly), never through `Number`. The adapters import nothing from the grid libraries; `@tanstack/react-table`, `ag-grid-community` and `@mui/x-data-grid` are optional peer dependencies, and nothing in the root export or the core bundle loads them.
