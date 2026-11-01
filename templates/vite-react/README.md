# Punji UI banking starter (Vite + React)

A minimal banking screen built with [`@punji/ui`](https://design.punji.app): a balance in exact NPR, recent
transactions in a `FinancialTable`, and light/dark theme and density switches.

```sh
npm install
npm run dev
```

- `src/main.tsx` imports `@punji/ui/styles.css` once.
- `src/App.tsx` sets `data-theme` and `data-pu-density` on `<html>`; every component follows them.
- Money is `bigint` minor units (paisa, cents). Use `currency="USD" locale="en-US"` instead of the Nepal preset for other currencies.

Docs: [Vite guide](https://design.punji.app/get-started/vite/), [Theming](https://design.punji.app/get-started/theming/),
[Copy a pattern](https://design.punji.app/get-started/copy-a-pattern/) for whole screens.
