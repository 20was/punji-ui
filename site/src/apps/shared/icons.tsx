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
