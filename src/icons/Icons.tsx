/*
 * GENERATED once from punji-web's icon copies, then maintained by hand. Each glyph is its own function declaration so a
 * bundler keeps only the ones a page imports. Do not add side effects at module level: the size-limit entry
 * "icons: one icon" relies on it.
 */
import type { ReactElement, ReactNode } from 'react';

/** The icon scale. A control is 32/36/44 px; an icon beside text is 16/20/24 px. */
export type IconSize = 'sm' | 'md' | 'lg';

export interface IconProps {
  /**
   * `sm` 16, `md` 20 (default), `lg` 24 px. A number is a px side, accepted so call sites that came from punji-web
   * (`size={16}`) move over unchanged.
   */
  size?: IconSize | number;
  /** The icon's accessible name. Without it the icon is decorative (`aria-hidden`); with it, `role="img"`. */
  label?: string;
  /** Extra class on the `<svg>`. */
  className?: string;
  /** Overrides the stroke width (in the icon's own grid units) where a component draws the glyph heavier or lighter. */
  strokeWidth?: number;
}

const PX: Record<IconSize, number> = { sm: 16, md: 20, lg: 24 };

function Svg({ size = 'md', label, className, strokeWidth, grid, stroke, children }: IconProps & { grid: number; stroke: number; children: ReactNode }) {
  const px = typeof size === 'number' ? size : PX[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${grid} ${grid}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** `chart-line` (20 grid, stroke 1.6). */
export function IconChartLine(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <polyline points="2,14 7,9 11,12 18,4" /><polyline points="14,4 18,4 18,8" />
    </Svg>
  );
}

/** `wallet` (20 grid, stroke 1.6). */
export function IconWallet(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <rect x="2" y="5" width="16" height="12" rx="2" /><path d="M2 9h16" /><circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** `bell` (20 grid, stroke 1.6). */
export function IconBell(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M10 2a6 6 0 0 1 6 6v3l1.5 2.5H2.5L4 11V8a6 6 0 0 1 6-6z" /><path d="M8.5 16.5a1.5 1.5 0 0 0 3 0" />
    </Svg>
  );
}

/** `shield-lock` (20 grid, stroke 1.6). */
export function IconShieldLock(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M10 2L3 5v5c0 4 3.1 7.3 7 8 3.9-.7 7-4 7-8V5L10 2z" /><rect x="7.5" y="9" width="5" height="4" rx="1" /><path d="M10 7v2" />
    </Svg>
  );
}

/** `receipt` (20 grid, stroke 1.6). */
export function IconReceipt(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M5 2h10v16l-2-1.5L11 18l-1-1.5L9 18l-1.5-1.5L6 18l-2-1.5V2z" /><line x1="8" y1="7" x2="12" y2="7" /><line x1="8" y1="10" x2="12" y2="10" /><line x1="8" y1="13" x2="10" y2="13" />
    </Svg>
  );
}

/** `users` (20 grid, stroke 1.6). */
export function IconUsers(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <circle cx="8" cy="7" r="3" /><path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="15" cy="7" r="2.5" /><path d="M18 17c0-2.7-1.6-5-4-5.8" />
    </Svg>
  );
}

/** `funnel` (20 grid, stroke 1.6). */
export function IconFunnel(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M2 4h16l-6 7v7l-4-2V11L2 4z" />
    </Svg>
  );
}

/** `rows` (20 grid, stroke 1.6). */
export function IconRows(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <line x1="3" y1="6" x2="17" y2="6" /><line x1="3" y1="10" x2="17" y2="10" /><line x1="3" y1="14" x2="17" y2="14" />
    </Svg>
  );
}

/** `trophy` (20 grid, stroke 1.6). */
export function IconTrophy(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M5 2h10v6a5 5 0 0 1-10 0V2z" /><path d="M5 5H3a2 2 0 0 0 2 2" /><path d="M15 5h2a2 2 0 0 1-2 2" /><line x1="10" y1="13" x2="10" y2="17" /><line x1="7" y1="17" x2="13" y2="17" />
    </Svg>
  );
}

/** `ticket` (20 grid, stroke 1.6). */
export function IconTicket(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <rect x="2" y="6" width="16" height="8" rx="1" /><line x1="2" y1="10" x2="5" y2="10" strokeDasharray="2 2" /><line x1="15" y1="10" x2="18" y2="10" strokeDasharray="2 2" /><line x1="9" y1="8" x2="9" y2="12" /><line x1="11" y1="8" x2="11" y2="12" />
    </Svg>
  );
}

/** `calculator-keys` (20 grid, stroke 1.6). */
export function IconCalculator(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <rect x="4" y="2" width="12" height="16" rx="2" /><line x1="8" y1="6" x2="12" y2="6" /><line x1="8" y1="10" x2="8" y2="10" strokeWidth="2.5" strokeLinecap="round" /><line x1="10" y1="10" x2="10" y2="10" strokeWidth="2.5" strokeLinecap="round" /><line x1="12" y1="10" x2="12" y2="10" strokeWidth="2.5" strokeLinecap="round" /><line x1="8" y1="13" x2="8" y2="13" strokeWidth="2.5" strokeLinecap="round" /><line x1="10" y1="13" x2="10" y2="13" strokeWidth="2.5" strokeLinecap="round" /><line x1="12" y1="13" x2="12" y2="13" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

/** `scales` (20 grid, stroke 1.6). */
export function IconScales(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <line x1="10" y1="2" x2="10" y2="18" /><line x1="6" y1="18" x2="14" y2="18" /><path d="M4 6l-3 5h6L4 6z" /><path d="M16 6l-3 5h6L16 6z" /><line x1="4" y1="6" x2="16" y2="6" />
    </Svg>
  );
}

/** `grid` (20 grid, stroke 1.6). */
export function IconGrid(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <rect x="2" y="2" width="7" height="7" rx="1" /><rect x="11" y="2" width="7" height="7" rx="1" /><rect x="2" y="11" width="7" height="7" rx="1" /><rect x="11" y="11" width="7" height="7" rx="1" />
    </Svg>
  );
}

