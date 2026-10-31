// The site's own glyphs: inline SVG, decorative (aria-hidden), drawn with currentColor so they follow the theme.
import type { ReactNode } from 'react';

const Svg = ({ children, size = 16, className }: { children: ReactNode; size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

export const SearchIcon = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);
export const SunIcon = () => (
  <Svg size={15}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </Svg>
);
export const MoonIcon = () => (
  <Svg size={15}>
    <path d="M20.5 14.1A8.5 8.5 0 1 1 9.9 3.5a6.6 6.6 0 0 0 10.6 10.6z" />
  </Svg>
);
export const MonitorIcon = () => (
  <Svg size={15}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </Svg>
);
export const PhoneIcon = () => (
  <Svg size={15}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </Svg>
);
export const MenuIcon = () => (
  <Svg size={18}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);
export const CloseIcon = () => (
  <Svg size={18}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const ChevronIcon = ({ className }: { className?: string }) => (
  <Svg size={14} className={className}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
export const ArrowRightIcon = () => (
  <Svg size={16}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const ExternalIcon = () => (
  <Svg size={13}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
);
export const CopyIcon = () => (
  <Svg size={14}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a1 1 0 0 1 1-1h10" />
  </Svg>
);
export const CheckIcon = () => (
  <Svg size={14}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
export const DoIcon = () => (
  <Svg size={16}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.8 2.8L16.5 9.5" />
  </Svg>
);
export const DontIcon = () => (
  <Svg size={16}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </Svg>
);
export const CodeIcon = () => (
  <Svg size={14}>
    <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
  </Svg>
);

/** GitHub's mark, drawn inline (no third-party image). */
export const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

/** The punji wordmark from .github/assets (punji-wordmark-*.svg), filled with the accent so it follows the theme. */
export const Wordmark = ({ height = 20 }: { height?: number }) => (
  <svg className="doc-wordmark" height={height} width={(height * 177.88) / 79.88} viewBox="0 -21.38 177.88 79.88" fill="currentColor" aria-hidden="true" focusable="false">
    <path fillRule="evenodd" d="M21.0 0.0H42.0V21.0A21 21 0 0 1 21.0 42.0A21 21 0 0 1 11.0 39.47V58.5H0.0V21.0A21 21 0 0 1 21.0 0.0ZM21.0 11.0H31.0V21.0A10 10 0 0 1 21.0 31.0A10 10 0 0 1 11.0 21.0A10 10 0 0 1 21.0 11.0Z" />
    <path fillRule="evenodd" d="M47.5 0H58.5V21A10 10 0 0 0 78.5 21V0H89.5V42H78.5V39.47A21 21 0 0 1 47.5 21Z" />
    <path fillRule="evenodd" transform="rotate(180 117.5 21)" d="M96.5 0H107.5V21A10 10 0 0 0 127.5 21V0H138.5V42H127.5V39.47A21 21 0 0 1 96.5 21Z" />
    <path fillRule="evenodd" d="M146.5 0H157.5V43.5A15 15 0 0 1 142.5 58.5H139.5V47.5H142.5A4 4 0 0 0 146.5 43.5Z" />
    <circle cx="152" cy="-10.5" r="6.38" />
    <path fillRule="evenodd" d="M165.5 0H176.5V42H165.5Z" />
    <circle cx="171" cy="-14.5" r="6.38" />
  </svg>
);
