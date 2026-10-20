// What the sync knows about Punji's web kit: every module and how it is
// classified, the adapters applied to the modules that need one, which CSS
// class belongs to which module, and the size budgets. The sync fails on
// anything in the source it does not find here, so a new module, a new class
// or a changed adapter target is a decision, never a silent copy.
//
// Status:
//   ship      copied as is (imports rewritten, styles split per module)
//   adapt     copied with the listed edits (each must match exactly)
//   pending   general enough for the package, planned for a later pull request
//   web-only  stays in Punji, with the reason

/**
 * An adapter edit. `upstream` names the Punji change that makes the same fix
 * there: once the source already contains `replace`, the sync skips the edit
 * (and says so) instead of failing, and the next sync PR drops it.
 * @typedef {{ find: string, replace: string, count?: number, upstream?: string }} Edit
 */
/** @typedef {{ status: 'ship' | 'adapt' | 'pending' | 'web-only', reason?: string, edits?: Edit[], budget?: string }} Module */

const LINK_IMPORT = "import type { LinkComponent } from '../internal/link.tsx';\n";

/** @type {Record<string, Module>} keyed by the web kit's file name */
export const MODULES = {
  'Button.tsx': {
    status: 'adapt',
    reason: 'No router dependency: `href` renders <a>, or the `linkComponent` you pass (a router link) for in-app paths.',
    budget: '640 B',
    edits: [
      { find: "import { Link } from 'react-router-dom';\n", replace: LINK_IMPORT },
      {
        find: '  /** Renders a link styled as a button. Absolute URLs become <a>. */\n  href?: string;\n',
        replace:
          '  /** Renders a link styled as a button: a plain <a>, or `linkComponent` for an in-app path. Absolute URLs are always a plain <a>. */\n  href?: string;\n  /** The link element for an in-app `href` (wrap your router\'s link; it receives `href`). Default: a plain <a>. */\n  linkComponent?: LinkComponent;\n',
      },
      { find: 'iconOnly, label, href, testId,', replace: 'iconOnly, label, href, linkComponent, testId,' },
      {
        find: '    return /^https?:/.test(href) ? (\n      <a className={cls} href={href} aria-label={name} data-testid={testId}>{body}</a>\n    ) : (\n      <Link className={cls} to={href} aria-label={name} data-testid={testId}>{body}</Link>\n    );\n',
        replace:
          "    const L = linkComponent && !/^https?:/.test(href) ? linkComponent : 'a';\n    return (\n      <L className={cls} href={href} aria-label={name} data-testid={testId}>{body}</L>\n    );\n",
      },
      { find: 'the rare link the kit\'s Button cannot render\n * itself (a StockLink, a router link with its own props).', replace: 'the rare link the Button cannot render\n * itself (a link component with its own props).' },
    ],
  },
  'Card.tsx': { status: 'ship', budget: '560 B' },
  'Checkbox.tsx': { status: 'ship', budget: '400 B' },
  'ChoiceGroup.tsx': { status: 'ship', budget: '430 B' },
  'Controls.tsx': { status: 'ship', budget: '1.2 kB' },
  'Select.tsx': {
    status: 'adapt',
    reason: 'Comment only: the guard test it names lives in Punji.',
    budget: '850 B',
    edits: [
      {
        find: ' * name); consecutive options form one group, so list them in order. Every\n * other raw <select> is a test failure (src/components/kit/__tests__/select.test.tsx).\n',
        replace: ' * name); consecutive options form one group, so list them in order.\n',
      },
    ],
  },
  'ShowMore.tsx': { status: 'ship', budget: '460 B' },
  'StatusPill.tsx': {
    status: 'adapt',
    reason: 'No router dependency: `href` renders <a>, or the `linkComponent` you pass.',
    budget: '530 B',
    edits: [
      { find: "import { Link } from 'react-router-dom';\n", replace: LINK_IMPORT },
      {
        find: "size?: 'sm'; href?: string; /**",
        replace: "size?: 'sm'; href?: string; /** The link element for an in-app `href` (wrap your router's link). Default: a plain <a>. */ linkComponent?: LinkComponent; /**",
      },
      { find: 'size, href, marker, testId, className }:', replace: 'size, href, linkComponent, marker, testId, className }:' },
      {
        find: '  return href ? (\n    <Link className={cls} to={href} data-testid={testId}>\n      {body}\n    </Link>\n  ) : (',
        replace: "  const L = linkComponent && !/^https?:/.test(href ?? '') ? linkComponent : 'a';\n  return href ? (\n    <L className={cls} href={href} data-testid={testId}>\n      {body}\n    </L>\n  ) : (",
      },
    ],
  },
  'Switch.tsx': { status: 'ship', budget: '400 B' },
  'Tabs.tsx': { status: 'ship', budget: '820 B' },
  'format.ts': {
    status: 'adapt',
    reason: 'Types only: this package type-checks with noUncheckedIndexedAccess, so the list lookups say what an empty slot means (never reached: the list is not empty there).',
    budget: '1 kB',
    edits: [
      { find: 'return values[(i + 1 + n) % n];', replace: 'return values[(i + 1 + n) % n] ?? null;' },
      { find: 'return values[(i - 1 + n) % n];', replace: 'return values[(i - 1 + n) % n] ?? null;' },
      { find: "if (key === 'Home') return values[0];", replace: "if (key === 'Home') return values[0] ?? null;" },
      { find: "if (key === 'End') return values[n - 1];", replace: "if (key === 'End') return values[n - 1] ?? null;" },
    ],
  },

  // Inputs and overlays.
  'Fields.tsx': {
    status: 'adapt',
    reason: 'Types only (noUncheckedIndexedAccess): a suggestion is picked only when it exists.',
    budget: '2.05 kB',
    edits: [
      { find: '!(matches.length === 1 && matches[0].symbol === value.toUpperCase())', replace: '!(matches.length === 1 && matches[0]?.symbol === value.toUpperCase())' },
      { find: '            pick(matches[active]);', replace: '            const hit = matches[active];\n            if (hit) pick(hit);' },
    ],
  },
  'CompanySearch.tsx': { status: 'ship', budget: '1.7 kB' },
  'ListFilter.tsx': { status: 'ship', budget: '1.1 kB' },
  'RangeSlider.tsx': { status: 'ship', budget: '550 B' },
  'InlineConfirm.tsx': { status: 'ship', budget: '1.05 kB' },
  'Overlay.tsx': {
    status: 'adapt',
    reason: 'Types only (noUncheckedIndexedAccess): the focus trap reads its first and last item after checking the list is not empty.',
    budget: '1.6 kB',
    edits: [{ find: '        const [a, z] = [items[0], items[items.length - 1]];', replace: '        const [a, z] = [items[0]!, items[items.length - 1]!];' }],
  },
  'Drawer.tsx': {
    status: 'adapt',
    reason: 'Comment only: the narrow-screen alternative it names lives in Punji.',
    budget: '900 B',
    edits: [{ find: ' * instead (src/me/desk/DeskChrome.tsx PushView).', replace: ' * instead.' }],
  },
  'CommandPalette.tsx': {
    status: 'adapt',
    reason: 'Types only (noUncheckedIndexedAccess): rows and actions are read where they exist.',
    budget: '2.45 kB',
    edits: [
      { find: "list.current?.querySelector(`#${domId(items[active].id)}`)", replace: "list.current?.querySelector(`#${domId(items[active]!.id)}`)" },
      { find: '    if (activeItem?.actions[next]) setSaid(labels.chosen(activeItem.actions[next].label));', replace: '    const nextAction = activeItem?.actions[next];\n    if (nextAction) setSaid(labels.chosen(nextAction.label));' },
      { find: '      if (activeItem?.actions[activeChip]) onRun(activeItem, activeItem.actions[activeChip]);', replace: '      const action = activeItem?.actions[activeChip];\n      if (activeItem && action) onRun(activeItem, action);' },
      { find: '(i === 0 || items[i - 1].group !== e.group)', replace: '(i === 0 || items[i - 1]!.group !== e.group)' },
    ],
  },
  'commandKeys.ts': { status: 'ship', budget: '240 B' },
  'States.tsx': { status: 'ship', budget: '970 B' },
  'InfoTip.tsx': { status: 'ship', budget: '1.6 kB' },
  'FloatingTooltip.tsx': {
    status: 'adapt',
    reason: 'Types only (noUncheckedIndexedAccess): the resize observer reads its first entry when there is one.',
    budget: '980 B',
    edits: [{ find: '    const observer = new ResizeObserver(([entry]) => {\n      const', replace: '    const observer = new ResizeObserver(([entry]) => {\n      if (!entry) return;\n      const' }],
  },
  // Data display.
  'Rows.tsx': {
    status: 'adapt',
    reason: 'No router dependency: a ValueRow with `href` renders <a>, or the `linkComponent` you pass for an in-app path.',
    budget: '1 kB',
    edits: [
      { find: "import { Link } from 'react-router-dom';\n", replace: LINK_IMPORT },
      { find: '  href?: string;\n  onClick?: () => void;\n', replace: '  href?: string;\n  /** The link element for an in-app `href` (wrap your router\'s link). Default: a plain <a>. */\n  linkComponent?: LinkComponent;\n  onClick?: () => void;\n' },
      { find: 'figure, note, href, onClick, chevron,', replace: 'figure, note, href, linkComponent, onClick, chevron,' },
      {
        find: '    const external = /^https?:/.test(href);\n    return external ? (\n      <a className="kit-value-row" href={href} data-testid={testId} aria-label={ariaLabel}>{body}</a>\n    ) : (\n      <Link className="kit-value-row" to={href} data-testid={testId} aria-label={ariaLabel}>{body}</Link>\n    );\n',
        replace: "    const L = linkComponent && !/^https?:/.test(href) ? linkComponent : 'a';\n    return (\n      <L className=\"kit-value-row\" href={href} data-testid={testId} aria-label={ariaLabel}>{body}</L>\n    );\n",
      },
    ],
  },
  'Stats.tsx': { status: 'ship', budget: '400 B' },
  'LockedNote.tsx': { status: 'ship', budget: '450 B' },
  'Figures.tsx': {
    status: 'adapt',
    reason: 'Comment only: names where the grouping helpers come from in this package.',
    budget: '880 B',
    edits: [{ find: 'en-IN grouping from lib/format.', replace: 'en-IN grouping (lakh and crore).' }],
  },
  'LiveFigure.tsx': { status: 'ship', budget: '1.35 kB' },
  'live.ts': { status: 'ship', budget: '900 B' },
  'compact.ts': {
    status: 'adapt',
    reason: 'Comment only: the bundle it names is Punji\'s.',
    budget: '540 B',
    edits: [{ find: " * barrel: only the portfolio page uses it, and the shell's first load\n * (me.html) should not carry it.", replace: ' * barrel, so an app that does not draw it does not load it.' }],
  },
  'Table.tsx': {
    status: 'adapt',
    reason: 'Comment only: names the locked cell by its component, not its file.',
    budget: '820 B',
    edits: [{ find: ' * (LockedCell.tsx).\n', replace: ' * (the LockedCell component, pending in this package).\n' }],
  },
  'Layout.tsx': {
    status: 'adapt',
    reason: 'No router dependency: the back circle renders <a>, or the `linkComponent` you pass.',
    budget: '820 B',
    edits: [
      { find: "import { Link } from 'react-router-dom';\n", replace: LINK_IMPORT },
      { find: ' * header every me.punji.app page uses. Maps the app\'s PageLayout and\n * PageHeader (docs/web/UI.md): a back', replace: ' * header every page uses, as the Punji app\'s PageLayout and PageHeader:\n * a back' },
      { find: '  backTo?: string;\n', replace: '  backTo?: string;\n  /** The link element for `backTo` (wrap your router\'s link). Default: a plain <a>. */\n  linkComponent?: LinkComponent;\n' },
      { find: "{ title, backTo, backLabel = 'Back', meta, actions, eyebrow, compact, stamp, testId }: HeaderProps) {\n", replace: "{ title, backTo, linkComponent, backLabel = 'Back', meta, actions, eyebrow, compact, stamp, testId }: HeaderProps) {\n  const L = linkComponent ?? 'a';\n" },
      { find: '        <Link className="kit-circle kit-back" to={backTo} aria-label={backLabel} data-testid="back-button">\n          <ChevronLeft />\n        </Link>', replace: '        <L className="kit-circle kit-back" href={backTo} aria-label={backLabel} data-testid="back-button">\n          <ChevronLeft />\n        </L>' },
    ],
  },
  // Data display added with Punji's portfolio page. Each draws from the data
  // stylesheet, which the sync does not split per module yet.
  'ActionNotice.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'Breakdown.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'FlowWaterfall.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'Meter.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'MetricTile.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'OptionTile.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'PickedItem.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'PromptCard.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'Sparkline.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'StepList.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'SummaryFigure.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'DrawerScreen.tsx': { status: 'ship', budget: '1 kB' },
  'MonthGrid.tsx': { status: 'pending', reason: 'Reads a Punji data contract and a Punji helper; needs general props before it can ship.' },

  // Added with Punji's account pages (#246 to #271).
  'chartScale.ts': { status: 'ship', budget: '900 B' },
  'FilterChip.tsx': {
    status: 'adapt',
    reason: 'Comment only: names the chips by component, not by file.',
    budget: '1 kB',
    edits: [{ find: '(Controls.tsx has Chip and ChipRow,', replace: '(Controls has Chip and ChipRow,' }],
  },
  'Avatar.tsx': {
    status: 'adapt',
    reason: 'Types only (noUncheckedIndexedAccess): the first and last word exist once the name has one.',
    budget: '800 B',
    edits: [
      { find: 'const first = [...parts[0]][0]', replace: 'const first = [...parts[0]!][0]' },
      { find: '[...parts[parts.length - 1]][0]', replace: '[...parts[parts.length - 1]!][0]' },
    ],
  },
  'StatusTag.tsx': { status: 'ship', budget: '650 B' },
  'Popover.tsx': { status: 'ship', budget: '1.7 kB' },
  'DangerConfirm.tsx': { status: 'pending', reason: "Listens for a key on the dialog box itself, which this package's a11y lint refuses; needs the listener moved in Punji first." },
  'InboxList.tsx': { status: 'pending', reason: "Sets role=\"list\" on its <ul> (kept for Safari, which drops the role with list-style: none), which this package's a11y lint refuses; needs a decision in Punji first." },
  'CardSection.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'FactList.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'ContrastCard.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'LinkRow.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet. It also needs a linkComponent adapter (router links)." },
  'RetryNote.tsx': { status: 'pending', reason: "Styles come from the data stylesheet, which uses @container queries the sync does not split per module yet." },
  'TwoLineChart.tsx': { status: 'pending', reason: "Imports the chart inspector and geometry from outside the kit; the data stylesheet uses @container queries." },
  'ColumnChart.tsx': { status: 'pending', reason: "Imports the chart inspector from outside the kit; the data stylesheet uses @container queries." },
  'Bars.tsx': { status: 'pending', reason: "Styles come from the blocks stylesheet, which uses @container queries the sync does not split per module yet." },
  'Checklist.tsx': { status: 'pending', reason: "Styles come from the blocks stylesheet, which uses @container queries the sync does not split per module yet." },
  'InlineState.tsx': { status: 'pending', reason: "Styles come from the blocks stylesheet, which uses @container queries the sync does not split per module yet." },
  'Pagination.tsx': { status: 'pending', reason: "Styles come from the blocks stylesheet, which uses @container queries the sync does not split per module yet." },
  'TrendChart.tsx': { status: 'pending', reason: "Styles come from the blocks stylesheet, which uses @container queries the sync does not split per module yet." },
  'ProgressRow.tsx': { status: 'pending', reason: "Styles come from the blocks stylesheet, which uses @container queries the sync does not split per module yet. It also needs a linkComponent adapter (router links)." },
  'LinkTable.tsx': { status: 'pending', reason: "Styles come from the blocks stylesheet, which uses @container queries the sync does not split per module yet. It also needs a linkComponent adapter (router links)." },
  'CaveatList.tsx': { status: 'pending', reason: "Styles come from the tools stylesheet, which uses @container queries the sync does not split per module yet." },
  'MonthStrip.tsx': { status: 'pending', reason: "Styles come from the tools stylesheet, which uses @container queries the sync does not split per module yet." },
  'RunQuota.tsx': { status: 'pending', reason: "Styles come from the tools stylesheet, which uses @container queries the sync does not split per module yet." },
  'StepField.tsx': { status: 'pending', reason: "Styles come from the tools stylesheet, which uses @container queries the sync does not split per module yet." },
  'TemplateTabs.tsx': { status: 'pending', reason: "Styles come from the tools stylesheet, which uses @container queries the sync does not split per module yet." },
  'ForecastNote.tsx': { status: 'pending', reason: "Styles come from the tools stylesheet, which uses @container queries the sync does not split per module yet." },
  'RuleSentence.tsx': { status: 'pending', reason: "Styles come from the tools stylesheet, which uses @container queries the sync does not split per module yet." },
  'EquityChart.tsx': { status: 'pending', reason: "Styles come from the tools stylesheet, which uses @container queries the sync does not split per module yet. Its legend names NEPSE; it needs a general series label first." },
  'BarButton.tsx': { status: 'pending', reason: "Styles come from the top bar stylesheet, which uses @container queries the sync does not split per module yet." },
  'BarSwitch.tsx': { status: 'pending', reason: "Styles come from the top bar stylesheet, which uses @container queries the sync does not split per module yet." },
  'NotificationBell.tsx': { status: 'pending', reason: "Styles come from the top bar stylesheet, which uses @container queries the sync does not split per module yet." },
  'FloorGauge.tsx': { status: 'pending', reason: "Styles come from the research stylesheet, which uses @container queries the sync does not split per module yet." },
  'HealthSummary.tsx': { status: 'pending', reason: "Styles come from the research stylesheet, which uses @container queries the sync does not split per module yet." },
  'QuarterBars.tsx': { status: 'pending', reason: "Styles come from the research stylesheet, which uses @container queries the sync does not split per module yet." },
  'QuoteList.tsx': { status: 'pending', reason: "Styles come from the research stylesheet, which uses @container queries the sync does not split per module yet." },
  'CheckRow.tsx': { status: 'pending', reason: "Styles come from the research stylesheet, which uses @container queries the sync does not split per module yet. It also needs a linkComponent adapter (router links)." },
  'FilterMenu.tsx': { status: 'pending', reason: "Styles come from the filter stylesheet, which uses @container queries the sync does not split per module yet." },
  'Histogram.tsx': { status: 'pending', reason: "Styles come from the filter stylesheet, which uses @container queries the sync does not split per module yet." },
  'LockedCell.tsx': { status: 'pending', reason: "Styles come from the filter stylesheet, which uses @container queries the sync does not split per module yet." },
  'PresetTile.tsx': { status: 'pending', reason: "Styles come from the filter stylesheet, which uses @container queries the sync does not split per module yet." },
  'RangeEditor.tsx': { status: 'pending', reason: "Styles come from the filter stylesheet, which uses @container queries the sync does not split per module yet." },
  'PeriodHistory.tsx': { status: 'pending', reason: "Styles come from the season stylesheet, which uses @container queries the sync does not split per module yet." },
  'ReturnBars.tsx': { status: 'pending', reason: "Styles come from the season stylesheet, which uses @container queries the sync does not split per module yet." },
  'ChartStrip.tsx': { status: 'pending', reason: "Styles come from the workspace stylesheet, which uses @container queries the sync does not split per module yet." },
  'KeyStats.tsx': { status: 'pending', reason: "Styles come from the workspace stylesheet, which uses @container queries the sync does not split per module yet." },
  'MarkToggleList.tsx': { status: 'pending', reason: "Styles come from the workspace stylesheet, which uses @container queries the sync does not split per module yet." },
  'ToolMenu.tsx': { status: 'pending', reason: "Styles come from the workspace stylesheet, which uses @container queries the sync does not split per module yet." },
  'WorkspacePanel.tsx': { status: 'pending', reason: "Styles come from the workspace stylesheet, which uses @container queries the sync does not split per module yet." },
  'WorkspaceToolbar.tsx': { status: 'pending', reason: "Styles come from the workspace stylesheet, which uses @container queries the sync does not split per module yet." },
  'ReorderList.tsx': { status: 'pending', reason: "Styles come from the watchlist stylesheet, which uses @container queries the sync does not split per module yet." },
  'MenuList.tsx': { status: 'pending', reason: "Needs a linkComponent adapter (router links) before it can ship; its styles are split (the popover stylesheet)." },
  'SettingRow.tsx': { status: 'pending', reason: "Needs a linkComponent adapter (router links) before it can ship; its styles are split (the setting stylesheet)." },
  'PrivateAmount.tsx': { status: 'pending', reason: "Keeps its choice under Punji's own storage key and masks rupees; needs a key and a mask as props first." },
  'MenuPanel.tsx': { status: 'pending', reason: "Styles come from the site stylesheet, shared with Punji's site header and footer; not split yet. It also needs a linkComponent adapter (router links)." },
  'Disclosure.tsx': { status: 'pending', reason: "Styles come from the site and research stylesheets, shared with Punji's site chrome; not split yet." },
  'TargetChart.tsx': { status: 'pending', reason: "Draws with classes from several page stylesheets; needs its own sheet first." },
  'AlertSummary.tsx': { status: 'pending', reason: "Styles come from the alerts stylesheet, which uses @container queries the sync does not split per module yet." },
  'AlertForm.tsx': { status: 'web-only', reason: "Punji's price alert form: rupee targets on NEPSE stocks and indices." },
  'AlertRow.tsx': { status: 'web-only', reason: "Punji's price alert row: rupee targets, NEPSE index subjects, router links." },
  'alertDistance.ts': { status: 'web-only', reason: "Punji's alert distance rule (a 10% scale to a price target)." },
  'alertTarget.ts': { status: 'web-only', reason: "Punji's alert target wording (rupees, index points) on Punji's number helpers." },
  'companyName.ts': { status: 'web-only', reason: "Shortens NEPSE company names (Limited, Bank and similar)." },
  'MarketMark.tsx': { status: 'web-only', reason: "Punji's NEPSE chip: the index, its session and its change." },
  'RatingChip.tsx': { status: 'web-only', reason: "Punji's technical rating words and their scale." },
  'RatingScale.tsx': { status: 'web-only', reason: "Punji's technical rating scale." },
  'RatingChangeRow.tsx': { status: 'web-only', reason: "Punji's technical rating changes, with router links to stocks." },
  'SecurityTitle.tsx': { status: 'web-only', reason: "A NEPSE security's code and name, as Punji's research pages head them." },
  'SymbolBlock.tsx': { status: 'web-only', reason: "A NEPSE security's code, name and quote." },
  'QuoteHero.tsx': { status: 'web-only', reason: "A NEPSE security's quote header." },
  'BrokerDays.tsx': { status: 'web-only', reason: "NEPSE broker activity by day (floorsheet data)." },
  'WatchSummary.tsx': { status: 'web-only', reason: "Punji's watchlist summary: rupee moves of watched NEPSE stocks." },
  'WatchlistRow.tsx': { status: 'web-only', reason: "Punji's watchlist row: a NEPSE stock, its price and moves." },
  'PersonTile.tsx': { status: 'web-only', reason: "Punji's tracked-person tile: their portfolio in rupees, router links." },
  'SelectableMonthGrid.tsx': { status: 'web-only', reason: "Reads Punji's seasonality contract and helpers." },
  'SettingIcon.tsx': { status: 'web-only', reason: "Glyphs named for Punji's settings rows; a general icon set is on the roadmap." },
  'SiteHeader.tsx': { status: 'web-only', reason: "punji.app's site header: its menus, search and sign-in." },
  'SiteFooter.tsx': { status: 'web-only', reason: "punji.app's site footer: its columns, contact and socials." },
  'PhoneMenu.tsx': { status: 'web-only', reason: "punji.app's phone menu." },
  'StoreButtons.tsx': { status: 'web-only', reason: "Punji's App Store and Google Play buttons (brand artwork)." },

  // Stays in Punji.
  'AppTabBar.tsx': { status: 'web-only', reason: "Punji's own phone navigation: its hosts, routes and sections." },
  'tabRoutes.ts': { status: 'web-only', reason: "Punji's tab addresses, cookies and session keys." },
  'NavIcon.tsx': { status: 'web-only', reason: "Glyphs named for Punji's navigation; a general icon set is on the roadmap." },
  'Logo.tsx': { status: 'web-only', reason: 'Punji brand artwork (trademark): never in the package.' },
  'LogoWordmark.tsx': { status: 'web-only', reason: 'Punji brand artwork (trademark): never in the package.' },
};

