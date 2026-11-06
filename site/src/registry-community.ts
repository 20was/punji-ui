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
  {
    slug: 'menu',
    stability: 'beta',
    title: 'Menu button',
    description: 'A button that opens a menu of actions, links, checkboxes or radios: WAI-ARIA menu button with typeahead, row actions for tables and an account menu.',
    lead: 'A button that opens a keyboard-complete menu: row actions in a table, an account menu, a More button.',
    group: 'forms',
    kind: 'component',
    summary:
      'MenuButton is the WAI-ARIA Menu Button pattern. The button carries aria-haspopup="menu" and aria-expanded; the menu is role="menu" with menuitem, menuitemcheckbox and menuitemradio items. Items can be links, which go through the link adapter (your router link from LinkProvider, with safeHref applied). The menu floats in a portal at --pu-z-dropdown and flips above the button when there is no room below. It is a UX control: the server must still authorise every action.',
    use: [
      'Row actions in a table: an icon-only button ("Actions for NABIL") with View, Edit and a destructive Remove at the end.',
      'An account or user menu in the header, mixing links and actions.',
      'A "More" button that holds the secondary actions of a toolbar.',
      'Checkbox and radio items for view options (show zero balances, density).',
    ],
    avoid: [
      'A panel with its own controls (a form, filters, an inbox): use `Popover`.',
      'Choosing a value for a field: use `Select` or `ChoiceGroup`.',
      'Site navigation: use links in a `nav`, not a menu role.',
      'A destructive item that acts at once: open a confirmation (`InlineConfirm`, `Sheet`) from `onSelect`.',
    ],
    api: [
      { name: 'MenuButton', module: 'menu' },
      { name: 'MenuButtonProps', module: 'menu' },
      { name: 'MenuItem', module: 'menu' },
      { name: 'MenuActionItem', module: 'menu' },
      { name: 'MenuCheckboxItem', module: 'menu' },
      { name: 'MenuRadioItem', module: 'menu' },
      { name: 'MenuSeparatorItem', module: 'menu' },
    ],
    examples: [
      { id: 'basic', title: 'Account menu', note: 'Links, an action, a separator and a destructive item at the end.' },
      { id: 'row-actions', title: 'Row actions', note: 'An icon-only trigger on each table row. The label is required and names the row.' },
      { id: 'options', title: 'Checkbox and radio items', note: 'View options: a toggle and an exclusive choice. You keep the state.' },
    ],
    keyboard: [
      'Enter, Space and ArrowDown on the button open the menu on the first item; ArrowUp opens it on the last.',
      'ArrowDown and ArrowUp move between items and wrap. Home and End go to the first and last item.',
      'Typing a letter moves to the next item that starts with it; typing the same letter again cycles, typing more narrows.',
      'Enter or Space on an item chooses it, closes the menu and returns focus to the button (a link is followed).',
      'Escape closes the menu and returns focus to the button. Tab closes it and moves on to the next control.',
      'Disabled items are skipped by the arrow keys but still announced as unavailable.',
    ],
    accessibility: [
      'The button has aria-haspopup="menu", aria-expanded and aria-controls (while open). An icon-only button needs `label`, which becomes its aria-label; a row-actions label should name the row.',
      'The menu is role="menu", named by the button; items are menuitem, menuitemcheckbox (aria-checked) or menuitemradio (aria-checked); separators are role="separator".',
      'Focus moves into the menu on open and back to the button on Escape, on choosing an item and on Tab. Items take focus programmatically (tabindex -1).',
      'A destructive item uses the danger colour and its words ("Remove account"), never colour alone. Disabled items carry aria-disabled.',
      'The menu is in a portal, so tables and cards with overflow hidden do not clip it.',
    ],
    responsive: ['Touch targets are 44px. The menu keeps 8px from the viewport edges, opens above the button when it does not fit below and scrolls when it is taller than the space.'],
    notes: {
      title: 'Limits',
      points: [
        'Menus do not nest (no submenus), and checkbox and radio items close the menu when chosen.',
        'Radio items are not wrapped in a labelled group; keep a radio set together and separate it with a separator.',
        'A custom link component must forward its ref and props to an <a>, as the other link-rendering components require.',
      ],
    },
    related: ['popover', 'button', 'breadcrumb', 'data-table'],
  },
  {
    slug: 'breadcrumb',
    stability: 'beta',
    title: 'Breadcrumb',
    description: 'A breadcrumb trail for deep account and document pages: a labelled nav, the current page marked, router links and a collapsed menu for long trails.',
    lead: 'Where the reader is in a hierarchy, with a link back to every level and the current page marked.',
    group: 'layout',
    kind: 'component',
    summary:
      'Breadcrumb is the WAI-ARIA Breadcrumb pattern: a nav named "Breadcrumb" around an ordered list, the last item marked aria-current="page", separators hidden from screen readers. Links go through the link adapter, so a router link from LinkProvider is used for in-app paths and safeHref blocks unsafe schemes. Set maxItems to fold the middle levels into a menu of links.',
    use: [
      'Pages three or more levels deep: Accounts, Savings, Statement for Kartik.',
      'Above a page title when a reader may arrive from a search or a shared link and needs to go up a level.',
      'maxItems (for example 3 on a phone) to fold the middle levels into a "..." menu.',
      'Several breadcrumbs on one page (a site header trail and a panel trail) each need a unique `labels.nav`, or the landmarks share a name.',
    ],
    avoid: [
      'Flat sites with one or two levels: a back link or the page title is enough.',
      'Steps of a process (onboarding, a transfer): use the wizard.',
      'Switching views of one page: use `Tabs`.',
    ],
    api: [
      { name: 'Breadcrumb', module: 'breadcrumb' },
      { name: 'BreadcrumbProps', module: 'breadcrumb' },
      { name: 'BreadcrumbItem', module: 'breadcrumb' },
      { name: 'BreadcrumbLabels', module: 'breadcrumb' },
    ],
    examples: [
      { id: 'basic', title: 'Account trail', note: 'The last item is the current page: text, not a link.' },
      { id: 'collapsed', title: 'Collapsed on a phone', note: 'maxItems folds the middle levels into a menu of links.' },
    ],
    keyboard: [
      'Tab moves through the links in order; Enter follows one.',
      'The collapsed "..." button opens a menu: arrows, Home, End, typeahead, Escape and Tab as for `MenuButton`.',
    ],
    accessibility: [
      '`<nav aria-label="Breadcrumb">` around an `<ol>`; the name is localisable through `labels.nav` or the locale pack.',
      'The current page has aria-current="page" and is not a link unless you give it an href.',
      'Separators are decorative (aria-hidden) and drawn by the component, so a screen reader reads only the levels.',
      'Link targets are 24px high, 44px on touch screens.',
    ],
    responsive: ['The list wraps. The component does not measure the width: pass a smaller maxItems on narrow screens (for example from a media query hook) to fold the middle levels.'],
    related: ['menu', 'tabs', 'page-layout', 'card'],
  },
  {
    slug: 'accordion',
    stability: 'beta',
    title: 'Accordion',
    description: 'Stacked headings that each show or hide a panel: WAI-ARIA accordion with single or multiple open, controlled or uncontrolled, for FAQs and loan terms.',
    lead: 'Stacked sections that expand one at a time or together, with arrow-key movement between headers.',
    group: 'layout',
    kind: 'component',
    summary:
      'Accordion is the WAI-ARIA Accordion pattern. Each header is a button inside a heading with aria-expanded and aria-controls; each panel is a region labelled by its header (dropped past six panels). type="single" keeps one open, type="multiple" opens any number. It works controlled (value, onValueChange) or uncontrolled (defaultValue), and a panel fades in only when motion is allowed.',
    use: [
      'An FAQ, a loan product\'s fees and eligibility, a statement\'s sections: long content a reader scans by heading.',
      'type="multiple" when readers compare sections; type="single" to keep the page short.',
      'Set headingLevel one level below the section heading the accordion sits under (3 under an h2), so the outline has no skipped level.',
    ],
    avoid: [
      'Content every reader needs (a transfer\'s fee and total): show it.',
      'Switching between views of one object: use `Tabs`.',
      'A single show or hide of one block: use `ShowMore`.',
    ],
    api: [
      { name: 'Accordion', module: 'accordion' },
      { name: 'AccordionProps', module: 'accordion' },
      { name: 'AccordionItem', module: 'accordion' },
    ],
    examples: [
      { id: 'basic', title: 'Single', note: 'One section open at a time; the open one can be closed.' },
      { id: 'multiple', title: 'Multiple, controlled', note: 'Any number open; the page keeps the state through value and onValueChange.' },
    ],
    keyboard: [
      'Tab moves between headers (they are buttons) and into open panels.',
      'Enter or Space on a header opens or closes its panel.',
      'ArrowDown and ArrowUp move to the next and previous header and wrap; Home and End go to the first and last. Disabled headers are skipped.',
    ],
    accessibility: [
      'Headers are buttons inside headings of your chosen level, with aria-expanded and aria-controls.',
      'Panels are role="region" labelled by their header, except past six panels where regions would clutter the landmark list.',
      'With type="single" and collapsible={false} the open header has aria-disabled, so it is announced as unavailable rather than silently ignored.',
      'Closed panels are hidden (display none) so their content is not reachable; the chevron is decorative.',
    ],
    responsive: ['Full width of its container; headers are 44px tall, and long headers wrap.'],
    related: ['tabs', 'show-more', 'card', 'menu'],
  },
  // new:component inserts pages above this line
];