/** `globe` (20 grid, stroke 1.6). */
export function IconGlobe(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <circle cx="10" cy="10" r="8" /><ellipse cx="10" cy="10" rx="3.5" ry="8" /><line x1="2" y1="10" x2="18" y2="10" />
    </Svg>
  );
}

/** `device-lock` (20 grid, stroke 1.6). */
export function IconDeviceLock(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <rect x="5" y="2" width="10" height="16" rx="2" /><line x1="5" y1="14" x2="15" y2="14" /><circle cx="10" cy="16.5" r="0.8" fill="currentColor" stroke="none" /><rect x="7.5" y="6.5" width="5" height="3.5" rx="1" /><path d="M10 5v1.5" />
    </Svg>
  );
}

/** `sparkle` (20 grid, stroke 1.6). */
export function IconSparkle(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" /><path d="M16 14l0.8 2.2L19 17l-2.2.8L16 20l-.8-2.2L13 17l2.2-.8L16 14z" />
    </Svg>
  );
}

/** `clock` (20 grid, stroke 1.6). */
export function IconClock(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <circle cx="10" cy="10" r="8" /><polyline points="10,5 10,10 14,12" />
    </Svg>
  );
}

/** `check` (20 grid, stroke 1.6). */
export function IconCheck(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <polyline points="3,10 8,15 17,5" />
    </Svg>
  );
}

/** `lucide-hand-coins` (24 grid, stroke 2). */
export function LucideHandCoins(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" /><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" /><path d="m2 16 6 6" /><circle cx="16" cy="9" r="2.9" /><circle cx="6" cy="5" r="3" />
    </Svg>
  );
}

/** `lucide-shield-check` (24 grid, stroke 2). */
export function LucideShieldCheck(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

/** `lucide-trending-up` (24 grid, stroke 2). */
export function LucideTrendingUp(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </Svg>
  );
}

/** `lucide-chart-column-increasing` (24 grid, stroke 2). */
export function LucideChartColumnIncreasing(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M13 17V9" /><path d="M18 17V5" /><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M8 17v-3" />
    </Svg>
  );
}

/** `lucide-umbrella` (24 grid, stroke 2). */
export function LucideUmbrella(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M22 12a10.06 10.06 1 0 0-20 0Z" /><path d="M12 12v8a2 2 0 0 0 4 0" /><path d="M12 2v1" />
    </Svg>
  );
}

/** `lucide-percent` (24 grid, stroke 2). */
export function LucidePercent(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <line x1="19" x2="5" y1="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
    </Svg>
  );
}

/** `lucide-landmark` (24 grid, stroke 2). */
export function LucideLandmark(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7" />
    </Svg>
  );
}

/** `lucide-message-square-text` (24 grid, stroke 2). */
export function LucideMessageSquareText(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M13 8H7" /><path d="M17 12H7" />
    </Svg>
  );
}

/** `lucide-scale` (24 grid, stroke 2). */
export function LucideScale(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </Svg>
  );
}

/** `lucide-table` (24 grid, stroke 2). */
export function LucideTable(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M12 3v18" /><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" />
    </Svg>
  );
}

/** `lucide-circle-check` (24 grid, stroke 2). */
export function LucideCircleCheck(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

/** `lucide-triangle-alert` (24 grid, stroke 2). */
export function LucideTriangleAlert(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </Svg>
  );
}

/** `lucide-octagon-x` (24 grid, stroke 2). */
export function LucideOctagonX(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="m15 9-6 6" /><path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" /><path d="m9 9 6 6" />
    </Svg>
  );
}

/** `lucide-chevron-right` (24 grid, stroke 2). */
export function LucideChevronRight(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  );
}

/** `lucide-info` (24 grid, stroke 2). */
export function LucideInfo(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </Svg>
  );
}

/** `lucide-x` (24 grid, stroke 2). */
export function LucideX(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </Svg>
  );
}

/** `lucide-wallet` (24 grid, stroke 2). */
export function LucideWallet(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </Svg>
  );
}

/** `lucide-link` (24 grid, stroke 2). */
export function LucideLink(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Svg>
  );
}

/** `lucide-sparkles` (24 grid, stroke 2). */
export function LucideSparkles(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" />
    </Svg>
  );
}

/** `lucide-check` (24 grid, stroke 2). */
export function LucideCheck(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

/** `lucide-eye` (24 grid, stroke 2). */
export function LucideEye(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" /><circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

/** `lucide-star` (24 grid, stroke 2). */
export function LucideStar(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M11.53 2.3a.53.53 0 0 1 .95 0l2.31 4.68a2.12 2.12 0 0 0 1.6 1.16l5.16.76a.53.53 0 0 1 .3.9l-3.74 3.64a2.12 2.12 0 0 0-.61 1.88l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21.01a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .3-.9l5.16-.76a2.12 2.12 0 0 0 1.6-1.16z" />
    </Svg>
  );
}

/** `lucide-bell` (24 grid, stroke 2). */
export function LucideBell(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M10.27 21a2 2 0 0 0 3.46 0" /><path d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33" />
    </Svg>
  );
}

/** `lucide-search` (24 grid, stroke 2). */
export function LucideSearch(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />
    </Svg>
  );
}

/** `lucide-file-text` (24 grid, stroke 2). */
export function LucideFileText(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
    </Svg>
  );
}

/** `lucide-droplet` (24 grid, stroke 2). */
export function LucideDroplet(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </Svg>
  );
}

/** `lucide-factory` (24 grid, stroke 2). */
export function LucideFactory(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M12 16h.01" /><path d="M16 16h.01" /><path d="M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.77-.42l-4.46 2.84a.5.5 0 0 1-.77-.42V8.5a.5.5 0 0 0-.77-.42L9.77 10.92A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" /><path d="M8 16h.01" />
    </Svg>
  );
}

