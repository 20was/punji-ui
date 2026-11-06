// Pages for components scaffolded with `npm run new:component <name>` (docs/CONTRIBUTING-COMPONENT.md). Kept apart from
// registry.ts so contributions merge cleanly; move a page into its domain's registry file when it is reviewed.
// Pure data (no JSX). The generator inserts each new entry above the marker line, keep it.
import type { PageDef } from './registry.ts';

export const COMMUNITY_PAGES: readonly PageDef[] = [
  {
    slug: 'fx-rate',
    title: 'FxRate and convertMoney',
    lead: 'An exchange rate as an exact decimal string, shown as a sentence with its time and source, and converted with bigint maths.',
    description: 'Show an FX rate as "1 USD = NPR 133.40" with time, source and buy/sell, and convert Money between currencies with exact bigint arithmetic and explicit rounding.',
    group: 'financial-primitives',
    kind: 'component',
    summary:
      'An FxRate is base, quote, a decimal-string rate, a time and a source. FxRateDisplay prints it as "1 USD = NPR 133.40" with when and by whom, as one rate, its exact inverse, or a buy and sell pair. convertMoney converts a Money to the quote currency in bigint only, rounded once with the mode you choose. The rate is never a float.',
    use: [
      'Showing a foreign-exchange rate, a remittance rate or a card conversion rate next to the amounts it applies to.',
      '`convertMoney` to preview a conversion with an explicit rounding mode (half-even for ledgers, floor for what a payee receives).',
      '`parseFxRate` or `isValidFxRate` to reject a malformed rate string before it reaches a calculation.',
    ],
    avoid: [
      'Passing a rate as a `number`: 133.4 is not exact. Keep the decimal string your provider sent.',
      'Treating the preview as a quote you can trade at. Lock, validate and apply the rate on the server.',
      'Converting without saying when the rate is from: show the time and source, or pair it with `DataFreshness`.',
    ],
    api: [{ name: 'FxRateDisplay', module: 'fx-rate' }, { name: 'FxRate', module: 'fx-rate' }, { name: 'convertMoney', module: 'fx-rate' }, { name: 'invertRate', module: 'fx-rate' }, { name: 'invertFxRate', module: 'fx-rate' }, { name: 'parseFxRate', module: 'fx-rate' }, { name: 'isValidFxRate', module: 'fx-rate' }, { name: 'formatFxRate', module: 'fx-rate' }],
    examples: [
      { id: 'basic', title: 'Rate and conversion', note: 'A rate with its time, an age and source, and an exact conversion of a Money.' },
      { id: 'pair', title: 'Buy and sell, inverse, Devanagari', note: 'A pair prints the shared time once; inverse is computed exactly; digits follow the locale.' },
    ],
    keyboard: ['Not interactive.'],
    accessibility: [
      'The visible sentence is hidden from assistive technology and replaced by spoken text with currency names: "1 US Dollar equals 133.40 Nepalese Rupee". Override it with `labels.spoken`.',
      'The time is a `<time datetime>` element; buy and sell are named by the words Buy and Sell, never by colour.',
    ],
    responsive: ['Rows wrap; the timestamp and source drop under the rate on a narrow screen.'],
    uxOnly: true,
    notes: {
      title: 'Exactness and limits',
      points: [
        'A rate has at most 18 decimals and must be greater than zero. `convertMoney` throws if the amount is not in `rate.base`.',
        'Pass `timeZone` when you render on a server, so the server and the browser print the same time.',
      ],
    },
    related: ['money-display', 'data-freshness', 'currency-input'],
  },
  {
    slug: 'data-freshness',
    title: 'DataFreshness',
    lead: 'Says how old the figures are: Live, Delayed, End of day, Stale or Offline, with an icon and an "Updated 2 min. ago" that stays current.',
    description: 'Show data freshness as live, delayed, end of day, stale or offline with an icon and words, plus an "updated" age that refreshes and pauses in a hidden tab.',
    group: 'feedback',
    kind: 'component',
    summary:
      'How current a screen\'s data is. Each of five states has its own words and icon, so colour is never the only signal. The age ("Updated 2 min. ago") re-renders on a slow timer that stops while the tab is hidden. A hidden role="status" region speaks only when the state changes.',
    use: [
      'Beside a price, a portfolio value or a table header whose data can lag: set `state="delayed"` with `delayMinutes` for a delayed feed.',
      '`end-of-day` for closing prices, `stale` when a refresh failed but old data is shown, `offline` when the device has no connection.',
    ],
    avoid: [
      'Showing "Live" for a figure you did not refresh: the label reports the state you pass, it does not measure it.',
      'A page-wide outage or maintenance notice: use `StatusBanner`.',
      'Whether a market is open: use `MarketStatus`.',
    ],
    api: [{ name: 'DataFreshness', module: 'data-freshness' }],
    examples: [{ id: 'basic', title: 'All five states', note: 'Each state has a distinct icon and words; the age is "2 min. ago" and ticks.' }],
    keyboard: ['Not interactive.'],
    accessibility: [
      'Words and an icon for every state; the colour of the icon is extra.',
      'A visually hidden `role="status"` region changes text only when `state` changes, never on a timer tick, so a screen reader is not interrupted every 30 seconds.',
      'The age is a `<time datetime>` element outside the live region.',
    ],
    responsive: ['Inline; the age wraps under the state on a narrow screen.'],
    uxOnly: true,
    notes: {
      title: 'The timer',
      points: [
        '`refreshMs` sets the tick (default 30000). The interval is cleared when `document.hidden` is true and restarts, with an immediate refresh, when the tab is visible. It is cleared on unmount.',
      ],
    },
    related: ['market-status', 'fx-rate', 'status-banner'],
  },
  {
    slug: 'status-banner',
    title: 'StatusBanner',
    lead: 'A system-wide notice for market closed, delayed data, maintenance or degraded service, with an optional action and dismiss.',
    description: 'A system-wide notice for market closed, delayed data, maintenance or degraded service: info, warn, danger, an action, dismissible, optionally sticky.',
    group: 'feedback',
    kind: 'component',
    summary:
      'A banner for something that affects the whole app, not one field. Tones info, warn and danger each have an icon; the message carries the meaning. info and warn are role="status", danger is role="alert". The action is a link (through your LinkProvider) or a button. Dismiss it controlled or uncontrolled, or make it sticky under --pu-z-sticky.',
    use: [
      'Market closed, prices delayed, planned maintenance, a degraded payment rail.',
      'An `action` to a status page or to retry.',
      '`sticky` for a notice that must stay in view while the page scrolls.',
    ],
    avoid: [
      'A failure of one part of a page: use `RetryNote`. A note beside one figure: use `Note`.',
      'Using danger for ordinary notices: an alert interrupts screen-reader users, so keep it for real problems.',
      'Relying on the banner to stop an action. "Market closed" does not stop an order; the server must refuse it.',
    ],
    api: [{ name: 'StatusBanner', module: 'status-banner' }],
    examples: [
      { id: 'basic', title: 'Tones, action and dismiss', note: 'info with a link, warn dismissible, danger with an external status page.' },
      { id: 'sticky', title: 'Sticky with scroll padding', note: 'The scroller sets scroll-padding-top so focus is never hidden behind the banner.' },
    ],
    keyboard: ['The action and the dismiss button are native links and buttons in tab order: Tab, then Enter (or Space for a button).', 'Dismissing removes the banner; move focus to something sensible if it held focus.'],
    accessibility: [
      '`role="status"` for info and warn; `role="alert"` for danger.',
      'Each tone has its own icon; the icon is `aria-hidden` and the words carry the message.',
      'WCAG 2.4.11 Focus Not Obscured: a sticky banner can cover a focused control. Give the scrolling container (or `html`) `scroll-padding-top` equal to the banner height, for example `html { scroll-padding-top: 3.5rem }`.',
      'Targets are at least 44 px on touch devices.',
    ],
    responsive: ['The message wraps; the action and dismiss stay on the row end.'],
    uxOnly: true,
    notes: {
      title: 'Sticky banners and scroll padding',
      points: [
        '`sticky` uses `position: sticky; inset-block-start: 0; z-index: var(--pu-z-sticky)`. Place the banner as the first child of the scroll container.',
        'Set `scroll-padding-top` on that scroller to the banner\'s height (add it per breakpoint if the banner wraps). Without it, Tab and in-page links can scroll a control under the banner.',
      ],
    },
    related: ['retry-note', 'data-freshness', 'market-status'],
  },
  // new:component inserts pages above this line
];
