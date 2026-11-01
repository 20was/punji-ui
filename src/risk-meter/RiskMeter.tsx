/**
 * RiskMeter: a fund's or product's risk level on a fixed scale, the "riskometer" every mutual fund factsheet carries
 * (six levels from Low to Very high by default, or your regulator's three to eight). A half-dial with a needle, or a
 * compact row of steps for lists. The level is always printed in words ("Moderately high, 4 of 6"), so the colour
 * and the needle are never the only carriers of meaning. Display only: the level comes from the fund's offer document.
 */
import type { ReactNode } from 'react';

/** The six-level scale most fund regulators use, lowest first. */
export const riskLevelLabels: readonly string[] = ['Low', 'Low to moderate', 'Moderate', 'Moderately high', 'High', 'Very high'];

export interface RiskMeterProps {
  /** The level, from 1 (lowest) to the number of levels. */
  level: number;
  /** The level names, lowest first: 3 to 8 of them. Default `riskLevelLabels` (six). */
  levels?: readonly string[];
  /** 'gauge' (a half-dial with a needle, default) or 'bar' (a compact row of steps for tables and cards). */
  variant?: 'gauge' | 'bar';
  /** The word before the level. Default 'Risk'. */
  label?: ReactNode;
  /** "4 of 6" for screen readers and, in the gauge, on screen. Replace for translation. */
  position?: (level: number, count: number) => string;
  /** A line under the gauge ("Investors understand that their principal will be at moderately high risk"). */
  caption?: ReactNode;
  /** Extra class on the outer element. */
  className?: string;
  /** Sets `data-testid` on the outer element. */
  testId?: string;
}

const defaultPosition = (level: number, count: number) => `${level} of ${count}`;

/** The tone step (0 lowest to 5 highest) for a level on a scale of `count`. */
const toneOf = (index: number, count: number) => (count <= 1 ? 0 : Math.round((index * 5) / (count - 1)));

const R = 38;
const CX = 50;
const CY = 48;
const point = (angle: number, radius = R) => `${(CX + radius * Math.cos(angle)).toFixed(2)} ${(CY - radius * Math.sin(angle)).toFixed(2)}`;

export function RiskMeter({ level, levels = riskLevelLabels, variant = 'gauge', label = 'Risk', position = defaultPosition, caption, className, testId }: RiskMeterProps) {
  const count = levels.length;
  if (count < 3 || count > 8) throw new RangeError('RiskMeter needs 3 to 8 levels');
  if (!Number.isInteger(level) || level < 1 || level > count) throw new RangeError(`level must be a whole number from 1 to ${count}`);
  const name = levels[level - 1];
  const where = position(level, count);
  const cls = `pu-risk${className ? ` ${className}` : ''}`;
  if (variant === 'bar')
    return (
      <span className={cls} data-variant="bar" data-level={level} data-testid={testId}>
        <span className="pu-risk-steps" aria-hidden="true">
          {levels.map((_, i) => (
            <i key={i} data-tone={toneOf(i, count)} data-on={i < level || undefined} data-current={i === level - 1 || undefined} />
          ))}
        </span>
        <span className="pu-risk-words">
          <span className="kit-sr">{label} </span>
          <span className="pu-risk-name">{name}</span>
          <span className="kit-sr">, {where}</span>
        </span>
      </span>
    );
  const step = Math.PI / count;
  const gap = 0.035;
  const needle = Math.PI - (level - 0.5) * step;
  return (
    <div className={cls} data-variant="gauge" data-level={level} data-testid={testId}>
      <svg className="pu-risk-dial" viewBox="0 0 100 56" aria-hidden="true" focusable="false">
        {levels.map((_, i) => {
          const a0 = Math.PI - i * step - gap;
          const a1 = Math.PI - (i + 1) * step + gap;
          return <path key={i} className="pu-risk-seg" data-tone={toneOf(i, count)} data-current={i === level - 1 || undefined} d={`M ${point(a0)} A ${R} ${R} 0 0 1 ${point(a1)}`} />;
        })}
        <path className="pu-risk-needle" d={`M ${point(needle + Math.PI / 2, 3)} L ${point(needle, R - 12)} L ${point(needle - Math.PI / 2, 3)} Z`} />
        <circle className="pu-risk-hub" cx={CX} cy={CY} r="4" />
      </svg>
      <p className="pu-risk-text">
        <span className="pu-risk-label">{label}</span>
        <strong className="pu-risk-name">{name}</strong>
        <span className="pu-risk-where">{where}</span>
      </p>
      {caption && <p className="pu-risk-caption">{caption}</p>}
    </div>
  );
}