/** `lucide-shield` (24 grid, stroke 2). */
export function LucideShield(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </Svg>
  );
}

/** `lucide-refresh-cw` (24 grid, stroke 2). */
export function LucideRefreshCw(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />
    </Svg>
  );
}

/** `lucide-lock` (24 grid, stroke 2). */
export function LucideLock(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

/** `lucide-briefcase` (24 grid, stroke 2). */
export function LucideBriefcase(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" />
    </Svg>
  );
}

/** `lucide-calendar` (24 grid, stroke 2). */
export function LucideCalendar(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
    </Svg>
  );
}

/** `markets` (24 grid, stroke 1.8). */
export function IconMarkets(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
    </Svg>
  );
}

/** `portfolio` (24 grid, stroke 1.8). */
export function IconPortfolio(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 19V9M10 19V5M16 19v-7M21 19H3" />
    </Svg>
  );
}

/** `watchlist` (24 grid, stroke 1.8). */
export function IconWatchlist(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M12 4.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 16.3l-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z" />
    </Svg>
  );
}

/** `alerts` (24 grid, stroke 1.8). */
export function IconAlerts(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0" />
    </Svg>
  );
}

/** `more` (24 grid, stroke 3). */
export function IconMore(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={3}>
      <path d="M5 12h.01M12 12h.01M19 12h.01" />
    </Svg>
  );
}

/** `home` (24 grid, stroke 1.8). */
export function IconHome(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-4.5v-6h-5v6H5a1 1 0 01-1-1z" />
    </Svg>
  );
}

/** `settings` (24 grid, stroke 1.8). */
export function IconSettings(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 01-2.1 1.2L14.7 21h-4l-.3-2.4a7 7 0 01-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 010-2.4L4.4 9.9l2-3.4 1.9.7a7 7 0 012.1-1.2L10.7 3h4l.3 2.4a7 7 0 012.1 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 010 2.4z" />
    </Svg>
  );
}

/** `sun` (24 grid, stroke 1.8). */
export function IconSun(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

/** `moon` (24 grid, stroke 1.8). */
export function IconMoon(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
    </Svg>
  );
}

/** `lang` (24 grid, stroke 1.8). */
export function IconLang(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M3 5h10M8 3v2M5 5c1 4 4 7 7 8M11 5c-1 4-4 7-7 8M13 21l4-9 4 9M14.5 18h5" />
    </Svg>
  );
}

/** `out` (24 grid, stroke 1.8). */
export function IconOut(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h11" />
    </Svg>
  );
}

/** `chev` (24 grid, stroke 1.8). */
export function IconChev(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

/** `close` (24 grid, stroke 1.8). */
export function IconClose(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

/** `fundamentals` (24 grid, stroke 1.8). */
export function IconFundamentals(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M3 9.5L12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
    </Svg>
  );
}

/** `dividends` (24 grid, stroke 1.8). */
export function IconDividends(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M12 3c3.9 0 7 1.3 7 3s-3.1 3-7 3-7-1.3-7-3 3.1-3 7-3zM5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </Svg>
  );
}

/** `screener` (24 grid, stroke 1.8). */
export function IconScreener(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 5h16l-6 7.5V18l-4 2v-7.5z" />
    </Svg>
  );
}

/** `signals` (24 grid, stroke 1.8). */
export function IconSignals(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M3 12h4l3-7 4 14 3-7h4" />
    </Svg>
  );
}

/** `chat` (24 grid, stroke 1.8). */
export function IconChat(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 5h16v11H9l-5 4z" />
    </Svg>
  );
}

/** `ext` (24 grid, stroke 1.8). */
export function IconExt(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Svg>
  );
}

/** `chevDown` (24 grid, stroke 1.8). */
export function IconChevDown(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

/** `seasonality` (24 grid, stroke 1.8). */
export function IconSeasonality(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 6h16v14H4zM4 10h16M8 4v4M16 4v4M8 14h2M12 14h2M16 14h2" />
    </Svg>
  );
}

/** `chart` (24 grid, stroke 1.8). */
export function IconChart(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M7 3v3M7 17v4M5 6h4v11H5zM17 3v5M17 15v6M15 8h4v7h-4z" />
    </Svg>
  );
}

/** `backtest` (24 grid, stroke 1.8). */
export function IconBacktest(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3M3 4v5h5M12 8v4l3 2" />
    </Svg>
  );
}

/** `heatmap` (24 grid, stroke 1.8). */
export function IconHeatmap(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </Svg>
  );
}

/** `sectors` (24 grid, stroke 1.8). */
export function IconSectors(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M12 3a9 9 0 109 9h-9zM14 2.5a9 9 0 017.5 7.5H14z" />
    </Svg>
  );
}

/** `ipo` (24 grid, stroke 1.8). */
export function IconIpo(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M12 3c3 2.5 4.5 6 4.5 10l-1.5 2h-6L7.5 13C7.5 9 9 5.5 12 3zM9.5 14.5L6 17l1-4.5M14.5 14.5L18 17l-1-4.5M12 10h.01M10.5 19.5c0 1 .7 1.5 1.5 1.5s1.5-.5 1.5-1.5" />
    </Svg>
  );
}

/** `brokers` (24 grid, stroke 1.8). */
export function IconBrokers(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M9 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 20a6 6 0 0112 0M16 5.5a3 3 0 010 6M21 20a5 5 0 00-4-5" />
    </Svg>
  );
}

/** `compare` (24 grid, stroke 1.8). */
export function IconCompare(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M8 3v18M16 3v18M4 7l4-4 4 4M20 17l-4 4-4-4" />
    </Svg>
  );
}

/** `calculator` (24 grid, stroke 1.8). */
export function IconCalculatorNav(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM8 6h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" />
    </Svg>
  );
}

/** `tax` (24 grid, stroke 1.8). */
export function IconTax(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" />
    </Svg>
  );
}

/** `family` (24 grid, stroke 1.8). */
export function IconFamily(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM2 20a6 6 0 0112 0M16 11a3 3 0 100-6M22 20a6 6 0 00-5-5.9" />
    </Svg>
  );
}

