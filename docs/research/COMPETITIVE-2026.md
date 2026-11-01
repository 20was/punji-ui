# Competitive research, November 2026

What Punji UI is up against, where general-purpose design systems stop short for finance, and which differentiators
to build. Written to decide the next work, not to market the library.

**Method.** Web searches and vendor docs (November 2026) for AI tooling, regulation and recent releases; the rest
is from the libraries' public documentation and source as of late 2026. Claims marked *(verified)* were checked
against a current source listed at the end; unmarked claims are general knowledge of each library and should be
re-checked before they are quoted outside this repo. Fintech design systems (Stripe, Wise, Monzo, Revolut,
Robinhood) publish little or no code; they are compared on what is public (design blogs, public sites, open-source
fragments).

## 1. The field

| Library | What it is | Finance-relevant strengths | Gaps for finance |
| --- | --- | --- | --- |
| **MUI** (Material UI + MUI X) | The largest React kit; MUI X adds Data Grid, Date Pickers, Charts (Pro/Premium paid) | Mature Data Grid (Premium: aggregation, row grouping, Excel export), pickers, charts; official MCP server `@mui/mcp` that reads llms.txt sources and pins the major version *(verified)* | Money is `number`; no currency input, no exact decimals; no lakh/crore; no ledger/statement semantics; no trust UX |
| **Ant Design** (+ Pro, ProComponents) | Enterprise admin kit, strong in China | Dense tables, ProTable/ProForm, Statistic, InputNumber with formatter/parser; official MCP server via `@ant-design/cli` (`antd mcp`), llms.txt, llms-full.txt and a Chinese full text, per-component `.md` URLs *(verified)* | InputNumber is float-based (string mode exists but arithmetic is yours); no money type; no payee/fraud patterns |
| **Mantine** | Batteries-included hooks + components | NumberInput with thousand separators, `@mantine/dates`, `@mantine/charts` (Recharts); llms.txt plus an experimental `@mantine/mcp-server` *(verified)* | Float numbers, Western grouping options only, no finance components |
| **Chakra UI** v3 | Themeable primitives on Ark/Zag state machines | Good a11y defaults, recipes; MCP server `@chakra-ui/react-mcp` with tokens and v2-to-v3 migration review *(verified)* | Nothing finance-specific |
| **shadcn/ui** | Copy-in components (Radix/Base UI + Tailwind) and a registry spec | The distribution model everyone copies: `registry.json`, namespaced third-party registries, `npx shadcn mcp` works with any compliant registry *(verified)*; Recharts-based chart blocks | Copy-in means no upgrades; no money semantics; charts and tables are starting points |
| **Radix Primitives / Base UI** | Unstyled accessible primitives | Dialog, Popover, Select, focus management | Primitives only |
| **React Aria** (Adobe) | Hooks and components with the strongest a11y and i18n | NumberField with locale parsing (incl. Arabic and Devanagari digits), currency format options, calendars in many systems, RTL; llms.txt, `.md` per page, an MCP server and an agent skill *(verified)* | Numbers are JS `number`; money exactness is yours; no domain components |
| **IBM Carbon** | Enterprise system, React + Web Components | Data table density levels (xs to xl), Carbon Charts, strong a11y process; IBM-hosted MCP server with code audit and docs search *(verified)* | No money type, no South Asian formats, no trust UX |
| **Fluent UI 2** (Microsoft) | Office/Teams system | Dense grids (DataGrid), tokens, high-contrast | Nothing finance-specific |
| **Shopify Polaris** | Commerce admin; now unified **web components** across Admin, Checkout, POS (stable Oct 2025) *(verified)*; shopify.dev MCP covers them *(verified)* | Money fields and order summaries for commerce | Shopify-surface only; not a general finance kit |
| **GitHub Primer** | GitHub's React system | Accessibility rigour, DataTable | No finance |
| **Tremor** | Dashboard components on Recharts + Tailwind (now open-source blocks, copy-in) | Fast KPI dashboards, sparklines, bar lists | Charts not keyboard or screen-reader navigable by default; float values; no tables of record |
| **AG Grid** | The finance-desk grid (Community/Enterprise) | Pivoting, aggregation, live updates, 100k+ rows, Excel export; official `ag-mcp` server with version detection and upgrade prompts *(verified)* | A grid, not a design system; money formatting via valueFormatter on floats; heavy |
| **TanStack Table** | Headless table logic | Sorting, grouping, virtualisation with TanStack Virtual | Headless: every bank rebuilds the money cells, totals and a11y |
| **TradingView Lightweight Charts** | Canvas financial charts (~45 kB) | Candles, series, crosshair, real-time | Canvas: no DOM for screen readers, no table fallback; prices are floats |
| **Stripe** (Elements, Apps UI toolkit) | Public: Elements (payment fields), Stripe Apps UI components | Best-in-class payment fields, autofill, card brand handling, clear errors | Locked to Stripe; not a general kit |
| **Wise, Monzo, Revolut, Robinhood** | Internal systems; public design writing | Wise: amounts and fees shown before commitment, recipient verification; Monzo: confirmation-of-payee and scam-warning flows written up publicly; Robinhood: dense real-time market UI | No public component code to adopt |