/**
 * Helpers the kit imports from outside it, provided here by hand-written
 * modules. The sync checks each import names only these, and that the source
 * of each helper is unchanged (sha256 of its text); a change fails the sync
 * until src/internal is reviewed and the hash updated.
 */
export const EXTERNAL = {
  '../../lib/format': {
    to: '../internal/number.ts',
    names: {
      fixed: '6bb1364a4f1048ea93b3dfc74c1939ce8bd86528715ddb791d34b36806967fcc',
      int: '8fc627b9fab2d8d53da3becb695909c7aef72a31c2dafe94bb598a00f4842844',
      rs: 'eef76c03231b05895277e8b8d9491f61de7dd1b22546b747a3ffb7adddae3bdf',
    },
  },
};

/** Source stylesheets: the kit's own section of the page kit sheet, then whole files. */
export const CSS_SOURCES = [
  { file: 'src/styles/kit.css', from: 'The React web kit (src/components/kit)' },
  { file: 'src/styles/choices.css' },
  { file: 'src/styles/command.css' },
  { file: 'src/styles/floating-tooltip.css' },
  // The kit's own sheets the sync splits whole (no @container queries, no @import).
  { file: 'src/styles/kit-account.css' },
  { file: 'src/styles/kit-drawer.css' },
  { file: 'src/styles/kit-pop.css' },
  { file: 'src/styles/kit-search.css' },
  { file: 'src/styles/kit-setting.css' },
];

