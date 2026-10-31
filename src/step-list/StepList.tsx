/**
 * StepList (design.punji.app/components/step-list): what to do first, as
 * numbered steps, each a title and one line. On the inverse surface by
 * default; the current step's number is filled and marked `aria-current="step"`.
 * An ordered list, so the numbers are read in order.
 *
 * `layout`: 'tiles' (default) steps divided by hairlines in a card; 'rows'
 * hairlines between steps with filled round numbers (questions to read by);
 * 'banner' one band over a tool on a first visit, the title left, the steps
 * across, a dismiss button at the end.
 */
import type { ReactNode } from 'react';

export interface Step {
  /** The step's name. */
  title: ReactNode;
  /** One line under the title. */
  body?: ReactNode;
}

export function StepList({ title, eyebrow, lead, foot, steps, current = 0, tone = 'inverse', layout = 'tiles', headingLevel = 2, onDismiss, dismissLabel = 'Dismiss', dismissTestId, testId }: {
  /** The heading over the steps. */
  title?: ReactNode;
  /** A small label over the title ("New here"). */
  eyebrow?: ReactNode;
  /** One line under the title. */
  lead?: ReactNode;
  /** A quiet line under the steps. */
  foot?: ReactNode;
  /** The steps, in order. */
  steps: readonly Step[];
  /** The step to do now (0-based); -1 for none. */
  current?: number;
  /** 'inverse' (default) or 'plain'. */
  tone?: 'inverse' | 'plain';
  /** 'tiles' (default), 'rows' or 'banner'. */
  layout?: 'tiles' | 'rows' | 'banner';
  /** The title's heading level, to fit the page's outline (default 2). */
  headingLevel?: 2 | 3 | 4;
  /** A button that puts the band away (the page remembers it). */
  onDismiss?: () => void;
  /** The dismiss button's accessible name. */
  dismissLabel?: string;
  /** Sets `data-testid` on the dismiss button. */
  dismissTestId?: string;
  /** Sets `data-testid` on the root. */
  testId?: string;
}) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const head = (
    <>
      {eyebrow && <p className="kit-steps-k">{eyebrow}</p>}
      {title && <Heading className="kit-steps-h">{title}</Heading>}
      {lead && <p className="kit-steps-lead">{lead}</p>}
    </>
  );
  return (
    <section className={`kit-steps${tone === 'inverse' ? ' kit-inv' : ''}${layout === 'rows' ? ' rows' : ''}${layout === 'banner' ? ' banner' : ''}`} data-testid={testId}>
      {layout === 'banner' ? <div className="kit-steps-hd">{head}</div> : head}
      <ol>
        {steps.map((s, i) => (
          <li key={i} aria-current={i === current ? 'step' : undefined}>
            <span className={`n${i === current ? ' on' : ''}`} aria-hidden="true">
              {i + 1}
            </span>
            <span className="tx">
              <b>{s.title}</b>
              {s.body && <span>{s.body}</span>}
            </span>
          </li>
        ))}
      </ol>
      {foot && <p className="kit-steps-foot">{foot}</p>}
      {onDismiss && (
        <button type="button" className="kit-steps-x" onClick={onDismiss} aria-label={dismissLabel} data-testid={dismissTestId}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </section>
  );
}
