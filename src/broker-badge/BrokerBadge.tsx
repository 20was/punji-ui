/**
 * BrokerBadge (design.punji.app/components/broker-badge): a NEPSE broker's number as a tile, the mark that leads a
 * broker's name in a list, a result or a page header. Tabular figures, never truncated: the box is sized for a
 * two-digit number at every size, so a number never shrinks or wraps.
 *
 * Decorative by default (the broker's name beside it says the number too); pass `label` when it stands alone.
 */
export type BrokerBadgeSize = 36 | 40 | 48 | 56 | 132;
export type BrokerBadgeTone = 'neutral' | 'inverse' | 'accent';

export interface BrokerBadgeProps {
  /** The broker's number. A string keeps leading characters as written ("07"). */
  code: number | string;
  /** Pixels: 36, 40, 48, 56 or 132 (84 on a phone). Default 36. */
  size?: BrokerBadgeSize;
  /** neutral: a tint; inverse: the dark tile on a light surface; accent: the page's one highlighted broker. */
  tone?: BrokerBadgeTone;
  /** A small word over the number at size 132 ("Broker"). */
  caption?: string;
  /** Names the badge for a screen reader when no text beside it does ("Broker 58"). Without it the badge is hidden from them. */
  label?: string;
  /** Sets `data-testid` on the badge. */
  testId?: string;
  /** Extra class names, layout only. */
  className?: string;
}

/**
 * @stability beta
 */
export function BrokerBadge({ code, size = 36, tone = 'neutral', caption, label, testId, className }: BrokerBadgeProps) {
  return (
    <span
      className={`pu-broker-badge${className ? ` ${className}` : ''}`}
      data-size={size}
      data-tone={tone}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-testid={testId}
    >
      {caption && size === 132 && <small>{caption}</small>}
      <span>{code}</span>
    </span>
  );
}
