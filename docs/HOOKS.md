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