/** `inbox` (24 grid, stroke 1.8). */
export function IconInbox(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M3 13l2.5-8h13L21 13v6H3zM3 13h5l1.5 3h5L16 13h5" />
    </Svg>
  );
}

/** `gift` (24 grid, stroke 1.8). */
export function IconGift(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 11h16v10H4zM2 7h20v4H2zM12 7v14M12 7c-2 0-4-1-4-3s3-2 4 3c1-5 4-5 4-3s-2 3-4 3" />
    </Svg>
  );
}

/** `levels` (24 grid, stroke 1.8). */
export function IconLevels(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 6h8M4 10h12M4 14h6M4 18h14M20 4v16" />
    </Svg>
  );
}

/** `analytics` (24 grid, stroke 1.8). */
export function IconAnalytics(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 16a8 8 0 1116 0M12 16l4-5M12 16h.01M4 20h16" />
    </Svg>
  );
}

/** `plan` (24 grid, stroke 1.8). */
export function IconPlan(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 16.7 6.6 19.6l1.2-6L3.3 9.4l6.1-.8z" />
    </Svg>
  );
}

/** `pin` (24 grid, stroke 1.8). */
export function IconPin(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v8" />
    </Svg>
  );
}

/** `lock` (24 grid, stroke 1.8). */
export function IconLock(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M6 11h12v10H6zM8 11V7a4 4 0 118 0v4" />
    </Svg>
  );
}

/** `eyeOff` (24 grid, stroke 1.8). */
export function IconEyeOff(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10 10 0 0121 12a16 16 0 01-2.4 3M6.6 6.6A16 16 0 003 12s3.5 6 9 6a9.7 9.7 0 003.4-.6" />
    </Svg>
  );
}

/** `setting-mail` (20 grid, stroke 1.6). */
export function IconSettingMail(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M3 5.5h14v9H3zM3.5 6l6.5 5 6.5-5" />
    </Svg>
  );
}

/** `setting-moon` (20 grid, stroke 1.6). */
export function IconSettingMoon(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M16 11.6A6.5 6.5 0 018.4 4a6.5 6.5 0 107.6 7.6z" />
    </Svg>
  );
}

/** `setting-globe` (20 grid, stroke 1.6). */
export function IconSettingGlobe(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <circle cx="10" cy="10" r="7" /><path d="M3 10h14M10 3c2 2.2 2.8 4.5 2.8 7s-.8 4.8-2.8 7c-2-2.2-2.8-4.5-2.8-7S8 5.2 10 3z" />
    </Svg>
  );
}

/** `setting-bell` (20 grid, stroke 1.6). */
export function IconSettingBell(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M5.5 13.5V9a4.5 4.5 0 119 0v4.5l1.2 1.5H4.3zM8.5 17a1.6 1.6 0 003 0" />
    </Svg>
  );
}

/** `setting-calendar` (20 grid, stroke 1.6). */
export function IconSettingCalendar(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M3.5 5h13v11.5h-13zM3.5 8.5h13M7 3v3.5M13 3v3.5" />
    </Svg>
  );
}

/** `setting-out` (20 grid, stroke 1.6). */
export function IconSettingOut(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M12.5 3.5h2.5a1.5 1.5 0 011.5 1.5v10a1.5 1.5 0 01-1.5 1.5h-2.5M8.5 14l-4-4 4-4M4.5 10h9" />
    </Svg>
  );
}

/** `setting-shield` (20 grid, stroke 1.6). */
export function IconSettingShield(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M10 2.8l6 2.4v4.4c0 3.6-2.5 6.3-6 7.6-3.5-1.3-6-4-6-7.6V5.2z" />
    </Svg>
  );
}

/** `setting-download` (20 grid, stroke 1.6). */
export function IconSettingDownload(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M10 3.5v9M6 8.5l4 4 4-4M4 16h12" />
    </Svg>
  );
}

/** `setting-trash` (20 grid, stroke 1.6). */
export function IconSettingTrash(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M4 6h12M8 6V4h4v2M5.5 6l.8 10h7.4l.8-10M8.5 9v4.5M11.5 9v4.5" />
    </Svg>
  );
}

/** `setting-chat` (20 grid, stroke 1.6). */
export function IconSettingChat(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M3.5 4.5h13v9h-8l-5 3.5z" />
    </Svg>
  );
}

/** `setting-people` (20 grid, stroke 1.6). */
export function IconSettingPeople(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <circle cx="7.5" cy="7" r="2.8" /><path d="M2.5 16.5c.6-2.8 2.6-4.3 5-4.3s4.4 1.5 5 4.3M12.8 4.6a2.6 2.6 0 010 5M14.5 12.4c1.6.5 2.6 1.9 3 4.1" />
    </Svg>
  );
}

/** `setting-lock` (20 grid, stroke 1.6). */
export function IconSettingLock(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M5 9h10v8H5zM7 9V6.5a3 3 0 016 0V9" />
    </Svg>
  );
}

/** `setting-check` (20 grid, stroke 1.6). */
export function IconSettingCheck(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </Svg>
  );
}

/** `setting-alert` (20 grid, stroke 1.6). */
export function IconSettingAlert(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M10 3l7.5 13.5h-15zM10 8v3.5M10 14h.01" />
    </Svg>
  );
}

/** `setting-eye-off` (20 grid, stroke 1.6). */
export function IconSettingEyeOff(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={20} stroke={1.6}>
      <path d="M3 3l14 14M8.3 8.3a2.4 2.4 0 003.4 3.4M6.3 5.3A8 8 0 0117.5 10a12 12 0 01-1.9 2.4M4 7a12 12 0 00-1.5 3s2.8 5 7.5 5a7 7 0 002.7-.5" />
    </Svg>
  );
}

/** `site-today` (24 grid, stroke 1.75). */
export function IconSiteToday(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M3 12h4l3-8 4 16 3-8h4"/>
    </Svg>
  );
}

