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

/** @typedef {{ find: string, replace: string, count?: number }} Edit */
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
  'Card.tsx': { status: 'ship', budget: '420 B' },
  'Checkbox.tsx': { status: 'ship', budget: '400 B' },
  'ChoiceGroup.tsx': { status: 'ship', budget: '430 B' },
  'Controls.tsx': { status: 'ship', budget: '1.2 kB' },
  'Select.tsx': {
    status: 'adapt',
    reason: 'Comment only: the guard test it names lives in Punji.',
    budget: '750 B',
    edits: [
      {
        find: ' * carries the focus ring. Every other raw <select> is a test failure\n * (src/components/kit/__tests__/select.test.tsx).\n',
        replace: ' * carries the focus ring.\n',
      },
    ],
  },
  'ShowMore.tsx': { status: 'ship', budget: '460 B' },
  'StatusPill.tsx': {
    status: 'adapt',
    reason: 'No router dependency: `href` renders <a>, or the `linkComponent` you pass.',
    budget: '470 B',
    edits: [
      { find: "import { Link } from 'react-router-dom';\n", replace: LINK_IMPORT },
      {
        find: "size?: 'sm'; href?: string; testId?: string; className?: string }) {",
        replace: "size?: 'sm'; href?: string; linkComponent?: LinkComponent; testId?: string; className?: string }) {",
      },
      { find: 'size, href, testId, className }:', replace: 'size, href, linkComponent, testId, className }:' },
      {
        find: '  return href ? (\n    <Link className={cls} to={href} data-testid={testId}>\n      {body}\n    </Link>\n  ) : (',
        replace: "  const L = linkComponent && !/^https?:/.test(href ?? '') ? linkComponent : 'a';\n  return href ? (\n    <L className={cls} href={href} data-testid={testId}>\n      {body}\n    </L>\n  ) : (",
      },
    ],
  },
  'Switch.tsx': { status: 'ship', budget: '400 B' },
  'Tabs.tsx': { status: 'ship', budget: '750 B' },
  'format.ts': {
    status: 'adapt',
    reason: 'Types (noUncheckedIndexedAccess: the list lookups say what an empty slot means, never reached) and the parseNumber pattern, linear and capped at 64 characters (the same fix is landing in Punji).',
    budget: '1 kB',
    edits: [
      { find: 'return values[(i + 1 + n) % n];', replace: 'return values[(i + 1 + n) % n] ?? null;' },
      { find: 'return values[(i - 1 + n) % n];', replace: 'return values[(i - 1 + n) % n] ?? null;' },
      { find: "if (key === 'Home') return values[0];", replace: "if (key === 'Home') return values[0] ?? null;" },
      { find: "if (key === 'End') return values[n - 1];", replace: "if (key === 'End') return values[n - 1] ?? null;" },
      // The same numbers, linear and length-capped (CodeQL js/polynomial-redos); the same fix is landing in Punji, then this edit goes.
      { find: "if (!/^-?\\d*\\.?\\d+$|^-?\\d+\\.?$/.test(s)) return Number.NaN;", replace: "if (s.length > 64 || !/^-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)$/.test(s)) return Number.NaN;" },
    ],
  },

  // Planned: inputs and overlays.
  'Fields.tsx': { status: 'pending', reason: 'Inputs pull request.' },
  'CompanySearch.tsx': { status: 'pending', reason: 'Inputs pull request (a general symbol and name finder).' },
  'ListFilter.tsx': { status: 'pending', reason: 'Inputs pull request.' },
  'RangeSlider.tsx': { status: 'pending', reason: 'Inputs pull request.' },
  'InlineConfirm.tsx': { status: 'pending', reason: 'Overlays pull request.' },
  'Overlay.tsx': { status: 'pending', reason: 'Overlays pull request.' },
  'Drawer.tsx': { status: 'pending', reason: 'Overlays pull request.' },
  'CommandPalette.tsx': { status: 'pending', reason: 'Overlays pull request.' },
  'commandKeys.ts': { status: 'pending', reason: 'Overlays pull request (with CommandPalette).' },
  'InfoTip.tsx': { status: 'pending', reason: 'Overlays pull request.' },
  'FloatingTooltip.tsx': { status: 'pending', reason: 'Overlays pull request.' },
  // Planned: data display.
  'Rows.tsx': { status: 'pending', reason: 'Data display pull request (needs the link adapter on ValueRow).' },
  'Stats.tsx': { status: 'pending', reason: 'Data display pull request.' },
  'Figures.tsx': { status: 'pending', reason: 'Data display pull request.' },
  'LiveFigure.tsx': { status: 'pending', reason: 'Data display pull request.' },
  'live.ts': { status: 'pending', reason: 'Data display pull request.' },
  'compact.ts': { status: 'pending', reason: 'Data display pull request.' },
  'Table.tsx': { status: 'pending', reason: 'Data display pull request.' },
  'States.tsx': { status: 'pending', reason: 'Data display pull request.' },
  'Layout.tsx': { status: 'pending', reason: 'Data display pull request (needs the link adapter on PageHeader).' },
  'MonthGrid.tsx': { status: 'pending', reason: 'Reads a Punji data contract and a Punji helper; needs general props before it can ship.' },

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
];

/** Token files, in cascade order: the generated base, the semantic tokens, the kit's theme. */
export const TOKEN_SOURCES = { base: 'src/styles/tokens.generated.css', semantic: 'src/styles/tokens.css', theme: 'src/styles/me-theme.css' };

/** Which module's stylesheet a class belongs to. `base` is shared by every component. */
export const CSS_OWNERS = {
  base: [/^kit-sr$/, /^kit-spin$/],
  button: [/^kit-btn(-ico)?$/],
  card: [/^kit-card(-[ht])?$/],
  checkbox: [/^kit-check(-t|-end)?$/],
  'choice-group': [/^kit-choice(-underline|-compact)?$/],
  controls: [/^kit-chips?$/, /^kit-chip-ico$/, /^kit-seg$/],
  select: [/^kit-sel(-f|-l|-ico)?$/],
  'show-more': [/^kit-more$/],
  'status-pill': [/^kit-pill(-sw)?$/],
  switch: [/^kit-switch$/],
  tabs: [/^kit-tabs$/],
  layout: [/^kit-(page|main|header|header-meta|header-actions|back|circle|section-h|chev|skip)$/],
  rows: [/^kit-(group|rows|value-row|data-row|tile)$/],
  stats: [/^kit-stats?$/],
  'inline-confirm': [/^kit-confirm(-[tb])?$/],
  figures: [/^kit-(fig|up|dn|flat)$/],
  'live-figure': [/^kit-live(-up|-dn)?$/],
  table: [/^kit-table(box)?$/],
  states: [/^kit-(empty|note|tone-ico|skel|skel-text)$/],
  fields: [/^kit-(field|options)$/],
  overlay: [/^kit-(dock|sheet|sheet-back|toasts?)$/],
  'company-search': [/^kit-cs(-.+)?$/],
  'list-filter': [/^kit-lf(-.+)?$/],
  'range-slider': [/^kit-rs(-.+)?$/],
  drawer: [/^kit-drawer(-back)?$/],
  'command-palette': [/^kit-cmd(-.+)?$/],
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
export const TOTAL_BUDGET = '3.4 kB';
export const CSS_BUDGET = { styles: '4.5 kB', tokens: '1.15 kB' };
