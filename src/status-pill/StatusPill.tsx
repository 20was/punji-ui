import type { ReactNode } from 'react';
import type { LinkComponent } from '../internal/link.tsx';


/**
 * A short label (design.punji.app/components/status-pill): a state, a tone,
 * a tag ("Bonus", "Estimate", "Yours", "New"). Not pressable, except as a
 * link (`href`: the sector a stock belongs to). `swatch` puts a small square
 * of a series colour before the label; `size="sm"` is the 20px tag in a row
 * or a dense header; `marker` is a state beside a title (an outlined pill
 * with a coloured dot: live, warn, off). Tones: gain, loss, warn (a caution), accent (yours,
 * opened, new), highlight (an event worth a look: a bonus), info (NEPSE blue: a
 * neutral state, such as a sector that is catching up).
 */
export interface StatusPillProps {
  /** The label: one or two words. The words carry the meaning; tone and dot are extra. */
  children: ReactNode;
  /** The colour family: gain, loss, warn (a caution), accent (yours, opened, new), highlight (an event worth a look) or info (a neutral state). Omit for neutral. */
  tone?: 'gain' | 'loss' | 'warn' | 'accent' | 'highlight' | 'info';
  /** A small dot before the label, in the tone's colour. */
  dot?: boolean;
  /** A CSS colour (a series token such as var(--pu-color-series-4)) for a small square before the label. */
  swatch?: string;
  /** sm: the 20px tag for a row or a dense header. */
  size?: 'sm';
  /** Makes the pill a link to this address (the sector a stock belongs to). */
  href?: string;
  /** The link element for an in-app `href` (wrap your router's link). Default: a plain <a>. */
  linkComponent?: LinkComponent;
  /** A state beside a page's title (a market open, closed, delayed): an outlined pill whose dot carries the state; the words say it too. */
  marker?: 'live' | 'warn' | 'off';
  /** Becomes data-testid on the pill. */
  testId?: string;
  /** Layout only (spacing in a row); never restyle the pill per page. */
  className?: string;
}

export function StatusPill({ children, tone, dot, swatch, size, href, linkComponent, marker, testId, className }: StatusPillProps) {
  const cls = `kit-pill${tone ? ` ${tone}` : ''}${dot ? ' dot' : ''}${marker ? ` marker ${marker}` : ''}${size === 'sm' ? ' sm' : ''}${href ? ' link' : ''}${className ? ` ${className}` : ''}`;
  const body = (
    <>
      {swatch && <i className="kit-pill-sw" style={{ background: swatch }} aria-hidden="true" />}
      {children}
    </>
  );
  const L = linkComponent && !/^https?:/.test(href ?? '') ? linkComponent : 'a';
  return href ? (
    <L className={cls} href={href} data-testid={testId}>
      {body}
    </L>
  ) : (
    <span className={cls} data-testid={testId}>
      {body}
    </span>
  );
}

/**
 * CountBadge: how many are waiting, as a small amber disc beside a heading
 * ("Waiting for you 2"). A count only: the heading says what is counted, and
 * `label` says it again for screen readers ("2 waiting").
 */
export interface CountBadgeProps {
  /** The number waiting. */
  count: number;
  /** What the number means, for screen readers ("2 waiting"). */
  label: string;
  /** Becomes data-testid on the badge. */
  testId?: string;
}

export function CountBadge({ count, label, testId }: CountBadgeProps) {
  return (
    <span className="kit-count" aria-label={label} role="img" data-testid={testId}>
      {count}
    </span>
  );
}
