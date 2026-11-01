// The "Get started" guides: prose plus real code. Pure data (no JSX), kept apart from registry.ts so the
// guides and the component pages can be edited and merged independently. Code blocks are either a typechecked
// file in site/src/guides/<slug>/<file>.tsx or literal text for shell and config files.
import type { PageDef } from './registry.ts';

const REPO = 'https://github.com/20was/punji-ui/blob/main';
/** The starter templates: StackBlitz imports a GitHub folder at this URL; TREE is the same folder on GitHub. */
const STACKBLITZ = 'https://stackblitz.com/github/20was/punji-ui/tree/main/templates';
const TREE = 'https://github.com/20was/punji-ui/tree/main/templates';

/** A guide page: the component-template fields are empty, the content is in `guide`. */
const guide = (page: Pick<PageDef, 'slug' | 'title' | 'description' | 'summary' | 'related'> & Partial<Pick<PageDef, 'navTitle' | 'lead' | 'examples'>> & { guide: NonNullable<PageDef['guide']> }): PageDef => ({
  group: 'get-started',
  kind: 'guide',
  use: [],
  avoid: [],
  api: [],
  examples: [],
  keyboard: [],
  accessibility: [],
  responsive: [],
  ...page,
});

export const GUIDES: readonly PageDef[] = [
  guide({
    slug: 'using',
    navTitle: 'Introduction',
    title: 'Introduction and installation',
    description: 'Install @punji/ui from npm, load the stylesheet once and render an exact NPR or USD amount in React. Who Punji UI is for, and how it differs from a generic kit.',
    summary:
      'Punji UI is a finance-first React component library: exact money, stock-market tables, ledgers and a Nepal-first locale layer (NPR, lakh and crore, Devanagari digits, Bikram Sambat dates, NEPSE) that works for any currency. Install it from npm, import one stylesheet and show your first exact amount in a few lines.',
    related: ['nextjs', 'vite', 'theming', 'money-display'],
    guide: [
      {
        id: 'who',
        title: 'Who it is for',
        paragraphs: ['Teams building screens where a wrong digit costs someone money, in Nepal or anywhere else.'],
        points: [
          'Stock market and trading apps: a [NEPSE stock table](/components/stock-table/), [market movers](/components/market-movers/), [candlestick charts](/components/candlestick-chart/) and [order book depth](/components/order-book/).',
          'Portfolio and wealth trackers: [holdings with P&L](/components/holdings-table/), [allocation](/components/portfolio-allocation/) and [exact position maths](/utilities/financial-calculations/).',
          'Accounting and bookkeeping: an [accounting ledger](/components/ledger-table/) with a running balance, [journal entries](/components/journal-entry/) and a [trial balance](/components/trial-balance/).',
          'Banking and payments: a [currency input](/components/currency-input/) that never rounds, [transaction lists](/components/transaction-list/) and [payment receipts](/components/payment-receipt/).',
          'Apps for Nepal: [lakh and crore formatting](/utilities/formatters/), Devanagari digits and a [Nepali date picker](/components/date-picker/) with Bikram Sambat dates.',
        ],
      },
      {
        id: 'why',
        title: 'How it differs from a general-purpose kit',
        paragraphs: ['A general-purpose React kit gives you buttons, inputs and tables; the finance rules stay in your app. Punji UI builds them in.'],
        points: [
          'Exact money: amounts are `bigint` minor units or exact decimal strings, never floating point, and anything that divides asks for a rounding mode.',
          'Nepal first, any currency: lakh and crore grouping, Devanagari digits, Bikram Sambat dates, the Nepal fiscal year and the NEPSE session calendar are built in; other currencies and locales are configuration.',
          'Accessible by default: direction is never colour alone (sign, arrow and spoken words), widgets follow WAI-ARIA patterns, and every page of this site is checked with axe in light and dark at phone and desktop widths.',
          'Small: every module has its own import path and stylesheet, and gzip sizes are budgeted on every build (shown on each component page).',
        ],
      },
      {
        id: 'status',
        title: 'Status',
        paragraphs: [
          '`@punji/ui` 0.1.0 is on [npm](https://www.npmjs.com/package/@punji/ui), published from CI with a provenance attestation through the release workflow in [RELEASE.md](' + REPO + '/RELEASE.md). It is pre-1.0: a minor version can change APIs and styles, so pin an exact version and read the [changelog](' + REPO + '/blob/main/CHANGELOG.md) before you upgrade.',
          'Everything on this site imports the built package through its export map, exactly as a consumer would, so the examples show the published API.',
        ],
      },
      {
        id: 'install',
        title: 'Install',
        paragraphs: [
          'Install the package. React 19 and React DOM 19 are peer dependencies. The package is ESM only and ships its own TypeScript declarations; the one runtime dependency (the Bikram Sambat date converter) is loaded only by the calendar module.',
        ],
        code: [{ label: 'Install', text: 'npm install @punji/ui react@19 react-dom@19' }],
      },
      {
        id: 'templates',
        title: 'Start from a template',
        paragraphs: [
          'Two small starters install `@punji/ui` from npm and show the parts most finance apps need first: light and dark theme, density, exact money and a table. Each builds in CI against the package as it is about to be published.',
        ],
        points: [
          `A banking app on Vite and React: [open the Vite starter in StackBlitz](${STACKBLITZ}/vite-react) or read [templates/vite-react](${TREE}/vite-react).`,
          `A portfolio dashboard on the Next.js App Router: [open the Next.js starter in StackBlitz](${STACKBLITZ}/nextjs-app-router) or read [templates/nextjs-app-router](${TREE}/nextjs-app-router).`,
        ],
        code: [{ label: 'Copy a starter to your machine', text: 'npx degit 20was/punji-ui/templates/vite-react my-bank\ncd my-bank\nnpm install\nnpm run dev' }],
      },
      {
        id: 'first-screen',
        title: 'Your first screen',
        paragraphs: [
          'Import the stylesheet once at the root of your app, then use the components. Prices are `bigint` minor units (paisa, cents), so `51230n` is Rs 512.30. The data below is invented.',
        ],
        code: [{ label: 'A first screen', file: 'first-screen' }],
      },
      {
        id: 'imports',
        title: 'Imports and styles',
        paragraphs: [
          'Every module has its own subpath (`@punji/ui/button`) and its own stylesheet (`@punji/ui/css/button.css`); everything is also exported from the root `@punji/ui`. `@punji/ui/styles.css` loads tokens, base rules and every component stylesheet in one import. For the smallest page, import `tokens.css`, `css/base.css` and only the module stylesheets you use.',
          'The package declares `sideEffects: ["**/*.css"]`, so unused JavaScript is tree-shaken and CSS imports are kept.',
        ],
        code: [{ label: 'Import only what you use', file: 'subpaths' }],
      },
      {
        id: 'next',
        title: 'Where to go next',
        paragraphs: ['Set it up in your framework, then make it yours.'],
        points: [
          '[Next.js App Router](/get-started/nextjs/) and [Vite](/get-started/vite/) setup.',
          '[Theming and custom tokens](/get-started/theming/), [server rendering and hydration](/get-started/ssr/) and [Tailwind interop](/get-started/tailwind/).',
          '[Live data adapters](/get-started/live-data/) and [Security](/get-started/security/).',
          'Take a whole screen with [Copy a pattern](/get-started/copy-a-pattern/): one command writes a Showcase pattern into your app.',
          'The [Roadmap](/get-started/roadmap/) and how to [contribute](/get-started/agents/).',
        ],
      },
    ],
  }),
  guide({
    slug: 'nextjs',
    navTitle: 'Next.js',
    title: 'Next.js App Router',
    description: 'Use @punji/ui in the Next.js App Router: import the CSS in the root layout, know which components are client components, and pass bigint safely.',
    summary:
      'In the App Router, import the stylesheet once in the root layout, render the hook-free components straight from server components, and put interactive ones behind a small "use client" file of your own. No next.config change is needed.',
    related: ['using', 'ssr', 'theming', 'tailwind'],
    guide: [
      {
        id: 'starter',
        title: 'Start from the Next.js starter',
        paragraphs: [
          `The [Next.js starter in StackBlitz](${STACKBLITZ}/nextjs-app-router) is a portfolio dashboard on the App Router: the stylesheet in the root layout, a server page that computes exact totals, and one small client component that switches theme and density. Its source is in [templates/nextjs-app-router](${TREE}/nextjs-app-router), and CI builds it against the packed package.`,
        ],
        code: [{ label: 'Copy the starter to your machine', text: 'npx degit 20was/punji-ui/templates/nextjs-app-router my-dashboard\ncd my-dashboard\nnpm install\nnpm run dev' }],
      },
      {
        id: 'layout',
        title: 'Import the CSS in the root layout',
        paragraphs: [
          'Import `@punji/ui/styles.css` once in `app/layout.tsx`. The layout is a server component; Next collects the import into the page stylesheet, so there is no flash of unstyled content.',
        ],
        code: [{ label: 'app/layout.tsx', file: 'layout' }],
      },
      {
        id: 'client',
        title: 'Server and client components',
        paragraphs: [
          'The package is compiled, not bundled, so the `\'use client\'` directive stays at the top of each file that needs it. Components that use state, effects, refs or handlers (for example `Select`, `Tabs`, `Popover`, `Drawer`, `DataTable`, `Watchlist`, the form fields, `CommandPalette` and the toast provider) are client components. You can import and render them from a server component; Next sends the JavaScript for those only.',
          'Components with no hooks render on the server with no client JavaScript: `MoneyDisplay`, `PriceChange`, `Card`, `Figure`, `Delta`, `StatusPill`, `MarketStatus`, `Meter` and the other presentational ones. The rule for contributors is that a file has `\'use client\'` exactly when it uses hooks, portals or inline handlers, and `scripts/check-source.mjs` enforces it.',
          'A handler is a function, and a function cannot cross from a server component to a client component as a prop. Pass data to a client component of your own, and let that component hold the handlers, as below.',
        ],
        code: [
          { label: 'app/page.tsx (server component)', file: 'page' },
          { label: 'app/watch-panel.tsx (client component)', file: 'watch-panel' },
        ],
      },
      {
        id: 'bigint',
        title: 'bigint and the server boundary',
        paragraphs: [
          'Money is `bigint` minor units. React can send a `bigint` from a server component to a client component as a prop, but `JSON.stringify` cannot serialise one: route handlers, `fetch` responses, `localStorage` and `searchParams` need a string. Send minor units as decimal strings and call `BigInt()` on the client, as the page above does.',
        ],
      },
      {
        id: 'notes',
        title: 'Notes',
        paragraphs: ['Versions and checks.'],
        points: [
          'The peer range is `react@^19`. Use a Next.js release that ships React 19 for the App Router.',
          'Import by subpath (`@punji/ui/stock-table`) to keep client bundles small.',
          'Every pull request builds a real Next.js App Router app against the packed package (`npm run check:nextjs`): server components call the pure modules and render client components directly, the CSS imports go through Next, and the built pages hydrate with no errors or warnings. A clean Vite consumer and a server render in Node are checked too.',
          'CI also builds the [Next.js starter](' + TREE + '/nextjs-app-router) against the packed package on every change (`npm run check:templates`).',
          'Dark mode and theme switching are covered in [Theming](/get-started/theming/); avoiding a flash of the wrong theme is in [Server rendering](/get-started/ssr/).',
        ],
      },
    ],
  }),
  guide({
    slug: 'vite',
    title: 'Vite',
    description: 'Use @punji/ui in a Vite React and TypeScript app: create the project, import the stylesheet once in main.tsx and dedupe React when linking locally.',
    summary:
      'Vite needs no plugin for Punji UI. Import the stylesheet in your entry file and import components by subpath. The only setting worth knowing is resolve.dedupe, for the day you link the package locally.',
    related: ['using', 'theming', 'tailwind', 'ssr'],
    guide: [
      {
        id: 'create',
        title: 'Create the project',
        paragraphs: [
          `Start from the React and TypeScript template, then install the package. Or begin with the banking starter: [open the Vite starter in StackBlitz](${STACKBLITZ}/vite-react).`,
        ],
        code: [
          {
            label: 'Create and install',
            text: 'npm create vite@latest my-app -- --template react-ts\ncd my-app\nnpm install\nnpm install @punji/ui',
          },
        ],
      },
      {
        id: 'entry',
        title: 'Import the CSS in your entry file',
        paragraphs: ['Import `@punji/ui/styles.css` once in `src/main.tsx`, before your own CSS, then use components anywhere below it.'],
        code: [{ label: 'src/main.tsx', file: 'main' }],
      },
      {
        id: 'config',
        title: 'Configuration',
        paragraphs: [
          'The default `vite.config.ts` works. If you link the package from a local checkout (`npm link`, a `file:` dependency or a packed tarball), two copies of React can end up in the page and hooks then fail. Tell Vite to use one.',
        ],
        code: [
          {
            label: 'vite.config.ts (only for a linked package)',
            text: "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n  resolve: { dedupe: ['react', 'react-dom'] },\n});",
          },
        ],
      },
      {
        id: 'notes',
        title: 'Notes',
        paragraphs: ['What to expect.'],
        points: [
          'The package ships ES modules and `.d.ts` files; TypeScript with `moduleResolution` set to `bundler` (the Vite template) or `nodenext` resolves every subpath.',
          'The clean-consumer check (`npm run check:consumer`) installs the packed tarball into a fresh app, runs strict `tsc`, a server render and a Vite production build before every release.',
          'Server rendering with Vite: see [Server rendering and hydration](/get-started/ssr/).',
        ],
      },
    ],
  }),
  guide({
    slug: 'theming',
    navTitle: 'Theming',
    title: 'Theming and custom tokens',
    description: 'Every token is a --pu-* CSS variable in cascade layers. Switch theme, contrast and density, apply a bank brand with createTheme, and support RTL.',
    summary:
      'Components read --pu-* CSS variables, never literals, and all of them are in cascade layers. Four colour themes (light, dark and a high-contrast pair), three densities and right-to-left layout are attributes on any element; a brand is a typed `createTheme` call whose contrast is checked when it is generated. Try every mode below.',
    related: ['accessibility-modes', 'colour-tokens', 'spacing', 'tailwind'],
    examples: [{ id: 'switcher', title: 'Theme, contrast, density and direction', note: 'One panel, four attributes. Everything inside follows them.' }],
    guide: [
      {
        id: 'tokens',
        title: 'Tokens',
        paragraphs: [
          'The tokens live in `@punji/ui/tokens.css`, inside the `punji.tokens` layer: colours (`--pu-color-*`), control heights, radii, spacing, type, motion and shadows. A token that refers to another keeps the reference, so overriding `--pu-color-accent` also moves what is built on it. The full table is [docs/tokens.md](' + REPO + '/docs/tokens.md); the [Colour tokens](/foundations/colour-tokens/) page shows them live.',
        ],
      },
      {
        id: 'layers',
        title: 'Layers: why your CSS wins',
        paragraphs: [
          'The stylesheet declares `@layer punji.tokens, punji.components;`. Tokens are in the first layer and every component rule is in the second. CSS outside any layer always beats layered CSS, whatever the specificity, so a plain rule of yours overrides a Punji rule with no `!important` and no selector arms race.',
          'Layers you declare yourself are ordered by where they are first declared. Declare them before you import the Punji stylesheet if you need a particular order (see [Tailwind interop](/get-started/tailwind/)).',
        ],
      },
      {
        id: 'dark',
        title: 'Light, dark and the system setting',
        paragraphs: [
          'With no attribute, the theme follows `prefers-color-scheme`. `data-theme="light"` or `data-theme="dark"` on any element forces that theme for the element and everything inside it, so a page can be dark while one panel is light. For a user setting, set the attribute on `<html>` and remove it for "system".',
        ],
        code: [{ label: 'A light, dark and system switch', file: 'theme-switch' }],
      },
      {
        id: 'contrast',
        title: 'High contrast',
        paragraphs: [
          'Import `@punji/ui/styles.css` (or add `@punji/ui/css/contrast.css` to the granular files) and set `data-theme="light-hc"` or `data-theme="dark-hc"`. Both meet WCAG 2.2 AAA: 7 to 1 for every text token on every surface, and 4.5 to 1 for control borders and chart colours. With no `data-theme`, the page switches to them by itself when the system asks for more contrast (`prefers-contrast: more`).',
          'Windows High Contrast (`forced-colors: active`) replaces the palette with system colours. The components redraw what would vanish: selected tabs, chips and options use `Highlight`, focus is an outline, checkboxes and switches are redrawn, loss bars are hatched and gain bars solid, up candles are hollow and down candles filled, and extra chart series are dashed. Gain and loss always carry a sign and an arrow, so nothing depends on colour. The ratios are gated by `scripts/check-contrast.mjs` in `npm run lint`; the details are on [Accessibility modes](/foundations/accessibility-modes/).',
        ],
      },
      {
        id: 'density',
        title: 'Density',
        paragraphs: [
          '`data-pu-density="compact"`, `"comfortable"` (the default) or `"spacious"` on any element resizes control and field heights (`--pu-control-*`), table cell padding (`--pu-cell-x`, `--pu-cell-y`) and row heights (`--pu-row-min`, `--pu-row-lg`) below it. Use compact for trading screens and dense blotters, comfortable for mobile banking, spacious for touch kiosks and low-vision users.',
          'Density changes what you see, not what you can hit. Compact controls stay at 28 px or more (WCAG 2.5.8 asks for 24), buttons grow their hit area to 44 px on touch screens, and on a coarse pointer compact fields keep the comfortable heights.',
        ],
        code: [{ label: 'Pick theme, contrast and density together', file: 'modes' }],
      },
      {
        id: 'brand',
        title: 'Brand theming with createTheme',
        paragraphs: [
          '`createTheme` from `@punji/ui/theme` turns a brand into CSS for the `punji.tokens` layer: accent, accent fill and its hover, the text on the fill, link and chart colours for light and dark, plus control and card radii and fonts. Missing values are derived (the text on the fill is black or white, whichever contrasts more). Every colour is checked against the library surfaces when the CSS is generated, and misses come back as `issues` (or a thrown error with `strict: true`). Values must be hex colours, lengths, font lists and a plain selector, so untrusted input cannot break out of a declaration.',
          'Gain, loss, debit and credit are not brand colours. They come from the library defaults or from a vetted `finance` palette: `green-up`, `red-up` for markets that show a rise in red, or `blue-orange`, which stays distinct for red-green colour blindness. The high-contrast themes ignore the brand, so they keep their ratios. Generate the CSS at build time and load it after the package stylesheet.',
        ],
        code: [{ label: 'theme.ts: a bank brand, generated at build time', file: 'brand' }],
      },
      {
        id: 'rtl',
        title: 'Right to left',
        paragraphs: [
          'Set `dir="rtl"` on `<html>` or a section. Component CSS uses logical properties (`padding-inline-start`, `inset-inline-end`, `text-align: end`), so layout, borders, popovers, pinned table columns and progress fills mirror. Chevrons and arrows that point along the line flip; the switch thumb, sliders, meters and column resizing follow the direction. Amounts, prices and changes stay an isolated left-to-right run, so the sign and currency keep their place. Charts keep time running left to right.',
        ],
      },
      {
        id: 'override',
        title: 'Override tokens',
        paragraphs: [
          'To change a token everywhere, set it on `:root` in your own CSS. Because your rule is unlayered it wins; set it for both themes if the value is colour, since light and dark have their own values.',
        ],
        code: [
          {
            label: 'app.css: a house radius and a calmer link colour',
            text: ':root {\n  --pu-radius-control: 8px;\n}\n\n:root,\n[data-theme=\'light\'] {\n  --pu-color-link: #1f4f8f;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme=\'light\']) {\n    --pu-color-link: #9cc2ff;\n  }\n}\n\n[data-theme=\'dark\'] {\n  --pu-color-link: #9cc2ff;\n}',
          },
        ],
      },
      {
        id: 'accent',
        title: 'Override the accent for one section',
        paragraphs: [
          'The library ships one theme. A host application that has its own brand or per-area accent (for example a public site in green and an account area in lime) does not need a second theme: it scopes the accent tokens to the area. That is the documented extension point and the project\'s architecture decision.',
          'Put a data attribute on the section, override `--pu-color-accent` with its related tokens, and give both themes a value. Check the contrast of the values you choose: link and accent text need 4.5 to 1 against the surface, and the text on the accent fill needs the same.',
        ],
        code: [
          { label: 'app.css: scope the accent to data-section="research"', text: "[data-section='research'] {\n  --pu-color-accent: #0b5cad;\n  --pu-color-link: #0b5cad;\n  --pu-color-accent-fill: #8bbcff;\n  --pu-color-accent-fill-hover: #a3cbff;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme='light']) [data-section='research'] {\n    --pu-color-accent: #8bbcff;\n    --pu-color-link: #8bbcff;\n  }\n}\n\n[data-theme='dark'] [data-section='research'] {\n  --pu-color-accent: #8bbcff;\n  --pu-color-link: #8bbcff;\n}" },
          { label: 'The section', file: 'research-section' },
        ],
      },
      {
        id: 'rules',
        title: 'Rules',
        paragraphs: ['What keeps a theme safe.'],
        points: [
          'Override tokens, not component classes. Class names are internal and can change; tokens are the contract.',
          'Do not copy hex values into your own CSS: read `var(--pu-color-text)` so your screens follow the theme.',
          'Gain and loss colours are never the only signal in components; keep that when you build your own.',
          'Text tokens are checked for contrast against their surfaces in all four themes by `scripts/check-contrast.mjs`. Hand-written overrides are not; `createTheme` checks the colours it writes.',
        ],
      },
    ],
  }),
  guide({
    slug: 'ssr',
    navTitle: 'SSR',
    title: 'Server rendering and hydration',
    description: 'Render Punji UI on the server and hydrate without warnings: hook-free components, useHydrated, useMediaQuery with a server value, and a pre-paint theme script.',
    summary:
      'Every component renders in a Node server render with no DOM. The work is keeping the first client pass identical to the server HTML: use useHydrated and the server value of useMediaQuery for anything that depends on the browser, and set the theme before first paint.',
    related: ['nextjs', 'vite', 'theming', 'live-data'],
    guide: [
      {
        id: 'server',
        title: 'Rendering on the server',
        paragraphs: [
          'The release check renders the packed package with `react-dom/server` in plain Node, so no component needs `window` to produce HTML. Pure modules (money, calculations, formatting, Nepal dates, export) have no React and no browser globals at all.',
        ],
        code: [{ label: 'renderToString in Node', file: 'render-to-string' }],
      },
      {
        id: 'hydration',
        title: 'Hydration without warnings',
        paragraphs: [
          'Hydration fails softly when the first client render differs from the server HTML. Three things differ by nature: the current time, the viewport and browser storage. Render a stable placeholder first, then the real value.',
        ],
        points: [
          '`useHydrated()` is false on the server and during the hydration pass, true afterwards. Use it to swap a placeholder for a value that only the browser knows.',
          '`useMediaQuery(query, serverMatch)` returns `serverMatch` on the server and during hydration, then follows the real query. Pass the same `serverMatch` on both sides, and prefer CSS media queries for purely visual layout.',
          '`useLocalStorage` and `useSessionStorage` start from the default value, so a stored preference appears after hydration, not during it.',
        ],
        code: [{ label: 'A hydration-safe clock', file: 'hydration-safe' }],
      },
      {
        id: 'theme',
        title: 'No flash of the wrong theme',
        paragraphs: [
          'A saved theme choice lives in the browser, so the server HTML cannot contain it. Set `data-theme` from a tiny inline script in `<head>`, which runs before first paint. This site does exactly that. Under a strict Content Security Policy, give the script a nonce or hash.',
        ],
        code: [
          {
            label: 'In <head>, before the body',
            text: "<script>\n  try {\n    var t = JSON.parse(localStorage.getItem('app-theme'));\n    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);\n  } catch (e) {}\n</script>",
          },
        ],
      },
      {
        id: 'notes',
        title: 'Notes',
        paragraphs: ['Smaller points.'],
        points: [
          'Some components set `style` attributes for computed sizes (bars, positions, heatmap cells). A strict `style-src` without `unsafe-inline` blocks style attributes that arrive in server HTML. The package has not been tested against a strict CSP, so check yours.',
          'Money formats through `Intl`. Server and browser must use the same locale and time zone, or digits and dates differ: pass `locale` explicitly, and use an explicit IANA zone for instants (the market components use `Asia/Kathmandu`).',
          'Framework specifics are in [Next.js App Router](/get-started/nextjs/) and [Vite](/get-started/vite/). Live data is the other thing that differs per client: see [Live data adapters](/get-started/live-data/).',
        ],
      },
    ],
  }),
  guide({
    slug: 'tailwind',
    navTitle: 'Tailwind',
    title: 'Tailwind interop',
    description: 'Use Tailwind CSS v4 beside @punji/ui: declare the cascade layer order once so utilities win over Punji components and Tailwind preflight does not.',
    summary:
      'Both libraries use CSS cascade layers, so they combine cleanly if you declare the layer order once: Tailwind\'s base first, then Punji, then Tailwind\'s components and utilities. Utilities then win for layout, and Punji\'s components are not undone by the reset.',
    related: ['theming', 'vite', 'nextjs', 'card'],
    guide: [
      {
        id: 'order',
        title: 'Declare the layer order',
        paragraphs: [
          'The order of layers is fixed by where each name is first declared, and a later layer beats an earlier one. Tailwind v4 has `theme`, `base`, `components` and `utilities`. Punji has `punji.tokens` and `punji.components`. You want the reset in `base` to come before Punji (so it cannot flatten Punji\'s button and field styles) and utilities to come after (so `w-full` beats a component rule).',
          'A bare `@layer` statement may precede `@import`, so put the order first in your main CSS file.',
        ],
        code: [
          {
            label: 'app.css (Tailwind CSS v4)',
            text: "@layer theme, base, punji.tokens, punji.components, components, utilities;\n\n@import 'tailwindcss';\n@import '@punji/ui/styles.css';",
          },
        ],
      },
      {
        id: 'use',
        title: 'Use Tailwind for layout, Punji for components',
        paragraphs: [
          'Place and space Punji components with utilities through their `className` prop (Card, Button and the other components accept it for layout). Do not use utilities to restyle a component\'s colours or borders: change a token instead, as in [Theming](/get-started/theming/), so every instance and both themes stay consistent.',
        ],
        code: [{ label: 'Utilities for layout, components for content', file: 'dashboard' }],
      },
      {
        id: 'tokens',
        title: 'Share tokens with Tailwind',
        paragraphs: [
          'Tailwind v4 keeps its design tokens as CSS variables too, so you can point a Tailwind colour at a Punji token and have it follow light and dark: a `@theme` entry such as `--color-text: var(--pu-color-text)` makes `text-text` read the Punji variable. Use `@theme inline` if the variable is defined later in the cascade than the theme block. This repository does not build a Tailwind sample, so test the exact syntax against your Tailwind version.',
        ],
      },
      {
        id: 'notes',
        title: 'Notes',
        paragraphs: ['Checks.'],
        points: [
          'The layer order above is plain CSS cascade behaviour, not a Tailwind feature, so it also applies to any other layered framework.',
          'If a utility does not win, check the order of the `@layer` statement: the first declaration of a layer name decides.',
          'Tailwind v3 does not use cascade layers for its output. Put Punji\'s stylesheet before the `@tailwind` directives and the v3 utilities, which are unlayered, will win.',
        ],
      },
    ],
  }),
  guide({
    slug: 'live-data',
    navTitle: 'Live data',
    title: 'Live data adapters',
    description: 'Feed live prices into Punji UI through an adapter and a hook, never from a fetch inside a component. Validate messages, keep bigint, tween with LiveFigure.',
    summary:
      'Components in this library take data and never fetch it. Put the transport (WebSocket, server-sent events, polling) behind a small adapter interface, expose it to React with useSyncExternalStore, and pass the result as props. LiveFigure animates the change.',
    related: ['live-figure', 'stock-table', 'hooks', 'ssr'],
    guide: [
      {
        id: 'rule',
        title: 'The rule: components never fetch',
        paragraphs: [
          'No component in `@punji/ui` calls `fetch`, opens a socket or owns a timer for data. A table prints the quotes it is given; a figure prints the number it is given. That keeps components testable with plain props, renderable on the server, and independent of any vendor or API shape. Where the data comes from is your application\'s decision, and it belongs behind an adapter.',
        ],
      },
      {
        id: 'adapter',
        title: 'The adapter and the hook',
        paragraphs: [
          'The adapter is an interface: `subscribe(symbol, onTick)` returns an unsubscribe function. A WebSocket implementation lives behind it, with reconnection and authentication, and a test passes a fake. `useLastTick` turns it into React state with `useSyncExternalStore`, which is concurrent-safe and gives the server render and hydration the same `null`.',
          'Treat every message as untrusted input: parse it, check each field, and drop what does not match. Minor units travel as strings because JSON has no bigint; keep arithmetic that matters in `bigint`.',
        ],
        code: [{ label: 'The adapter, the validator and the hook', file: 'quote-feed' }],
      },
      {
        id: 'component',
        title: 'The component',
        paragraphs: [
          'The component takes a symbol and renders through `LiveFigure` ([page](/components/live-figure/)): it counts to each new value over a short ease-out and tints once in the direction of the change. Under reduced motion neither runs and the new value simply replaces the old. The `id` makes a different symbol snap instead of tweening.',
          '`@punji/ui/live` also exports the tween on its own (`useTweenedNumber`, `tweenAt`, `easeOut`) if you want to animate your own figure.',
        ],
        code: [{ label: 'A live price', file: 'live-price' }],
      },
      {
        id: 'notes',
        title: 'Notes',
        paragraphs: ['What to decide in your application.'],
        points: [
          'Throttle bursts before they reach React (the hooks include `useThrottle`); a feed that ticks many times a second does not need that many renders.',
          'Show staleness: pass an as-of time and a [MarketStatus](/components/market-status/) so a frozen feed is visible, never an old price presented as current.',
          'Tables can flash their last-traded price on change with the `live` prop of `StockTable`; give them a new array of quotes when a tick arrives.',
        ],
      },
    ],
  }),
  guide({
    slug: 'security',
    title: 'Security',
    description: 'What the package does to stay safe (no HTML from strings, one dependency, signed releases) and what stays yours: formula injection, masking, server validation.',
    summary:
      'Components render text as text, the package has one reviewed runtime dependency and releases carry provenance. Client-side checks are conveniences: validate and authorise on the server, neutralise exports, and mask sensitive values before they reach a component.',
    related: ['csv-export', 'ledger-helpers', 'currency-input', 'using'],
    guide: [
      {
        id: 'package',
        title: 'What the package does',
        paragraphs: ['From [SECURITY.md](' + REPO + '/SECURITY.md).'],
        points: [
          'No HTML from data: no `dangerouslySetInnerHTML`, no `eval`, no inline event-handler strings. Components render text as text. `scripts/check-source.mjs` fails the build if one appears.',
          'One reviewed runtime dependency. React is a peer; the only bundled dependency is `@remotemerge/nepali-date-converter` (MIT, pinned exactly, no transitive dependencies), loaded only by the Bikram Sambat calendar.',
          'Releases you can verify: npm Trusted Publishing (OIDC, no stored token) with a provenance attestation and a CycloneDX SBOM per GitHub release. Check with `npm audit signatures` after you install.',
          'Hardened CI: pinned actions, least-privilege permissions, installs with `npm ci --ignore-scripts`, a registry-only lockfile, CodeQL, zizmor and dependency review.',
        ],
      },
      {
        id: 'formula',
        title: 'Formula injection in exports',
        paragraphs: [
          'A spreadsheet treats a cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return as a formula, so exported user text such as `=HYPERLINK(...)` can run in the reader\'s Excel. `toCsv` therefore prefixes every text cell and header that starts with one of those characters with an apostrophe by default, following OWASP\'s guidance. A cell of JavaScript type `number` is exempt, because a finite number cannot contain a formula. `neutralizeFormulas: false` is for trusted, machine-generated data only. Details: [docs/EXPORT.md](' + REPO + '/docs/EXPORT.md) and the [CSV export](/utilities/csv-export/) page.',
          'Neutralising in the browser reduces risk. It does not replace the server: neutralise on the server for any CSV the server generates or emails.',
        ],
        code: [{ label: 'Export with a masked column', file: 'safe-export' }],
      },
      {
        id: 'masking',
        title: 'Masking and what you pass in',
        paragraphs: [
          'A component prints exactly what it is given, and an export contains whatever you pass. Mask or omit sensitive values (account and card numbers, tax identifiers) before they reach a component or `toCsv`, and decide per role which columns a user may see or export. Hiding a column in the interface does not remove it from the data in the page.',
        ],
      },
      {
        id: 'server',
        title: 'Client-side validation is not server validation',
        paragraphs: [
          '`CurrencyInput` limits what can be typed and parses to exact minor units, and the ledger helpers check that a journal balances. Both run in a browser that anyone can edit or bypass. Validate and authorise every amount, journal, total, period lock and permission again on the server, and show its error. A balanced trial balance on screen does not prove the books are right.',
        ],
        code: [{ label: 'A form that trusts the server, not itself', file: 'validate-on-server' }],
      },
      {
        id: 'csp',
        title: 'Content Security Policy',
        paragraphs: [
          'The package injects no scripts and loads no remote fonts or images itself. Some components write `style` attributes for computed sizes; if you use a strict `style-src`, test your pages. The package has not been checked against a strict CSP, so this is a check for you to run, not a guarantee.',
        ],
      },
      {
        id: 'report',
        title: 'Reporting a vulnerability',
        paragraphs: [
          'Do not open a public issue. Report privately through GitHub (Security, then Report a vulnerability, on the [repository](https://github.com/20was/punji-ui/security/advisories/new)) or email contact@punji.app with "SECURITY" in the subject. You get an acknowledgement within 3 working days and a first assessment within 10. Until 1.0 only the latest `0.x` receives fixes.',
        ],
      },
    ],
  }),
  guide({
    slug: 'roadmap',
    title: 'Roadmap',
    description: 'What ships today, what is in progress and what comes in waves 2 to 4: guides, compositions, portfolio components, scale, accessibility and example apps.',
    summary:
      'The package is built in waves. The foundations (money, calculations, market, accounting, tests, a docs site) are merged; the current waves are discoverability and gaps, then compositions and guides. This page summarises ROADMAP.md in the repository, which is the source of truth.',
    related: ['using', 'security', 'agents'],
    guide: [
      {
        id: 'done',
        title: 'Shipped on main',
        paragraphs: ['Merged on main. Version 0.1.0 is published on npm; later merges ship in the next release.'],
        points: [
          'Financial utilities: exact calculations, generic money formatting and parsing, ledger maths, CSV export with formula neutralisation, hooks.',
          'Components: money primitives, stock market (tables, movers, indices, status, price limits, watchlist, heatmap, order books), accounting (ledger, journal, trial balance, statements, payment status, period selector), forms, layout and feedback modules.',
          'Quality: Playwright visual regression in Docker, interaction and axe specs, unit and property tests, size budgets, package checks, a clean-consumer install check.',
          'Docs: this site, with props generated from the built declarations.',
        ],
      },
      {
        id: 'wave1',
        title: 'Wave 1: discoverability and the biggest gaps (in progress)',
        paragraphs: ['What is being built now.'],
        points: [
          'SEO-ready docs site: clean URLs, prerendered HTML, unique titles and descriptions, sitemap and llms.txt.',
          'README and package metadata with a quick start that type-checks.',
          'Financial charts: candlestick (with volume and moving averages), performance versus benchmarks, depth chart.',
          'Banking and payments: masked account numbers, account cards, transaction list, receipt, timeline, beneficiary selector.',
        ],
      },
      {
        id: 'wave2',
        title: 'Wave 2: compositions, showcase and guides (in progress)',
        paragraphs: ['Guides and the remaining generic component pages are written on this site; the rest is planned.'],
        points: [
          'Done on this site: the guides under Get started and a page for every generic form, layout and feedback component.',
          'Showcase section: real-world patterns (an app band, a portfolio screen, a live market board, an invoice, a statement) built only from package exports, labelled as patterns to copy, not API. It replaces the portal\'s app-specific component pages at cutover.',
          'Portfolio: holdings table, allocation donut with legend, dividend and transaction history, portfolio overview.',
          'Forms: NumberInput, PercentageInput, OTP input, date-range presets, statement upload.',
        ],
      },
      {
        id: 'later',
        title: 'Waves 3 and 4, and after the release',
        paragraphs: ['Later work.'],
        points: [
          'Wave 3, scale and trust: a virtualised data table for 10k+ rows with column pinning, resizing and multi-sort; a high-contrast theme, density setting and RTL verification; performance numbers for live tables; a manual VoiceOver and NVDA pass; an automated Next.js consumer build.',
          'Wave 4, adoption: full example apps (trading dashboard, portfolio tracker, invoicing). Done: StackBlitz starters (see [Introduction](/get-started/using/)), [copy-in patterns](/get-started/copy-a-pattern/), Markdown for every page, good first issues and a component contribution template.',
          'Since the 0.1.0 release: these docs replaced the old portal at design.punji.app with its URLs preserved, and punji-web adopts the published package next.',
        ],
      },
      {
        id: 'out',
        title: 'Out of scope',
        paragraphs: ['Brand artwork, application routes, authentication, permissions, backend clients, tax rules and trading execution. Those belong in your application.'],
        points: ['Read the full text and the calendar notes in [ROADMAP.md](' + REPO + '/ROADMAP.md).'],
      },
    ],
  }),
  guide({
    slug: 'agents',
    navTitle: 'Contributing',
    title: 'Contributing, for people and agents',
    description: 'Which Punji UI component to reach for, the checks to run before calling work done, and the bar a new component has to meet. For humans and coding agents.',
    summary:
      'People and coding agents build with the same components and the same checks. Reach for the component that already does the job, run the gates before you say done, and meet the bar below before adding a new component.',
    related: ['using', 'roadmap', 'security', 'button'],
    guide: [
      {
        id: 'pick',
        title: 'Which component',
        paragraphs: ['Each line names what you need, the component to use, and what not to build instead.'],
        points: [
          'The view\'s main action: `Button` primary, one per view. Not a second primary or a styled link.',
          'Any other action: `Button` secondary, or ghost in a row. Not a page-made button class.',
          'Delete, remove, leave: an inline confirm or a sheet, then a danger `Button`. Not a danger button that acts at once.',
          'Text, a number, a date or a symbol: `Field`, `NumberField`, `DateField`, `SymbolField`. Not a raw input with page CSS. Money: `CurrencyInput`.',
          'Several lines of text: `TextAreaField`. One of many (five or more): `Select`. Two to five short options: `SegmentedControl`. A section\'s views: `Tabs`.',
          'A setting that applies at once: `Switch`. Choices that wait for Save: `Checkbox`.',
          'A label nobody presses: `StatusPill`. A section of a page: `Card`, never inside a card.',
          'A form beside the page: `Drawer`. Say what just happened: `useToast`. Explain a term: `InfoTip`.',
          'Loading: a skeleton in the content\'s shape. Nothing yet, or a failure: an empty state with one action.',
          'Money, prices and changes: `MoneyDisplay`, `PriceChange`, `Figure` and `Delta`; never `toFixed` on a price, and never colour alone for gain or loss.',
        ],
      },
      {
        id: 'done',
        title: 'Before you say "done"',
        paragraphs: ['Clone, `npm ci --ignore-scripts`, then run the gates.'],
        points: [
          '`npm run verify` runs lint, typecheck, tests, build, size budgets, package checks, example builds, the docs-site typecheck and build, and the SEO check. `npm run verify:deep` repeats the property tests with 2000 inputs each.',
          'For a visual change, run the Docker visual gate (`npm run test:visual:docker`) and commit the baselines it writes.',
          'Look at what you changed: screenshot the page and its states at 390 and 1440 wide in light and dark, and open the screenshots. Check one focus ring, readable hover, matching heights in a row, no truncated figure, no card in a card, no sideways scroll at 390.',
          'Add a changeset for anything that changes what ships (`npm run changeset`), and say why if it is a minor bump.',
        ],
      },
      {
        id: 'bar',
        title: 'The bar for a new component',
        paragraphs: ['A component joins the kit only when all of this is true. The pull request template repeats it as a checklist.'],
        points: [
          'It is general purpose: useful in any product. Product-specific pieces stay in the product.',
          'It follows a WAI-ARIA pattern (or wraps a native element) and implements its keyboard model in full.',
          'Its dependencies are justified: licence, maintenance, security, types and bundle cost reviewed.',
          'It has a size budget in `.size-limit.json`, uses tokens only, works in light and dark, draws one focus ring and keeps 44 px touch targets.',
          'It is tested (pointer and keyboard, roles and names, axe) and has a visual fixture with Docker baselines.',
          'It has a page on this site: examples, props with doc comments, when to use it, keyboard and accessibility notes.',
          'It is exported from the root and from its own subpath, with its own CSS file.',
        ],
        code: [{ label: 'Set up', text: 'git clone https://github.com/20was/punji-ui.git\ncd punji-ui\nnpm ci --ignore-scripts\nnpm run verify' }],
      },
      {
        id: 'links',
        title: 'Where it is written down',
        paragraphs: ['Read these before a larger change.'],
        points: [
          '[CONTRIBUTING.md](' + REPO + '/CONTRIBUTING.md): setup, checks, changesets and the bar above.',
          '[ARCHITECTURE.md](' + REPO + '/ARCHITECTURE.md) and [QUALITY.md](' + REPO + '/QUALITY.md): structure, decisions and the definition of done.',
          '[RELEASE.md](' + REPO + '/RELEASE.md): the gated release flow. Never publish from a laptop.',
          '[SECURITY.md](' + REPO + '/SECURITY.md) and the [Security](/get-started/security/) guide.',
          '[docs/CONTRIBUTING-COMPONENT.md](' + REPO + '/docs/CONTRIBUTING-COMPONENT.md): add a component step by step. `npm run new:component <name>` scaffolds the source, test, CSS, docs page, example, size budget and visual fixture.',
          'New here? Pick an issue labelled [good first issue](https://github.com/20was/punji-ui/labels/good%20first%20issue), or ask for a component with the component request form.',
        ],
      },
    ],
  }),
  guide({
    slug: 'copy-a-pattern',
    navTitle: 'Copy a pattern',
    title: 'Copy a pattern into your app',
    lead: 'One shadcn command copies a whole finance screen into your app: the TSX, its layout CSS and sample data.',
    description: 'Copy a Punji UI Showcase screen into your React app with one shadcn CLI command: the TSX, its layout CSS and sample data, with @punji/ui as the dependency.',
    summary:
      'Every Showcase pattern and every App is also a shadcn registry item at `/r/<name>.json`. One command writes the screen (or the whole app), its layout CSS and only the sample data it uses into your app and installs `@punji/ui`. The copied files are yours; the components inside them stay package code that you update with npm.',
    related: ['using', 'nextjs', 'bank-statement', 'portfolio-tracker'],
    guide: [
      {
        id: 'command',
        title: 'Copy one pattern',
        paragraphs: [
          'Run the shadcn CLI with the item URL. The name is the pattern\'s slug, the last part of its address: [Bank statement](/showcase/bank-statement/) is `bank-statement`. Each pattern page shows its own command under the live screen.',
          'If the project has no `components.json`, the CLI may ask to create one first. Punji items do not use its Tailwind or alias settings: every file names its own target folder.',
        ],
        code: [{ label: 'Copy the bank statement screen', text: 'npx shadcn@latest add https://design.punji.app/r/bank-statement.json' }],
      },
      {
        id: 'files',
        title: 'What you get',
        paragraphs: ['Everything lands in one folder, `components/punji/<name>/`, so two patterns never overwrite each other.'],
        points: [
          '`<name>.tsx`: the screen, a default export named after the pattern (`BankStatement`), with `\'use client\'` at the top for the Next.js App Router.',
          '`<name>.css`: the layout CSS. Grid and spacing only, sized with container queries, colours and type from the `--pu-*` tokens.',
          '`sample.ts` and `data/`: only the synthetic sample data the screen imports. Replace it with your own data source.',
          '`@punji/ui` in your dependencies. Import `@punji/ui/styles.css` once at your app root if you have not already.',
        ],
        code: [
          {
            label: 'app/statement/page.tsx (or any route or screen)',
            text: "import BankStatement from '@/components/punji/bank-statement/bank-statement';\n\nexport default function Page() {\n  return <BankStatement />;\n}",
          },
        ],
      },
      {
        id: 'without-cli',
        title: 'Without the shadcn CLI',
        paragraphs: [
          'The items are static JSON in the [shadcn registry item schema](https://ui.shadcn.com/docs/registry/registry-item-json): each file has a `target` path and its `content`. Any tool, or you, can read them. The index of every item is [/r/registry.json](https://design.punji.app/r/registry.json).',
          'You can also copy the TSX and CSS from a pattern page, or read the page as Markdown (the "View as Markdown" link under every page title) and paste it into a coding assistant.',
        ],
      },
      {
        id: 'agents',
        title: 'For coding agents',
        paragraphs: [
          'Every page has an `index.md` beside it with the page text, props tables and example code, and [llms.txt](https://design.punji.app/llms.txt) links to all of them. An agent that needs a screen can fetch the registry item and write its files; one that needs a component can read the page Markdown first.',
        ],
        points: [
          'Prefer the documented components inside a pattern over rebuilding them: the money, tables and inputs carry the exactness, keyboard and accessibility work.',
          'Keep `@punji/ui` on the version range the item names, so the screen and the components it uses agree.',
          'CI typechecks every item as app code against the built package before the site is published.',
        ],
      },
    ],
  }),
];
