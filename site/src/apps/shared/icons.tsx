// Stroke icons for the app navigation (decorative: every nav item has its words).
const Svg = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={d} />
  </svg>
);

export const WatchIcon = () => <Svg d="M3 12h3l3-7 4 14 3-7h5" />;
export const ChartIcon = () => <Svg d="M7 4v16M7 8h-2v6h2M17 6v14M17 9h-2v5h2M12 3v18M12 7h-2v9h2" />;
export const OrdersIcon = () => <Svg d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7" />;
export const PositionsIcon = () => <Svg d="M4 20V10M10 20V4M16 20v-7M22 20H2" />;
export const TradesIcon = () => <Svg d="M7 7h12l-3-3M17 17H5l3 3" />;
export const HomeIcon = () => <Svg d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />;
export const HoldingsIcon = () => <Svg d="M3 6h18M3 12h18M3 18h18M8 3v18" />;
export const DividendIcon = () => <Svg d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3S9.5 10.5 12 11s4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />;
export const IssueIcon = () => <Svg d="M4 7h16v13H4zM8 7V4h8v3M9 13l2 2 4-4" />;
export const TimelineIcon = () => <Svg d="M4 12h16M7 8v8M12 6v12M17 9v6" />;
export const GoalIcon = () => <Svg d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01" />;
export const CommandIcon = () => <Svg d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z" />;
export const PauseIcon = () => <Svg d="M9 5v14M15 5v14" />;
export const PlayIcon = () => <Svg d="M7 5l12 7-12 7z" />;
export const AccountsIcon = () => <Svg d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3l9 5H3z" />;
export const TransferIcon = () => <Svg d="M4 8h14l-4-4M20 16H6l4 4" />;
export const CardIcon = () => <Svg d="M3 6h18v12H3zM3 10h18M7 15h4" />;
export const LoanIcon = () => <Svg d="M4 21V9l8-6 8 6v12M9 21v-6h6v6M12 9v2" />;
export const ProfileIcon = () => <Svg d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />;
export const BellIcon = () => <Svg d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4" />;
export const WalletIcon = () => <Svg d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M16 13.5h2" />;
export const ScanIcon = () => <Svg d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 8h3v3H8zM13 13h3v3h-3zM13 8h3M8 16h3" />;
export const SendIcon = () => <Svg d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />;
export const BillIcon = () => <Svg d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" />;
export const GiftIcon = () => <Svg d="M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1" />;
export const HistoryIcon = () => <Svg d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" />;
export const EyeOffIcon = () => <Svg d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3 3.5M6.6 6.6C4.3 8.1 3 12 3 12s4 6 9 6c1.4 0 2.7-.4 3.9-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />;
