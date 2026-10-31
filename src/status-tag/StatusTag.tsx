/**
 * StatusTag (design.punji.app/components/status-tag): the state of a setting
 * at the end of its row, in a word or two ("View only", "On", "Off",
 * "Staff only"). Quiet by design: it is read, never pressed, so it has no
 * hover, no focus and no pointer. A tone or an event worth a look ("Bonus",
 * "New") is a StatusPill instead. `icon` adds a small glyph before the word;
 * `tone="accent"` is for a setting that is on.
 */
import type { ReactNode } from 'react';


export type StatusTagIcon = 'eye' | 'eyeOff' | 'lock' | 'check';

const PATHS: Record<StatusTagIcon, ReactNode> = {
  eye: (
    <>
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  eyeOff: <path d="M2 2l12 12M6.6 6.6a2 2 0 002.8 2.8M5 4.4A6.6 6.6 0 0114.5 8a10 10 0 01-1.6 2M3.3 5.5A10 10 0 001.5 8S4 12.5 8 12.5a6 6 0 002.3-.4" />,
  lock: <path d="M4 7.5h8v6H4zM5.5 7.5V5.5a2.5 2.5 0 015 0v2" />,
  check: <path d="M3.5 8.5l3 3 6-7" />,
};

export interface StatusTagProps {
  /** The state in a word or two ("View only", "On"). */
  children: ReactNode;
  /** neutral (default), or accent for a setting that is on. */
  tone?: 'neutral' | 'accent';
  /** A small glyph before the word. Decorative: the word carries the state. */
  icon?: StatusTagIcon;
  /** Becomes data-testid on the tag. */
  testId?: string;
  /** Layout only, never a restyle. */
  className?: string;
}

export function StatusTag({ children, tone = 'neutral', icon, testId, className }: StatusTagProps) {
  return (
    <span className={`kit-tag${tone === 'accent' ? ' accent' : ''}${className ? ` ${className}` : ''}`} data-testid={testId}>
      {icon && (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {PATHS[icon]}
        </svg>
      )}
      {children}
    </span>
  );
}