/** Token files, in cascade order: the generated base, the semantic tokens, the kit's theme. */
export const TOKEN_SOURCES = { base: 'src/styles/tokens.generated.css', semantic: 'src/styles/tokens.css', theme: 'src/styles/me-theme.css' };

/** Which module's stylesheet a class belongs to. `base` is shared by every component. */
export const CSS_OWNERS = {
  base: [/^kit-sr$/, /^kit-spin$/],
  button: [/^kit-btn(-ico)?$/],
  card: [/^kit-card(-[htf]|-ic|-meta)?$/],
  checkbox: [/^kit-check(-t|-end)?$/],
  'choice-group': [/^kit-choice(-underline|-compact)?$/],
  controls: [/^kit-chips?$/, /^kit-chip-ico$/, /^kit-seg$/],
  select: [/^kit-sel(-f|-l|-ico)?$/],
  'show-more': [/^kit-more$/],
  'status-pill': [/^kit-pill(-sw)?$/, /^kit-count$/],
  switch: [/^kit-switch$/],
  tabs: [/^kit-tabs$/],
  layout: [/^kit-(page|main|header|header-meta|header-actions|header-title|header-k|back|circle|section-h|chev|skip)$/],
  rows: [/^kit-(group|rows|value-row|value-act|value-act-b|data-row|tile)$/],
  stats: [/^kit-stats?$/],
  'inline-confirm': [/^kit-confirm(-[tb])?$/],
  figures: [/^kit-(fig|up|dn|flat)$/],
  'live-figure': [/^kit-live(-up|-dn)?$/],
  table: [/^kit-table(box)?$/],
  states: [/^kit-(empty|note|note-mark|tone-ico|skel|skel-text)$/],
  fields: [/^kit-(field|options)$/],
  overlay: [/^kit-(dock|sheet|sheet-back|toasts?)$/],
  'company-search': [/^kit-cs(-.+)?$/],
  'list-filter': [/^kit-lf(-.+)?$/],
  'range-slider': [/^kit-rs(-.+)?$/],
  drawer: [/^kit-drawer(-back)?$/],
  'command-palette': [/^kit-cmd(-.+)?$/],
  'filter-chip': [/^kit-fchip(-[tx])?$/],
  avatar: [/^kit-avatar$/],
  'status-tag': [/^kit-tag$/],
  'drawer-screen': [/^kit-drawer-(acts|body|foot|head|note|screen|x)$/],
  popover: [/^kit-pop(-at)?$/],
  // Pending modules: their rules are owned (so a new class is a decision) but not written until they ship.
  'danger-confirm': [/^kit-dconfirm(-[bt])?$/],
  'inbox-list': [/^kit-(inbox|inbox-.+|ing|ing-h|inrow|inrow-.+)$/],
  'menu-list': [/^kit-(menu|menu-.+|mi|mi-.+)$/],
  'setting-row': [/^kit-set(-.+)?$/],
  'floating-tooltip': [/^kit-floating-tip$/, /^kit-icon-(hint|tip)$/, /^kit-info(-tip)?$/, /^kit-tip-t$/],
};

