'use client';

/**
 * Bars that print beside their figures (design.punji.app/components/bars):
 *
 *   SplitBar      one whole split into parts with a small gap between them
 *                 (rising, unchanged and falling; done and to do), each part's
 *                 label under the bar: the first at the start, the last at
 *                 the end, any middle one centred.
 *   DivergingBar  one value about a centre line: a rise grows right, a fall
 *                 grows left, on a shared scale (`max`) so rows compare.
 *   NetBar        a DivergingBar that carries its own figure: the centre line
 *                 drawn in every row, the bar on a shared scale (a small value
 *                 still shows), the signed figure beside it, and on hover the
 *                 parts it nets (bought, sold, net) in a readout that is also
 *                 spoken after the figure.
 *   NetBarHead    the column head that says what each side of the line means.
 *
 * All are drawn for the eye: the words under a SplitBar and the figure beside
 * a DivergingBar say the same thing, so the bars are aria-hidden unless given
 * a `label`. Direction is never colour alone: it is left or right of a drawn
 * centre line, and the printed figure carries the sign.
 */
import { useState, type ReactNode } from 'react';

import { FloatingTooltip } from '../floating-tooltip/FloatingTooltip.tsx';
import { devWarn } from '../internal/devWarn.ts';

export type BarTone = 'gain' | 'loss' | 'neutral' | 'nepse' | 'chart';

export interface SplitPart {
  /** Unique, stable key. */
  key: string;
  /** Its share of the whole. Zero, negative and non-finite values draw nothing (a negative share has no width). */
  value: number;
  /** The part's colour. */
  tone: BarTone;
  /** Printed under the bar ("141 up"). */
  label?: ReactNode;
  /** Sets `data-testid` on the part's label. */
  testId?: string;
}

const NO_ANCHOR: { x: number; y: number } | null = null;
const hasLabel = (n: ReactNode) => n !== undefined && n !== null && n !== false && n !== '';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** A bar's width as a percentage of its scale; 0 for an unusable scale or value, never NaN. */
const share = (value: number, max: number) => (finite(value) && finite(max) && max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0);

export function SplitBar({ parts, label, testId }: {
  /** The parts of the whole, in order. A part's share is its `value` over the sum of the positive values. */
  parts: readonly SplitPart[];
  /** Names the bar for screen readers when no words are printed under it. */
  label?: string;
  /** Sets `data-testid` on the root. */
  testId?: string;
}) {
  const shown = parts.filter((p) => finite(p.value) && p.value > 0);
  const labelled = parts.filter((p) => hasLabel(p.label));
  if (!label && labelled.length === 0) devWarn('SplitBar has neither part labels nor a `label`; its meaning is colour alone.');
  return (
    <div className="kit-split" data-testid={testId}>
      <div className="kit-split-bar" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        {shown.map((p) => (
          <i key={p.key} className={`kit-bar-${p.tone}`} style={{ flexGrow: p.value }} />
        ))}
      </div>
      {labelled.length > 0 && (
        <div className={`kit-split-l n${Math.min(labelled.length, 3)}`}>
          {labelled.map((p) => (
            <span key={p.key} className={`kit-split-t ${finite(p.value) && p.value > 0 ? p.tone : 'neutral'}`} data-testid={p.testId}>
              {p.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function DivergingBar({ value, max, label, testId }: {
  /** Positive grows right of the centre line, negative grows left, on the scale where `max` is the end of either side. */
  value: number;
  /** The scale's end on either side (the largest move among the rows). */
  max: number;
  /** Names the bar (an image) with its value in words. Without it the bar is decorative. */
  label?: string;
  /** Sets `data-testid` on the bar. */
  testId?: string;
}) {
  const w = share(value, max);
  const side = finite(value) && value > 0 ? 'up' : finite(value) && value < 0 ? 'down' : 'flat';
  return (
    <span className={`kit-div ${side}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-testid={testId}>
      <span className="kit-div-l">{side === 'down' && <i style={{ width: `${Math.max(w, 2)}%` }} />}</span>
      <span className="kit-div-r">{side === 'up' && <i style={{ width: `${Math.max(w, 2)}%` }} />}</span>
    </span>
  );
}

export interface NetBarTip {
  title: ReactNode;
  /** `value` is as printed; `tone` puts a colour swatch before the row. */
  rows: readonly { label: string; value: string; tone?: BarTone }[];
}

export function NetBar({ value, max, text, tip, testId }: {
  /** The net: positive grows right of the centre line, negative left, on the scale where `max` is the end of either side. */
  value: number;
  /** The scale's end on either side (the largest net among the rows). */
  max: number;
  /** The signed figure as printed ("+14.45", "−46.49", "0"). */
  text: ReactNode;
  /** What the net is made of, read out on hover and spoken after the figure. */
  tip?: NetBarTip;
  /** Sets `data-testid` on the root; the tip gets `<id>-tip`. */
  testId?: string;
}) {
  const [anchor, setAnchor] = useState(NO_ANCHOR);
  const w = share(value, max);
  const side = finite(value) && value > 0 ? 'up' : finite(value) && value < 0 ? 'down' : 'flat';
  const bar = <i style={{ width: `max(3px, ${w}%)` }} />;
  return (
    <span
      className={`kit-netbar ${side}`}
      data-testid={testId}
      onPointerMove={tip ? (e) => { if (e.pointerType !== 'touch') setAnchor({ x: e.clientX, y: e.clientY }); } : undefined}
      onPointerLeave={tip ? () => setAnchor(null) : undefined}
    >
      <span className="kit-netbar-t" aria-hidden="true">
        <span className="kit-netbar-l">{side === 'down' && bar}</span>
        <span className="kit-netbar-r">{side === 'up' && bar}</span>
      </span>
      <b className="kit-netbar-v">{text}</b>
      {tip && <span className="kit-sr">{tip.rows.map((r) => `${r.label} ${r.value}`).join(', ')}</span>}
      {tip && anchor && (
        <FloatingTooltip anchor={anchor} className="kit-bar-tip" testId={testId ? `${testId}-tip` : undefined}>
          <strong>{tip.title}</strong>
          {tip.rows.map((r) => (
            <span key={r.label}>
              {r.tone && <i className={`kit-bar-${r.tone}`} aria-hidden="true" />}
              {r.label}
              <b>{r.value}</b>
            </span>
          ))}
        </FloatingTooltip>
      )}
    </span>
  );
}

/** A NetBar column's head: what each side of the centre line means. */
export function NetBarHead({ left, right }: {
  /** What the left side of the centre line means ("Net sold"). */
  left: ReactNode;
  /** What the right side means ("Net bought"). */
  right: ReactNode;
}) {
  return (
    <span className="kit-netbar-h">
      <span>
        {left} <span aria-hidden="true">←</span>
      </span>
      <span>
        <span aria-hidden="true">→</span> {right}
      </span>
    </span>
  );
}