/** `site-heatmap` (24 grid, stroke 1.75). */
export function IconSiteHeatmap(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M3 3h10v10H3zM15 3h6v6h-6zM15 11h6v10h-6zM3 15h10v6H3z"/>
    </Svg>
  );
}

/** `site-screener` (24 grid, stroke 1.75). */
export function IconSiteScreener(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M3 5h18M6 12h12M10 19h4"/>
    </Svg>
  );
}

/** `site-compare` (24 grid, stroke 1.75). */
export function IconSiteCompare(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M8 3v18M16 3v18M3 8l5-5 5 5M11 16l5 5 5-5"/>
    </Svg>
  );
}

/** `site-stocks` (24 grid, stroke 1.75). */
export function IconSiteStocks(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>
    </Svg>
  );
}

/** `site-floorsheet` (24 grid, stroke 1.75). */
export function IconSiteFloorsheet(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M4 3h16v18H4zM4 9h16M4 15h16M10 9v12"/>
    </Svg>
  );
}

/** `site-brokers` (24 grid, stroke 1.75). */
export function IconSiteBrokers(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M2 10l10-7 10 7z"/>
    </Svg>
  );
}

/** `site-dividends` (24 grid, stroke 1.75). */
export function IconSiteDividends(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M12 3v18M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H6"/>
    </Svg>
  );
}

/** `site-forex` (24 grid, stroke 1.75). */
export function IconSiteForex(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M4 8h13l-4-4M20 16H7l4 4"/>
    </Svg>
  );
}

/** `site-gold` (24 grid, stroke 1.75). */
export function IconSiteGold(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M7 7h10l4 12H3zM9 7l1-4h4l1 4"/>
    </Svg>
  );
}

/** `site-portfolio` (24 grid, stroke 1.75). */
export function IconSitePortfolio(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M12 3a9 9 0 109 9h-9zM15 3.5A9 9 0 0120.5 9H15z"/>
    </Svg>
  );
}

/** `site-calculator` (24 grid, stroke 1.75). */
export function IconSiteCalculator(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M5 3h14v18H5zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>
    </Svg>
  );
}

/** `site-ipo` (24 grid, stroke 1.75). */
export function IconSiteIpo(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M4 7h16v4a2 2 0 000 4v4H4v-4a2 2 0 000-4zM10 12l2 2 4-4"/>
    </Svg>
  );
}

/** `site-practice` (24 grid, stroke 1.75). */
export function IconSitePractice(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M12 3a9 9 0 110 18 9 9 0 010-18zM10 8.5l5 3.5-5 3.5z"/>
    </Svg>
  );
}

/** `site-guide` (24 grid, stroke 1.75). */
export function IconSiteGuide(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M2 5h6a4 4 0 014 4v12a3 3 0 00-3-3H2zM22 5h-6a4 4 0 00-4 4v12a3 3 0 013-3h7z"/>
    </Svg>
  );
}

/** `site-features` (24 grid, stroke 1.75). */
export function IconSiteFeatures(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M7 2h10v20H7zM11 18h2"/>
    </Svg>
  );
}

/** `site-steps` (24 grid, stroke 1.75). */
export function IconSiteSteps(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M4 6h4v4H4zM10 8h10M4 14h4v4H4zM10 16h10"/>
    </Svg>
  );
}

/** `site-search` (24 grid, stroke 1.75). */
export function IconSiteSearch(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M11 4a7 7 0 110 14 7 7 0 010-14zM20 20l-4-4"/>
    </Svg>
  );
}

/** `site-enter` (24 grid, stroke 1.75). */
export function IconSiteEnter(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M20 5v6a3 3 0 01-3 3H5M9 10l-4 4 4 4"/>
    </Svg>
  );
}

/** `site-recent` (24 grid, stroke 1.75). */
export function IconSiteRecent(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M12 3a9 9 0 110 18 9 9 0 010-18zM12 7v5l3 2"/>
    </Svg>
  );
}

/** `site-seasonality` (24 grid, stroke 1.75). */
export function IconSiteSeasonality(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M4 6h16v14H4zM4 10h16M8 4v4M16 4v4M8 14h2M12 14h2M16 14h2"/>
    </Svg>
  );
}

/** `site-lock` (24 grid, stroke 1.75). */
export function IconSiteLock(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M6 11h12v10H6zM8 11V7a4 4 0 018 0v4"/>
    </Svg>
  );
}

/** `site-globe` (24 grid, stroke 1.75). */
export function IconSiteGlobe(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M12 3a9 9 0 110 18 9 9 0 010-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>
    </Svg>
  );
}

/** `site-chat` (24 grid, stroke 1.75). */
export function IconSiteChat(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M4 5h16v11H10l-5 4v-4H4z"/>
    </Svg>
  );
}

/** `site-bell` (24 grid, stroke 1.75). */
export function IconSiteBell(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4"/>
    </Svg>
  );
}

/** `site-shield` (24 grid, stroke 1.75). */
export function IconSiteShield(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4"/>
    </Svg>
  );
}

/** `site-free` (24 grid, stroke 1.75). */
export function IconSiteFree(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M20 12l-8 8-9-9V3h8zM7.5 7.5h.01"/>
    </Svg>
  );
}

/** `site-check` (24 grid, stroke 1.75). */
export function IconSiteCheck(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M5 12l5 5 9-10"/>
    </Svg>
  );
}

/** `site-family` (24 grid, stroke 1.75). */
export function IconSiteFamily(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>
    </Svg>
  );
}

/** `site-import` (24 grid, stroke 1.75). */
export function IconSiteImport(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M12 3v12M7 10l5 5 5-5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>
    </Svg>
  );
}

/** `site-web` (24 grid, stroke 1.75). */
export function IconSiteWeb(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>
    </Svg>
  );
}

/** `site-watch` (24 grid, stroke 1.75). */
export function IconSiteWatch(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.75}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>
    </Svg>
  );
}

