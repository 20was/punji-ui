/**
 * EmptyState (also the error state: a title, a line, one action), Note (a
 * qualifying line next to the data it qualifies) and Skeleton (holds the
 * space while loading; never swap content in front of the reader).
 */
import type { CSSProperties, ReactNode } from 'react';


export function EmptyState({ title, body, action, icon, bare, center, headingLevel = 2, testId, role }: {
  /** What is empty or what failed (rendered as a heading: an h2 unless `headingLevel` says otherwise). */
  title: ReactNode;
  /** One line: why it is empty or what to do next. */
  body?: ReactNode;
  /** One button or link. */
  action?: ReactNode;
  /** A StatusDisc over the title (what kind of state this is). */
  icon?: ReactNode;
  /** Inside a card that already frames it: no box of its own (a card never holds a card). */
  bare?: boolean;
  /** With an icon: centred under it (a page's first run), not left-aligned. */
  center?: boolean;
  /** The title's heading level, to fit the page's outline (default 2; 3 inside a Card whose title is an h2). */
  headingLevel?: 2 | 3 | 4;
  /** Sets `data-testid` on the root. */
  testId?: string;
  /** 'alert' when the state is a failure, 'status' when it can change. */
  role?: 'alert' | 'status';
}) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  return (
    <div className={`kit-empty${icon ? ' has-icon' : ''}${bare ? ' bare' : ''}${center ? ' center' : ''}`} data-testid={testId} role={role}>
      {icon}
      <Heading>{title}</Heading>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

/** The marks that say "warning" and "error": an icon in the tone's colour, never a side stripe or a tinted card. */
export function ToneIcon({ tone }: { tone: 'warn' | 'error' | 'success' }) {
  return (
    <svg className={`kit-tone-ico ${tone}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {tone === 'warn' && (
        <>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4M12 17h.01" />
        </>
      )}
      {tone === 'error' && (
        <>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </>
      )}
      {tone === 'success' && (
        <>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M8 12.5l2.7 2.7L16 9.8" />
        </>
      )}
    </svg>
  );
}

export function Note({ children, tone, quiet, plain, testId }: {
  /** The qualifying line. */
  children: ReactNode;
  /** 'warn' or 'error': an icon in the tone's colour before the words. */
  tone?: 'warn' | 'error';
  /** A small line on the surface itself (a source, a caveat under a figure), no tint. */
  quiet?: boolean;
  /** A quiet line with no box (a footnote under a list or a card). */
  plain?: boolean;
  /** Sets `data-testid` on the line. */
  testId?: string;
}) {
  if (!tone) return <p className={`kit-note${quiet ? ' quiet' : ''}${plain ? ' plain' : ''}`} data-testid={testId}>{children}</p>;
  return (
    <p className={`kit-note ${tone}`} data-testid={testId}>
      <ToneIcon tone={tone} />
      <span>{children}</span>
    </p>
  );
}

/**
 * Skeleton (design.punji.app/components/skeleton): one block that holds the
 * space of what is loading, in its shape (a figure's height, a row's, a
 * chart's box). `circle` for an avatar or a tile. Give the whole loading
 * region one `label` (role="status"), not every block.
 */
export function Skeleton({ width = '100%', height = 16, radius, circle, still, style, label }: {
  /** Width in px or any CSS length. Default 100%. */
  width?: number | string;
  /** Height in px or any CSS length. Default 16. */
  height?: number | string;
  /** Corner radius in px. */
  radius?: number;
  /** A round block, for an avatar or a tile. */
  circle?: boolean;
  /** A placeholder that is not loading (behind a lock): no shimmer, quieter. */
  still?: boolean;
  /** Extra inline style, for layout (margin, grid placement). */
  style?: CSSProperties;
  /** Names the loading region (role="status"). Without it the block is decorative; label the region once, not every block. */
  label?: string;
}) {
  return (
    <span
      className={`kit-skel${circle ? ' circle' : ''}${still ? ' still' : ''}`}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** Lines of text loading: `lines` bars at the body line height, the last one shorter, like a paragraph's ragged end. */
export function SkeletonText({ lines = 3, lastWidth = '60%', lineHeight = 20, label }: {
  /** How many lines. Default 3. */
  lines?: number;
  /** Width of the last line when there is more than one (a CSS length). Default 60%. */
  lastWidth?: string;
  /** The line height in px the bars are spaced for. Default 20. */
  lineHeight?: number;
  /** Names the loading region (role="status"). Without it the lines are decorative. */
  label?: string;
}) {
  return (
    <span className="kit-skel-text" role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 && lines > 1 ? lastWidth : '100%'} height={Math.round(lineHeight * 0.6)} style={{ margin: `${Math.round(lineHeight * 0.2)}px 0` }} />
      ))}
    </span>
  );
}
