/**
 * FactList (design.punji.app/components/fact-list): a few facts on a tint,
 * a label on the left and its value on the right, under a small title
 * ("Across every month"). A value that is not there yet says so quietly
 * (`quiet`: "Need 5 years"), never a dash. The value never truncates: on a
 * narrow panel it wraps under its label. `stack` puts every value under its
 * label (a phone), so a row's height never depends on how long its value is.
 * A description list, so each label is read with its value.
 *
 * KeyStats is the grid of label-over-value cells; FactList is one column of
 * label-and-value lines. DataRows (rows) is the same in a grouped card.
 */
import type { ReactNode } from 'react';

export interface Fact {
  label: ReactNode;
  value: ReactNode;
  /** A value that is a note, not a figure ("Need 5 years"): muted. */
  quiet?: boolean;
  testId?: string;
}

export function FactList({ title, facts, stack, testId }: { title?: ReactNode; facts: readonly Fact[]; /** Every value under its label. */ stack?: boolean; testId?: string }) {
  return (
    <div className={`kit-facts${stack ? ' stack' : ''}`} data-testid={testId}>
      {title && <p className="kit-facts-k">{title}</p>}
      <dl>
        {facts.map((f, i) => (
          <div key={i} className={f.quiet ? 'quiet' : undefined} data-testid={f.testId}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
