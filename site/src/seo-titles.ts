// Search-result titles (<title>, og:title) written by hand for the pages that answer a common search, by slug.
// Every other page gets a generated title (headTitleOf in paths.ts): "<title>: React component for <domain> | Punji UI",
// shortened to fit. Keep each 40 to 62 characters, name Punji UI, say what the page is in the words people
// search with, and never repeat a keyword for its own sake. check:seo enforces the length and uniqueness.
// Registry-free and tiny, because the browser shell imports it through paths.ts.

export const SEO_TITLES: Readonly<Record<string, string>> = {
  // Apps
  'trading-terminal': 'NEPSE trading terminal demo in React: live orders | Punji UI',
  'wealth-dashboard': 'Wealth dashboard in React: portfolio, IPO and goals | Punji UI',
  'market-portal': 'NEPSE market portal in React: screener, floorsheet | Punji UI',
  'retail-banking': 'Retail banking app in React: transfers, cards, KYC | Punji UI',
  'digital-wallet': 'Digital wallet app in React: QR pay, bills, top-up | Punji UI',
  'bill-summary': 'Utility bill summary in React: BillSummary card | Punji UI',
  accounting: 'Accounting app in React: ledger, P&L, bank rec | Punji UI',
  business: 'Invoicing and payroll app in React: VAT bills | Punji UI',
  'invest-insure': 'Mutual fund, SIP and insurance app in React | Punji UI',
  'risk-meter': 'Mutual fund riskometer in React: RiskMeter | Punji UI',
  'invest-helpers': 'XIRR, SIP and lump sum calculators in TypeScript | Punji UI',
  // Get started
  using: 'Install Punji UI: React finance components quick start',
  nextjs: 'Punji UI with the Next.js App Router: setup guide',
  vite: 'Use Punji UI with Vite: React and TypeScript setup',
  theming: 'Theming Punji UI: CSS variables, dark mode, tokens',
  ssr: 'Server rendering and hydration with Punji UI (React)',
  tailwind: 'Using Punji UI with Tailwind CSS: cascade layers',
  'live-data': 'Live market data in React: Punji UI data adapters',
  security: 'Security in Punji UI: CSV formula injection, masking',
  roadmap: 'Punji UI roadmap: shipped, in progress and planned',
  agents: 'Contributing to Punji UI: checks and component bar',
  'copy-a-pattern': 'Copy a finance screen into React with shadcn | Punji UI',
  // Money, Nepal formatting and calendars
  'money-display': 'React money display for NPR, USD and any currency | Punji UI',
  'currency-input': 'React currency input for NPR and any currency | Punji UI',
  formatters: 'Lakh and crore number format in JavaScript | Punji UI',
  'financial-calculations': 'Exact financial calculations in TypeScript | Punji UI',
  'date-picker': 'Nepali date picker for React (Bikram Sambat) | Punji UI',
  'period-selector': 'Fiscal year and period selector for React | Punji UI',
  // Stock market
  'stock-table': 'NEPSE stock table: React quote board component | Punji UI',
  'candlestick-chart': 'React candlestick chart with volume and averages | Punji UI',
  'market-heatmap': 'Stock market heatmap component for React | Punji UI',
  'market-status': 'Market open or closed status for React (NEPSE) | Punji UI',
  'order-book': 'Order book depth component for React | Punji UI',
  // Data and accounting
  'data-table': 'React financial table with sorting and states | Punji UI',
  'ledger-table': 'Accounting ledger component for React | Punji UI',
  'holdings-table': 'React portfolio holdings table with P&L | Punji UI',
};