/** Keyframes follow the module that runs them. */
export const KEYFRAME_OWNERS = {
  'kit-rot': 'base',
  'kit-shimmer': 'states',
  'kit-live-up': 'live-figure',
  'kit-live-dn': 'live-figure',
  'kit-drawer-in': 'drawer',
  'kit-fade-in': 'drawer',
  'kit-tip-in': 'floating-tooltip',
  'kit-cmd-fade': 'command-palette',
  'kit-cmd-in': 'command-palette',
  'kit-pop-in': 'popover',
};

/**
 * Rules left out of the package, keyed by "<at-rule prelude> <selector>" (or
 * the selector alone), with the reason.
 */
export const CSS_DROP = {
  '@media (max-width: 767px) .kit-dock': "Lifts the dock over Punji's own phone tab bar; the package has no tab bar.",
  '@media (max-width: 767px) .kit-toasts': "Lifts the toasts over Punji's own phone tab bar; the package has no tab bar.",
};

/** A selector shared by two modules is written to both. */
export const SHARED_SELECTORS = {
  ':is(.kit-cs, .kit-lf) :is(input, textarea):focus-visible': ['company-search', 'list-filter'],
};

/** Words that must never reach this public repository from the source (paths, hosts, internals). */
export const DENYLIST = [
  /\bsrc\//,
  /\bdocs\/web\b/,
  /\bme\.html\b/,
  /\bme\.punji\.app\b/,
  /\bpunji-web\b/,
  /__tests__/,
  /\b[A-Z]\w+\.tsx\b/,
  /\blib\/\w+/,
  /\bkit\.css\b/,
];

/** Lines the barrel adds to Punji's: the adapters' public types. */
export const BARREL_EXTRA = ["export type { LinkComponent, LinkProps } from './internal/link.tsx';"];

/** The total budget for everything at once (the root import). */
export const TOTAL_BUDGET = '10.2 kB';
export const CSS_BUDGET = { styles: '11.2 kB', tokens: '1.15 kB' };