## 2. Comparison by dimension

### Component coverage

General kits cover forms, overlays, navigation and generic tables. Finance-specific coverage elsewhere is limited to
Ant Design Pro (Statistic, ProTable), MUI X (Data Grid, pickers) and AG Grid (desk grids). None ships ledgers, trial
balances, statements, amortisation, order tickets, depth charts, payment receipts, QR payments or tax invoices.
Punji UI already ships those (160 documented pages, 174 routes). What nobody ships, including Punji UI before this
branch, is the **money-movement trust layer**: amount read-back, payee verification states, scam interstitials,
hold or cooling-off friction, and spoofing-safe names.

### Accessibility

React Aria, Radix/Base UI, Carbon and Primer set the bar for primitives. The common failures in finance UIs are
domain-specific and unaddressed by all of them: charts on canvas with no table equivalent (Lightweight Charts,
Tremor), figures whose meaning is carried by red and green only, live prices that flood screen readers,
session-timeout dialogs that announce every second, and amounts read as "$1,250.50" where "$" is shared by 20
currencies. Punji UI's charts render tables, tone never carries meaning alone, live figures are throttled, and
`formatSpoken` names the currency; the new `SessionTimeoutWarning` announces at marks only.

### Theming and data density

Carbon (density sizes) and Ant Design (compact algorithm) lead on density; MUI and Mantine have size props;
shadcn/Tailwind leave it to classes. Punji UI uses CSS variables and cascade layers with `sm/md/lg` control scales
and dense table variants; it lacks a single density switch (see recommendations).

### i18n and locales

React Aria is the strongest general i18n (locale-aware parsing of many digit systems, RTL, non-Gregorian
calendars). Everyone else relies on `Intl` with `number` values. Gaps no one fills:

- **Exact money.** Every library above represents amounts as JS `number` (AG Grid, MUI, Ant, Mantine, React Aria),
  so values past 2^53 minor units and decimal arithmetic are the app's problem.
- **Lakh and crore beyond what CLDR says.** CLDR prints `en-PK` and `en-LK` in thousands and `en-NP` in thousands,
  while local practice often uses lakh and crore. No library lets you choose.
- **Compact notation done exactly.** `Intl` compact on a float can round twice; no kit offers L/Cr compact at all.
- **ISO 4217 vs CLDR minor units.** CLDR prints IQD, PKR, IDR and others with fewer decimals than ISO; ledgers need
  ISO. No kit exposes the difference.
- **Amounts in words** for cheques and read-back exist in no UI kit.

### Performance

AG Grid and TanStack Virtual set the bar for big tables; MUI X Data Grid is heavy; shadcn and Radix are light per
component. Punji UI has per-subpath size budgets enforced in CI (size-limit), a 10k-row virtual table with a
published benchmark, and route-level JS budgets on the docs site.

### Developer experience

MUI, Ant and Mantine have the deepest docs; shadcn has the best copy-in story. Punji UI generates props tables from
the shipped declarations (they cannot drift), types every money value as bigint, and tests each component with axe.

### AI readiness

2025 to 2026 turned this into table stakes *(verified)*:

| Library | llms.txt | Per-page markdown | MCP server | Registry / copy-in |
| --- | --- | --- | --- | --- |
| MUI | yes (used by `@mui/mcp`) | yes | official `@mui/mcp`, version pinning | no |
| Ant Design | llms.txt, llms-full.txt, llms-full-cn.txt | `/components/<name>.md` | official via `@ant-design/cli` | no |
| Mantine | yes, updated each release | yes | experimental `@mantine/mcp-server` | no |
| Chakra | yes | yes | `@chakra-ui/react-mcp` | Pro templates |
| shadcn/ui | yes | yes | `npx shadcn mcp` over any registry | the registry spec |
| React Aria | yes | `.md` per page | yes, plus an agent skill | no |
| Carbon | n/a | n/a | IBM-hosted MCP with code audit | no |
| AG Grid | n/a | `.md` pages | `ag-mcp` with version detection | no |
| Polaris | n/a | `.md` pages | shopify.dev MCP | no |
| **Punji UI (before)** | llms.txt + llms-full.txt | no | no | no |
| **Punji UI (this branch)** | + link to manifest | no | no (no server, by design) | **`/components.json`** |

The pattern: agents generate wrong code when they guess props or the import path. A machine-readable manifest with
exact imports, typed props, defaults and runnable examples, generated from the shipped types, is what MCP servers
serve. Punji UI can publish it as a static file with no server.

