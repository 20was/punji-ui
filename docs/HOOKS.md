# Reusable hooks

```tsx
import { useMediaQuery, useHydrated, useStableOrder } from '@punji/ui';

const narrow = useMediaQuery('(max-width: 760px)', false);
const hydrated = useHydrated();
const rows = useStableOrder(sortedRows, row => row.id, `${sortKey}:${sortDirection}`);
```

Each hook also has a dedicated subpath: `@punji/ui/use-media-query`,
`@punji/ui/use-hydrated`, `@punji/ui/stable-order`. These are React client
modules. CSS is not required. No additional package is required.

`useMediaQuery` uses the second argument on the server and during hydration;
provide the same value on both sides. The browser then uses the real query
result. If matchMedia is absent the fallback remains in effect. Use CSS for
purely visual layout and JavaScript for behavior that needs the query result.

`useHydrated` returns false in server output and true after hydration. A
client-only render returns true immediately. It is not a replacement for
loading/error state or a reason to hide all server-renderable content.

`useStableOrder` expects already-sorted immutable rows and a unique stable string
key. A live value update keeps the current order while supplying fresh row
objects. Change sortId when the user explicitly sorts again, even if the sort
column/direction are unchanged. Adding/removing/filtering keys adopts the input
order. The hook does not sort, mutate, fetch or persist data.

For React-free code, import `keepOrder` from
`@punji/ui/stable-order/keep-order`. It preserves the previous key array when
membership is unchanged; duplicate keys throw a generic error without logging
financial rows or IDs.

[Source research and credits](research/hooks-upstream-2026-10-29.md).

## General-purpose hooks

All hooks are also available from one component-free subpath, `@punji/ui/hooks`
(the three hooks above, `useTweenedNumber`, and everything below). Each has its own
subpath and root export. They are React client modules, SSR-safe (no browser access
while rendering), have stable callback identities and clean up timers and listeners.
`useToast` stays in `@punji/ui/overlay` because it needs the toast provider.

| Hook | Subpath | Contract |
|---|---|---|
| `useDebounce(value, ms)` | `use-debounce` | Trailing debounced copy; first render returns the value unchanged. |
| `useDebouncedCallback(fn, ms, { leading })` | `use-debounce` | Stable function with `.cancel()` and `.flush()`; calls the latest `fn`; cancels on unmount. |
| `useThrottle(value, ms)` | `use-throttle` | First change is immediate, later ones at most once per interval, trailing value delivered. |
| `useControllableState({ value, defaultValue, onChange, name })` | `use-controllable-state` | `[value, set]`; `set` takes a value or updater and is stable. `value === undefined` means uncontrolled. Switching modes logs a development-only error (no values in the message). |
| `usePrevious(value, initial?)` | `use-previous` | The value before the latest change (not render). |
| `useToggle(initial)` | `use-toggle` | `[on, toggle, set]`; `toggle(event)` flips, `toggle(true)` sets. |
| `useClipboard({ timeoutMs })` | `use-clipboard` | `{ copy, copied, error, supported, reset }`. `error` is `'unsupported' \| 'denied' \| 'failed'`. Async Clipboard API only; the text is never stored or logged. `supported` is false on the server and during hydration. |
| `useLocalStorage(key, opts)` / `useSessionStorage` | `use-storage` | `{ value, set, remove, error }` on `useSyncExternalStore`; same-tab updates and cross-tab `storage` events. See below. |
| `useClickOutside(refOrRefs, handler, { enabled })` | `use-click-outside` | `pointerdown` in the capture phase. Pass a ref for each DOM subtree, including portalled content. |
| `paginate(total, page, size)` / `usePagination({ total, page, pageSize, ... })` | `use-pagination` | One-based `page`, `pageCount >= 1`, `startIndex`/`endIndex` for `slice`, `pageIndex` for `DataTable`; `pageOfIndex(index, size)` finds an item's page and `tablePagination(state)` maps the state to DataTable's `pagination` props (the `Pagination` component and the table footer share this arithmetic). Garbage input is clamped; a shrinking `total` clamps the reported page at once (the stored request is kept). |
| `useTableSelection({ pageIds, allIds, ... })` | `use-table-selection` | Set of selected ids kept across pages; `pageState`/`allState` are `'none' \| 'some' \| 'all'` (`some` = indeterminate); `selectedRowIds` fits `DataTable`'s `selection` prop. |
| `useColumnVisibility({ columns, ... })` | `use-column-visibility` | Hidden set; ordered `visible` list; the last visible column cannot be hidden; unknown ids ignored. |

### Storage safety

Stored data is untrusted. `validate` is required and a stored value is returned only if
it parses and passes `validate`; otherwise you get `defaultValue` and
`error: 'invalid'`. Write failures (`'quota'`, `'serialize'`, `'unavailable'`) are
returned in `error`, never thrown during render, and leave the stored value unchanged.
Keep `defaultValue` and `validate` as stable references. Never store tokens, secrets or
account data in web storage: any script on the origin can read it. Combine with the
table hooks for persisted layouts, for example `useColumnVisibility` fed by
`useLocalStorage` with a validator for `string[]`.

### Not added

No fetch/async-resource hook (app-owned policy, see the extraction audit), no
`useEventListener`/`useWindowSize` (CSS and `useMediaQuery` cover the cases), and no
`execCommand` clipboard fallback. Nothing duplicated an existing hook, so none of the
requested hooks was dropped.