/** `notice-warn` (18 grid, stroke 1.7). */
export function IconNoticeWarn(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={18} stroke={1.7}>
      <path d="M9 2.5l7 12.5H2zM9 7.5v3M9 12.6v.1" />
    </Svg>
  );
}

/** `notice-info` (18 grid, stroke 1.7). */
export function IconNoticeInfo(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={18} stroke={1.7}>
      <path d="M9 8.2V13M9 5.3v.1M9 1.8a7.2 7.2 0 100 14.4A7.2 7.2 0 009 1.8z" />
    </Svg>
  );
}

/** `notice-gift` (18 grid, stroke 1.6). */
export function IconNoticeGift(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={18} stroke={1.6}>
      <rect x="2.5" y="6.5" width="13" height="9" rx="1.5" /><path d="M1.5 4h15v2.5h-15zM9 4v11.5M9 4C7.5 1.5 4.5 2 5.5 4M9 4c1.5-2.5 4.5-2 3.5 0" />
    </Svg>
  );
}

/** `notice-cash` (18 grid, stroke 1.6). */
export function IconNoticeCash(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={18} stroke={1.6}>
      <rect x="1.5" y="4.5" width="15" height="9" rx="1.5" /><circle cx="9" cy="9" r="2" /><path d="M4.5 7v4M13.5 7v4" />
    </Svg>
  );
}

/** `notice-rights` (18 grid, stroke 1.6). */
export function IconNoticeRights(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={18} stroke={1.6}>
      <path d="M5 3v12M2.5 5.5L5 3l2.5 2.5M13 15V3M10.5 12.5L13 15l2.5-2.5" />
    </Svg>
  );
}

/** `notice-done` (18 grid, stroke 1.6). */
export function IconNoticeDone(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={18} stroke={1.6}>
      <path d="M4 9.5l3.2 3.2L14 5.5" />
    </Svg>
  );
}

/** `close-sm` (14 grid, stroke 1.6). */
export function IconCloseSm(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={14} stroke={1.6}>
      <path d="M3 3l8 8M11 3l-8 8" />
    </Svg>
  );
}

/** `chev-left` (24 grid, stroke 2). */
export function IconChevLeft(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={2}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

/** `calendar` (24 grid, stroke 1.8). */
export function IconCalendar(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 6.5h16v13.5H4zM4 10.5h16M8.5 4v4M15.5 4v4" />
    </Svg>
  );
}

/** `plus` (24 grid, stroke 1.8). */
export function IconPlus(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

/** `trendDown` (24 grid, stroke 1.8). */
export function IconTrendDown(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M3 7l6 6 4-4 8 8M15 17h6v-6" />
    </Svg>
  );
}

/** `info` (24 grid, stroke 1.8). */
export function IconInfo(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v5M12 7.5h.01" />
    </Svg>
  );
}

/** `percent` (24 grid, stroke 1.8). */
export function IconPercent(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M19 5L5 19M7.5 9.5a2 2 0 100-4 2 2 0 000 4zM16.5 18.5a2 2 0 100-4 2 2 0 000 4z" />
    </Svg>
  );
}

/** `inbox-ticket` (24 grid, stroke 1.8). */
export function IconInboxTicket(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 7h16v3a2 2 0 000 4v3H4v-3a2 2 0 000-4zM14 7v10" />
    </Svg>
  );
}

/** `news` (24 grid, stroke 1.8). */
export function IconNews(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M5 5h11v14H6a1 1 0 01-1-1zM16 9h3v9a1 1 0 01-1 1h-2M8 9h5M8 12.5h5M8 16h3" />
    </Svg>
  );
}

/** `inbox-gift` (24 grid, stroke 1.8). */
export function IconInboxGift(p: IconProps): ReactElement {
  return (
    <Svg {...p} grid={24} stroke={1.8}>
      <path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3-5 0M12 7c1.5-3 5-3 5 0" />
    </Svg>
  );
}

/** Every glyph's name. Web's names are kept; where two web sets drew different glyphs under one name, the later set's name is prefixed (see ICON_ALIASES and the docs page). */
export type GlyphName =
  | 'chart-line'
  | 'wallet'
  | 'bell'
  | 'shield-lock'
  | 'receipt'
  | 'users'
  | 'funnel'
  | 'rows'
  | 'trophy'
  | 'ticket'
  | 'calculator-keys'
  | 'scales'
  | 'grid'
  | 'globe'
  | 'device-lock'
  | 'sparkle'
  | 'clock'
  | 'check'
  | 'lucide-hand-coins'
  | 'lucide-shield-check'
  | 'lucide-trending-up'
  | 'lucide-chart-column-increasing'
  | 'lucide-umbrella'
  | 'lucide-percent'
  | 'lucide-landmark'
  | 'lucide-message-square-text'
  | 'lucide-scale'
  | 'lucide-table'
  | 'lucide-circle-check'
  | 'lucide-triangle-alert'
  | 'lucide-octagon-x'
  | 'lucide-chevron-right'
  | 'lucide-info'
  | 'lucide-x'
  | 'lucide-wallet'
  | 'lucide-link'
  | 'lucide-sparkles'
  | 'lucide-check'
  | 'lucide-eye'
  | 'lucide-star'
  | 'lucide-bell'
  | 'lucide-search'
  | 'lucide-file-text'
  | 'lucide-droplet'
  | 'lucide-factory'
  | 'lucide-shield'
  | 'lucide-refresh-cw'
  | 'lucide-lock'
  | 'lucide-briefcase'
  | 'lucide-calendar'
  | 'markets'
  | 'portfolio'
  | 'watchlist'
  | 'alerts'
  | 'more'
  | 'home'
  | 'settings'
  | 'sun'
  | 'moon'
  | 'lang'
  | 'out'
  | 'chev'
  | 'close'
  | 'fundamentals'
  | 'dividends'
  | 'screener'
  | 'signals'
  | 'chat'
  | 'ext'
  | 'chevDown'
  | 'seasonality'
  | 'chart'
  | 'backtest'
  | 'heatmap'
  | 'sectors'
  | 'ipo'
  | 'brokers'
  | 'compare'
  | 'calculator'
  | 'tax'
  | 'family'
  | 'inbox'
  | 'gift'
  | 'levels'
  | 'analytics'
  | 'plan'
  | 'pin'
  | 'lock'
  | 'eyeOff'
  | 'setting-mail'
  | 'setting-moon'
  | 'setting-globe'
  | 'setting-bell'
  | 'setting-calendar'
  | 'setting-out'
  | 'setting-shield'
  | 'setting-download'
  | 'setting-trash'
  | 'setting-chat'
  | 'setting-people'
  | 'setting-lock'
  | 'setting-check'
  | 'setting-alert'
  | 'setting-eye-off'
  | 'site-today'
  | 'site-heatmap'
  | 'site-screener'
  | 'site-compare'
  | 'site-stocks'
  | 'site-floorsheet'
  | 'site-brokers'
  | 'site-dividends'
  | 'site-forex'
  | 'site-gold'
  | 'site-portfolio'
  | 'site-calculator'
  | 'site-ipo'
  | 'site-practice'
  | 'site-guide'
  | 'site-features'
  | 'site-steps'
  | 'site-search'
  | 'site-enter'
  | 'site-recent'
  | 'site-seasonality'
  | 'site-lock'
  | 'site-globe'
  | 'site-chat'
  | 'site-bell'
  | 'site-shield'
  | 'site-free'
  | 'site-check'
  | 'site-family'
  | 'site-import'
  | 'site-web'
  | 'site-watch'
  | 'notice-warn'
  | 'notice-info'
  | 'notice-gift'
  | 'notice-cash'
  | 'notice-rights'
  | 'notice-done'
  | 'close-sm'
  | 'chev-left'
  | 'calendar'
  | 'plus'
  | 'trendDown'
  | 'info'
  | 'percent'
  | 'inbox-ticket'
  | 'news'
  | 'inbox-gift';

