// Single list of fixtures, shared by the fixture app and the specs.
// `layout` fixtures are also captured at 375, 1024 and 1920; `page` fixtures
// are overlays or full-page layouts, so the whole viewport is captured instead
// of one element.
export interface FixtureMeta {
  id: string;
  title: string;
  layout?: boolean;
  page?: boolean;
}

export const fixtures: readonly FixtureMeta[] = [
  { id: 'button', title: 'Button' },
  { id: 'fields', title: 'Fields' },
  { id: 'select', title: 'Select' },
  { id: 'controls', title: 'Chips, segmented and choice controls' },
  { id: 'checkbox-switch', title: 'Checkbox and Switch' },
  { id: 'tabs', title: 'Tabs' },
  { id: 'card', title: 'Card' },
  { id: 'badges', title: 'Pills, tags, avatars and figures' },
  { id: 'states', title: 'Empty, note, skeleton, locked and confirm' },
  { id: 'rows', title: 'Rows, stats and section headers' },
  { id: 'range-slider', title: 'Range slider' },
  { id: 'table', title: 'DataTable', layout: true },
  { id: 'table-loading', title: 'DataTable loading', layout: true },
  { id: 'table-empty', title: 'DataTable empty', layout: true },
  { id: 'financial', title: 'Financial summary, chart and order book', layout: true },
  { id: 'financial-table', title: 'FinancialTable ready', layout: true },
  { id: 'financial-table-loading', title: 'FinancialTable loading', layout: true },
  { id: 'financial-table-error', title: 'FinancialTable error', layout: true },
  { id: 'financial-table-empty', title: 'FinancialTable empty', layout: true },
  { id: 'calendar', title: 'Calendar' },
  { id: 'date-picker', title: 'DatePicker' },
  { id: 'company-search', title: 'CompanySearch and SymbolField' },
  { id: 'tooltips', title: 'InfoTip and Tooltip' },
  { id: 'shell', title: 'AppShell and page layout', layout: true, page: true },
  { id: 'drawer-screen', title: 'DrawerScreen', page: true },
  { id: 'drawer', title: 'Drawer', page: true },
  { id: 'sheet', title: 'Sheet', page: true },
  { id: 'popover', title: 'Popover', page: true },
  { id: 'command-palette', title: 'CommandPalette', page: true },
  { id: 'toast', title: 'Toasts', page: true },
];

export const themes = ['light', 'dark'] as const;
export type Theme = (typeof themes)[number];
export const fixtureUrl = (id: string, theme: Theme, extra = ''): string => `/?fixture=${id}&theme=${theme}${extra}`;
