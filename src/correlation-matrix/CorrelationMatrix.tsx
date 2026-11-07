'use client';

/**
 * CorrelationMatrix (design.punji.app/components/correlation-matrix): how closely each pair of subjects moved
 * together, as a square table in one hue (the NEPSE series colour): the darker the cell, the closer. 0.40 and below
 * is the palest, 0.85 and above the darkest. Every cell prints its figure (a negative one with a true minus), so the
 * shade only repeats it. The row and column heads are buttons that choose a subject: its row and column keep full
 * strength and the rest fade (a pointer can press any cell for its row). A pair with no figure prints "n/a" and
 * says `noneLabel` in words, in the title and to a screen reader. The diagonal (a subject with itself) is left blank.
 */
import type { CSSProperties } from 'react';

import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export interface CorrelationMatrixLabels {
  /** The key's low end. Default "Looser". */
  low: string;
  /** The key's high end. Default "Closer". */
  high: string;
  /** A hint under the key. Default "Press a name to focus its row and column". */
  hint: string;
}

export interface CorrelationMatrixProps {
  /** The full names (the heads' accessible names, a cell's title). */
  names: readonly string[];
  /** Short heads for the columns. Default the names. */
  shortNames?: readonly string[];
  /** `values[i][j]` is the correlation of subject i with subject j, -1 to 1; `null` for a pair with no figure. */
  values: readonly (readonly (number | null)[])[];
  /** The chosen row's index, or -1 for none. The matrix is controlled when this is given. */
  selected?: number;
  /** The index chosen first when uncontrolled. Default -1. */
  defaultSelected?: number;
  /** Called with the index of the subject whose head or cell was pressed. */
  onSelectedChange?: (index: number) => void;
  /** The table's caption, read by screen readers. */
  caption: string;
  /** The title and spoken words of a cell with no figure. Default "Not enough history". */
  noneLabel?: string;
  /** Prints a figure. Default two decimals with a true minus sign. */
  formatValue?: (value: number) => string;
  /** The key under the matrix. */
  labels?: Partial<CorrelationMatrixLabels>;
  /** Test id on the table. */
  testId?: string;
}

const DEFAULT_LABELS: CorrelationMatrixLabels = { low: 'Looser', high: 'Closer', hint: 'Press a name to focus its row and column' };

const defaultFormat = (v: number) => `${v < 0 && Math.abs(v) >= 0.005 ? '−' : ''}${Math.abs(v).toFixed(2)}`;

/** Percent of the series hue in a cell: 6 at 0.40 and below, 40 at 0.85 and above (the darkest the text passes 4.5:1 on). */
export const correlationStrength = (v: number) => Math.round(6 + Math.max(0, Math.min(1, (v - 0.4) / 0.45)) * 34);

/**
 * @stability beta
 */
export function CorrelationMatrix({ names, shortNames, values, selected, defaultSelected = -1, onSelectedChange, caption, noneLabel = 'Not enough history', formatValue = defaultFormat, labels, testId }: CorrelationMatrixProps) {
  const words = { ...DEFAULT_LABELS, ...labels };
  const [chosen, setChosen] = useControllableState<number>({ value: selected, defaultValue: defaultSelected, onChange: onSelectedChange, name: 'CorrelationMatrix selected' });
  const pick = (i: number) => setChosen(i);
  return (
    <div className="pu-corr-box">
      {/* The matrix scrolls sideways when it is wider than the screen, so the region must be reachable by keyboard. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="pu-corr-scroll" tabIndex={0} role="region" aria-label={caption}>
        <table className="pu-corr" data-testid={testId}>
          <caption className="kit-sr">{caption}</caption>
          <thead>
            <tr>
              <td>{'\u00a0'}</td>
              {names.map((n, j) => (
                <th key={n} scope="col" data-state={j === chosen ? 'on' : chosen >= 0 ? 'dim' : undefined}>
                  {/* The name is the visually hidden span; the short head is for the eye only. */}
                  {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
                  <button type="button" aria-pressed={j === chosen} onClick={() => pick(j)} data-testid={testId ? `${testId}-col-${j}` : undefined}><span aria-hidden="true">{shortNames?.[j] ?? n}</span><span className="kit-sr">{n}</span></button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((n, i) => (
              <tr key={n} data-state={i === chosen ? 'on' : undefined}>
                <th scope="row">
                  {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
                  <button type="button" aria-pressed={i === chosen} onClick={() => pick(i)} data-testid={testId ? `${testId}-row-${i}` : undefined}><span aria-hidden="true">{shortNames?.[i] ?? n}</span><span className="kit-sr">{n}</span></button>
                </th>
                {names.map((m, j) => {
                  const v = values[i]?.[j];
                  const dim = chosen >= 0 && i !== chosen && j !== chosen;
                  if (i === j) return <td key={m} className="pu-corr-self" aria-hidden="true" />;
                  if (typeof v !== 'number' || !Number.isFinite(v)) {
                    return (
                      // A pointer may press any cell for its row; the heads are the keyboard's way.
                      // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
                      <td key={m} className="pu-corr-c" data-none="true" data-dim={dim || undefined} title={`${n}, ${m}: ${noneLabel}`} onClick={() => pick(i)}>
                        <span aria-hidden="true">n/a</span><span className="kit-sr">{noneLabel}</span>
                      </td>
                    );
                  }
                  return (
                    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
                    <td key={m} className="pu-corr-c" data-dim={dim || undefined} title={`${n} and ${m}: ${formatValue(v)}`} style={{ '--corr-s': `${correlationStrength(v)}%` } as CSSProperties} onClick={() => pick(i)}>
                      {formatValue(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pu-corr-key">
        <span>{words.low}</span>
        <i aria-hidden="true" />
        <span>{words.high}</span>
        <span className="pu-corr-hint">{words.hint}</span>
      </p>
    </div>
  );
}