/** Names that point at another glyph: the same drawing under a second web name. */
export const ICON_ALIASES = {
  'site-phone': 'site-features',
  'star': 'watchlist',
  'inbox-bell': 'alerts',
  'pulse': 'signals',
} as const satisfies Record<string, GlyphName>;

export type IconName = GlyphName | keyof typeof ICON_ALIASES;

const GLYPHS: Record<GlyphName, (p: IconProps) => ReactElement> = {
  'chart-line': IconChartLine,
  'wallet': IconWallet,
  'bell': IconBell,
  'shield-lock': IconShieldLock,
  'receipt': IconReceipt,
  'users': IconUsers,
  'funnel': IconFunnel,
  'rows': IconRows,
  'trophy': IconTrophy,
  'ticket': IconTicket,
  'calculator-keys': IconCalculator,
  'scales': IconScales,
  'grid': IconGrid,
  'globe': IconGlobe,
  'device-lock': IconDeviceLock,
  'sparkle': IconSparkle,
  'clock': IconClock,
  'check': IconCheck,
  'lucide-hand-coins': LucideHandCoins,
  'lucide-shield-check': LucideShieldCheck,
  'lucide-trending-up': LucideTrendingUp,
  'lucide-chart-column-increasing': LucideChartColumnIncreasing,
  'lucide-umbrella': LucideUmbrella,
  'lucide-percent': LucidePercent,
  'lucide-landmark': LucideLandmark,
  'lucide-message-square-text': LucideMessageSquareText,
  'lucide-scale': LucideScale,
  'lucide-table': LucideTable,
  'lucide-circle-check': LucideCircleCheck,
  'lucide-triangle-alert': LucideTriangleAlert,
  'lucide-octagon-x': LucideOctagonX,
  'lucide-chevron-right': LucideChevronRight,
  'lucide-info': LucideInfo,
  'lucide-x': LucideX,
  'lucide-wallet': LucideWallet,
  'lucide-link': LucideLink,
  'lucide-sparkles': LucideSparkles,
  'lucide-check': LucideCheck,
  'lucide-eye': LucideEye,
  'lucide-star': LucideStar,
  'lucide-bell': LucideBell,
  'lucide-search': LucideSearch,
  'lucide-file-text': LucideFileText,
  'lucide-droplet': LucideDroplet,
  'lucide-factory': LucideFactory,
  'lucide-shield': LucideShield,
  'lucide-refresh-cw': LucideRefreshCw,
  'lucide-lock': LucideLock,
  'lucide-briefcase': LucideBriefcase,
  'lucide-calendar': LucideCalendar,
  'markets': IconMarkets,
  'portfolio': IconPortfolio,
  'watchlist': IconWatchlist,
  'alerts': IconAlerts,
  'more': IconMore,
  'home': IconHome,
  'settings': IconSettings,
  'sun': IconSun,
  'moon': IconMoon,
  'lang': IconLang,
  'out': IconOut,
  'chev': IconChev,
  'close': IconClose,
  'fundamentals': IconFundamentals,
  'dividends': IconDividends,
  'screener': IconScreener,
  'signals': IconSignals,
  'chat': IconChat,
  'ext': IconExt,
  'chevDown': IconChevDown,
  'seasonality': IconSeasonality,
  'chart': IconChart,
  'backtest': IconBacktest,
  'heatmap': IconHeatmap,
  'sectors': IconSectors,
  'ipo': IconIpo,
  'brokers': IconBrokers,
  'compare': IconCompare,
  'calculator': IconCalculatorNav,
  'tax': IconTax,
  'family': IconFamily,
  'inbox': IconInbox,
  'gift': IconGift,
  'levels': IconLevels,
  'analytics': IconAnalytics,
  'plan': IconPlan,
  'pin': IconPin,
  'lock': IconLock,
  'eyeOff': IconEyeOff,
  'setting-mail': IconSettingMail,
  'setting-moon': IconSettingMoon,
  'setting-globe': IconSettingGlobe,
  'setting-bell': IconSettingBell,
  'setting-calendar': IconSettingCalendar,
  'setting-out': IconSettingOut,
  'setting-shield': IconSettingShield,
  'setting-download': IconSettingDownload,
  'setting-trash': IconSettingTrash,
  'setting-chat': IconSettingChat,
  'setting-people': IconSettingPeople,
  'setting-lock': IconSettingLock,
  'setting-check': IconSettingCheck,
  'setting-alert': IconSettingAlert,
  'setting-eye-off': IconSettingEyeOff,
  'site-today': IconSiteToday,
  'site-heatmap': IconSiteHeatmap,
  'site-screener': IconSiteScreener,
  'site-compare': IconSiteCompare,
  'site-stocks': IconSiteStocks,
  'site-floorsheet': IconSiteFloorsheet,
  'site-brokers': IconSiteBrokers,
  'site-dividends': IconSiteDividends,
  'site-forex': IconSiteForex,
  'site-gold': IconSiteGold,
  'site-portfolio': IconSitePortfolio,
  'site-calculator': IconSiteCalculator,
  'site-ipo': IconSiteIpo,
  'site-practice': IconSitePractice,
  'site-guide': IconSiteGuide,
  'site-features': IconSiteFeatures,
  'site-steps': IconSiteSteps,
  'site-search': IconSiteSearch,
  'site-enter': IconSiteEnter,
  'site-recent': IconSiteRecent,
  'site-seasonality': IconSiteSeasonality,
  'site-lock': IconSiteLock,
  'site-globe': IconSiteGlobe,
  'site-chat': IconSiteChat,
  'site-bell': IconSiteBell,
  'site-shield': IconSiteShield,
  'site-free': IconSiteFree,
  'site-check': IconSiteCheck,
  'site-family': IconSiteFamily,
  'site-import': IconSiteImport,
  'site-web': IconSiteWeb,
  'site-watch': IconSiteWatch,
  'notice-warn': IconNoticeWarn,
  'notice-info': IconNoticeInfo,
  'notice-gift': IconNoticeGift,
  'notice-cash': IconNoticeCash,
  'notice-rights': IconNoticeRights,
  'notice-done': IconNoticeDone,
  'close-sm': IconCloseSm,
  'chev-left': IconChevLeft,
  'calendar': IconCalendar,
  'plus': IconPlus,
  'trendDown': IconTrendDown,
  'info': IconInfo,
  'percent': IconPercent,
  'inbox-ticket': IconInboxTicket,
  'news': IconNews,
  'inbox-gift': IconInboxGift,
};

