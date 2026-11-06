# eslint-plugin-punji

ESLint rules that catch the most common misuse of [`@punji/ui`](../../README.md), by people and by AI agents.

> **Status: not yet published.** The package is private and lives in this repo only. It is not part of the `@punji/ui` tarball and no release workflow publishes it. Use it from a checkout (`"eslint-plugin-punji": "file:../punji-ui/packages/eslint-plugin-punji"`) until it is released.

It needs ESLint 9 or later (flat config) and has no runtime dependencies.

## Setup

```js
// eslint.config.js
import punji from 'eslint-plugin-punji';

export default [
  punji.configs.recommended,
  {
    rules: {
      'punji/prefer-subpath-import': ['warn', { maxNames: 5 }],
      'punji/no-raw-pu-token-override': ['warn', { allow: ['**/brand/**'] }],
    },
  },
];
```

`recommended` turns on `no-number-money` and `no-unsafe-href` as errors, and `no-raw-pu-token-override` and `prefer-subpath-import` as warnings. It enables JSX parsing; for TypeScript files also add `typescript-eslint`'s parser.

Import tracking follows `@punji/ui` and `@punji/ui/<module>` imports, including aliases (`import { MoneyDisplay as MD }`) and namespaces (`import * as UI`, `<UI.MoneyDisplay>`). A component of the same name imported from elsewhere is ignored.

## Rules

### `punji/no-number-money`

Money in Punji UI is exact `bigint` minor units. A JS number silently loses precision (`0.1 + 0.2`) and the types only catch it where the prop is typed. The rule flags number literals, `Number()`, `parseFloat()`, `parseInt()`, `Math.*` and arithmetic involving them when they reach a money prop or a money function.

```tsx
<MoneyDisplay value={12.5} />            // error
<MoneyDisplay value={1250n} />           // ok
createMoneyFormatter(cfg).format(12.5)   // error (also through a const holding the formatter)
money(1250n, 'NPR')                      // ok; money(12.5, 'NPR') is an error
```

Checked props live in one table, `MONEY_PROPS` in `rules/no-number-money.js` (MoneyDisplay, DebitCredit, AmountKeypad, PaymentReceipt, BillSummary, BankAccountCard, InsurancePremiumCard, LedgerTable, OrderTicket). `Figure` and `Delta` are intentionally not checked: they accept plain numbers for ratios and percentages. Checked functions: `money`, `formatMoney`, `formatCompactMoney`, and the `format`, `formatToParts`, `formatSpoken`, `formatCompact`, `toDecimal` methods of a formatter from `createMoneyFormatter`. No autofix: the right minor-unit value depends on the currency.

### `punji/prefer-subpath-import`

Suggests `@punji/ui/<module>` over the root barrel when a file imports few names. Autofix; names from different modules are split into one import per module.

```ts
import { Button, MoneyDisplay } from '@punji/ui';
// becomes
import { Button } from '@punji/ui/button';
import { MoneyDisplay } from '@punji/ui/money-display';
```

Option `maxNames` (default `3`): imports with more names are left alone. Imports with a name that is not in the map, namespace imports and side-effect imports are skipped. The name to subpath map is `data/subpath-map.json`, generated from the `@punji/ui` exports and sources:

```sh
node packages/eslint-plugin-punji/scripts/generate-subpath-map.mjs
```

Re-run it whenever `@punji/ui` adds a module (commit the JSON).

### `punji/no-raw-pu-token-override`

Flags `--pu-*` custom properties set by hand in style objects (`{ '--pu-accent': '#f00' }`, computed keys) and `el.style.setProperty('--pu-...')`, outside a theme file. Use `createTheme` from `@punji/ui/theme`, which keeps contrast and the scale consistent. Reading a token with `var(--pu-accent)` is fine.

Option `allow`: file globs (`**`, `*`, `?`) where overrides are allowed. Default: `**/theme.*`, `**/*.theme.*`, `**/theme/**`, `**/themes/**`.

### `punji/no-unsafe-href`

Flags literal `javascript:`, `vbscript:` and `data:` hrefs (case and whitespace tricks included) on `Button`, `CardLink`, `CheckRow` and `StatusPill`.

Why this one instead of `require-link-label`: an icon-only `MenuButton` without a `label` is already a type error, so a lint rule would be redundant. A literal `javascript:` href compiles fine and `safeHref` drops it at runtime without a message, so the link just does nothing. The lint catches it where it is written.

## Development

Tests run with the repo's vitest and ESLint's `RuleTester`:

```sh
npx vitest run packages
```
