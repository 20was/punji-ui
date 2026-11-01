# Punji UI dashboard starter (Next.js App Router)

A minimal portfolio dashboard built with [`@punji/ui`](https://design.punji.app): exact NPR totals computed in a
Server Component, a price change, a holdings `FinancialTable`, and light/dark theme and density switches.

```sh
npm install
npm run dev
```

- `app/layout.tsx` imports `@punji/ui/styles.css` once and sets `data-theme` and `data-pu-density` on `<html>`.
- `app/page.tsx` is a Server Component: `MoneyDisplay`, `PriceChange` and `Card` render there with no client JavaScript.
- `app/holdings-table.tsx` and `app/preferences.tsx` are Client Components, because they take functions and handle clicks.
- Money is `bigint` minor units. `bigint` props can cross to a Client Component; JSON (fetch, route handlers) needs strings.

Docs: [Next.js guide](https://design.punji.app/get-started/nextjs/), [Theming](https://design.punji.app/get-started/theming/),
[Copy a pattern](https://design.punji.app/get-started/copy-a-pattern/) for whole screens.