## 3. What no library does well for finance

1. **Money-movement trust UX.** Confirmation of Payee (UK) and Verification of Payee (EU, mandatory for euro
   payments since 9 October 2025, non-euro EU providers by July 2027) *(verified)* define match / close match / no
   match outcomes, and APP-fraud guidance asks for specific warnings and friction. Every bank builds these screens
   from scratch; no design system ships them.
2. **Spoofing-safe names.** Look-alike payee names (Cyrillic "а" in "PayPal", bidi overrides, zero-width spaces) are
   a known attack; no UI kit applies UTS #39 checks to the names it renders.
3. **Exact money end to end.** bigint minor units from input to display to export, with ISO-correct exponents.
4. **South Asian and multi-script numerals done right.** Lakh/crore grouping by choice, 18 digit scripts on input,
   compact L/Cr, amounts in words.
5. **Accessible financial data viz.** Charts with table equivalents, throttled live prices, spoken currency names.
6. **Secrets that stay out of the DOM.** React writes a controlled input's value into the `value` attribute, which
   CSS attribute selectors can read; no kit's password field avoids it.
7. **AI code generation that gets money right.** Manifests that teach agents "money is bigint" and the subpath
   imports.

## 4. Ranked differentiators

Ranked by (value to a finance team) x (how far ahead of the field) / (cost). **[built]** marks what this branch
implements.

1. **Trust and safety kit [built].** `TransferReview` and `ConfirmAmount` (figures and words, changed fields),
   `PayeeVerification` (CoP/VoP states), `HoldToConfirm` (hold and cooling-off), `SessionTimeoutWarning`
   (WCAG 2.2.1), `ScamWarning` (scenario copy, cancel-first), `SecureField` (correct autocomplete, no value in the
   DOM), `detectSpoofing` (UTS #39-style, look-alikes of trusted names). Nobody else ships this.
2. **Global exact money [built].** `grouping` override (lakh/crore anywhere, fixes en-NP), `exponent` override with a
   lazy ISO 4217 subpath, 18 digit scripts on input with `toScriptDigits` output, compact notation rounded once from
   the exact decimal, `currencyAmountInWords` with international scales.
3. **AI-ready manifest [built].** `/components.json` generated from the shipped declarations and the page registry
   (imports, typed props, defaults, examples, keyboard and a11y notes), linked from llms.txt, validated by
   `check:seo`. No server.
4. **shadcn-compatible registry output.** Emit `registry.json` items for showcase screens so `npx shadcn add` and
   `npx shadcn mcp` work against design.punji.app, while components stay versioned npm imports.
5. **Per-page markdown** (`/components/<slug>.md`) like Ant Design and React Aria, from the same data as
   llms-full.txt.
6. **Density switch.** One `data-density` attribute driving control height, table row height and type scale, like
   Carbon's sizes.
7. **Accessible live market data.** A shared announcer that batches price changes across a page.
8. **Payment-field kit.** IBAN/account number with mod-97 check, card number with Luhn and brand, sort code and
   IFSC formats, all through `SecureField`.
9. **Non-Gregorian calendars beyond BS.** Hijri and Thai solar for the Gulf and Thailand.
10. **Localised trust copy.** Nepali, Hindi and Bengali defaults for the trust kit labels and scam scenarios.

## Sources

- MUI MCP: https://mui.com/material-ui/getting-started/mcp/ and https://raw.githubusercontent.com/mui/mui-x/HEAD/packages/mcp/README.md
- Ant Design for agents and MCP: https://ant.design/docs/react/mcp, https://ant.design/docs/react/for-agents
- Mantine LLMs: https://mantine.dev/llms/guides-llms.md
- Chakra MCP: https://www.chakra-ui.com/docs/get-started/ai/mcp-server
- React Aria AI: https://react-aria.adobe.com/ai
- shadcn MCP and registries: https://ui.shadcn.com/docs/mcp
- AG Grid MCP: https://www.ag-grid.com/react-data-grid/mcp-server/
- Carbon MCP: https://www.developersdigest.tech/mcp-servers/ibm-carbon-mcp
- Polaris web components stable: https://shopify.dev/changelog/polaris-unified-web-components-are-now-stable
- UK Confirmation of Payee: https://www.ukfinance.org.uk/policy-and-guidance/guidance/confirmation-payee
- EU Verification of Payee: https://www.ecb.europa.eu/paym/retail/instant_payments/html/instant_payments_regulation.so.html and https://corporates.db.com/in-focus/Focus-topics/instant-payments-vop
- WCAG 2.2.1 Timing Adjustable: https://github.com/alphagov/guide-to-wcag/wiki/2.2.1
- Unicode UTS #39: https://unicode.org/reports/tr39/
