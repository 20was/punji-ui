// Pages for components scaffolded with `npm run new:component <name>` (docs/CONTRIBUTING-COMPONENT.md). Kept apart from
// registry.ts so contributions merge cleanly; move a page into its domain's registry file when it is reviewed.
// Pure data (no JSX). The generator inserts each new entry above the marker line, keep it.
import type { PageDef } from './registry.ts';

export const COMMUNITY_PAGES: readonly PageDef[] = [
  {
    slug: 'menu',
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