/** Every name `Icon` accepts, glyphs first then aliases, for a gallery or a search. */
export function iconNames(): IconName[] {
  return [...(Object.keys(GLYPHS) as GlyphName[]), ...(Object.keys(ICON_ALIASES) as (keyof typeof ICON_ALIASES)[])];
}

/** The glyph a name (or alias) stands for. */
export function resolveIconName(name: IconName): GlyphName {
  return name in ICON_ALIASES ? ICON_ALIASES[name as keyof typeof ICON_ALIASES] : (name as GlyphName);
}

export interface IconByNameProps extends IconProps {
  /** A name from `iconNames()`: a glyph or one of its aliases. */
  name: IconName;
}

/**
 * One icon by name. 24-grid stroke icons in `currentColor`; a few legacy glyphs keep the grid they were drawn on (18, 20)
 * so they render as they did in punji-web. Decorative unless `label` is given. Import a single icon (`IconBell`) instead
 * when only one is needed: this component carries every glyph.
 *
 * @stability beta
 */
export function Icon({ name, ...p }: IconByNameProps): ReactElement {
  const G = GLYPHS[resolveIconName(name)];
  return <G {...p} />;
}

export type NavIconName = 'markets' | 'portfolio' | 'watchlist' | 'alerts' | 'more' | 'home' | 'settings' | 'sun' | 'moon' | 'lang' | 'out' | 'chev' | 'chevDown' | 'close' | 'fundamentals' | 'dividends' | 'screener' | 'signals' | 'chat' | 'ext' | 'seasonality' | 'chart' | 'backtest' | 'heatmap' | 'sectors' | 'ipo' | 'brokers' | 'compare' | 'calculator' | 'tax' | 'family' | 'inbox' | 'gift' | 'analytics' | 'levels' | 'plan' | 'pin' | 'lock' | 'eyeOff';

export interface NavIconProps {
  /** The glyph. */
  name: NavIconName;
  /** The side in px. Default 22, or 18 for the two chevrons. */
  size?: number;
  /** Extra class after `app-ico app-ico-<name>`. */
  className?: string;
}

/**
 * punji-web's `kit/NavIcon`, same props and output (`app-ico` classes, 22 px, 18 for the chevrons, the thick `more` dots), so the
 * swap is an import change.
 *
 * @stability beta
 */
export function NavIcon({ name, size, className }: NavIconProps): ReactElement {
  const small = name === 'chev' || name === 'chevDown';
  return <Icon name={name} size={size ?? (small ? 18 : 22)} className={`app-ico app-ico-${name}${className ? ` ${className}` : ''}`} />;
}

export type SettingIconName = 'mail' | 'moon' | 'globe' | 'bell' | 'calendar' | 'out' | 'shield' | 'download' | 'trash' | 'chat' | 'people' | 'lock' | 'check' | 'alert' | 'eyeOff';

export interface SettingIconProps {
  /** The glyph. */
  name: SettingIconName;
  /** The side in px. Default 18. */
  size?: number;
}

/**
 * punji-web's `kit/SettingIcon` (the 20 grid glyphs a SettingRow's disc holds): same props and output, 18 px by default.
 * Its glyphs are `setting-<name>` in `Icon`.
 *
 * @stability beta
 */
export function SettingIcon({ name, size = 18 }: SettingIconProps): ReactElement {
  return <Icon name={`setting-${kebabOf(name)}` as GlyphName} size={size} />;
}

function kebabOf(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
