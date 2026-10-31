import type { ReactNode } from 'react';
import type { LinkComponent } from '../internal/link.tsx';


/**
 * A short label (design.punji.app/components/status-pill): a state, a tone,
 * a tag ("Bonus", "Estimate", "Yours", "New"). Not pressable, except as a
 * link (`href`: the sector a stock belongs to). `swatch` puts a small square
 * of a series colour before the label; `size="sm"` is the 20px tag in a row
 * or a dense header; `marker` is a state beside a title (an outlined pill
 * with a coloured dot: live, warn, off). Tones: gain, loss, warn (a caution), accent (yours,
 * opened, new), highlight (an event worth a look: a bonus).
 */
export function StatusPill({ children, tone, dot, swatch, size, href, linkComponent, marker, testId, className }: { children: ReactNode; tone?: 'gain' | 'loss' | 'warn' | 'accent' | 'highlight'; dot?: boolean; swatch?: string; size?: 'sm'; href?: string; /** The link element for an in-app `href` (wrap your router's link). Default: a plain <a>. */ linkComponent?: LinkComponent; /** A state beside a page's title (a market open, closed, delayed): an outlined pill whose dot carries the state; the words say it too. */ marker?: 'live' | 'warn' | 'off'; testId?: string; className?: string }) {
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
export function CountBadge({ count, label, testId }: { count: number; label: string; testId?: string }) {
  return (
    <span className="kit-count" aria-label={label} role="img" data-testid={testId}>
      {count}
    </span>
  );
}
