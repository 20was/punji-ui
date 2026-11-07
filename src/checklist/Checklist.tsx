/**
 * Checklist (design.punji.app/components/checklist): a short guide to getting
 * started, made only of steps that exist: a progress line (one segment per
 * step, filled from the left by how many are done: "1 of 4 done"), then a row
 * per step at its natural height with an icon, its title and one line, and on
 * the right its one action, or a quiet check and "Done" once it is (its words
 * muted, never struck through). An ordered list in the order given: the
 * caller puts the open steps first.
 *
 * ProgressPill is the same guide folded away: a small pill with a ring that
 * opens it again. One per page.
 */
import type { ReactNode } from 'react';

export interface ChecklistItem {
  /** Unique within the list. */
  id: string;
  /** A decorative glyph before the title. */
  icon: ReactNode;
  /** The step's name. */
  title: ReactNode;
  /** One line under it. */
  body?: ReactNode;
  /** Whether the step is finished. */
  done: boolean;
  /** What to do (a Button); hidden once done. */
  action?: ReactNode;
  /** Becomes data-testid on the row. */
  testId?: string;
}

export interface ChecklistProps {
  /** The steps, open ones first. */
  items: readonly ChecklistItem[];
  /** "1 of 4 done". */
  progress: ReactNode;
  /** The word on a finished row ("Done"). */
  doneLabel: ReactNode;
  /** The list's accessible name ("Setup guide"). */
  label: string;
  /** Becomes data-testid on the root. */
  testId?: string;
}

/**
 * @stability beta
 */
export function Checklist({ items, progress, doneLabel, label, testId }: ChecklistProps) {
  const done = items.filter((it) => it.done).length;
  return (
    <div className="pu-checklist" data-testid={testId}>
      <div className="pu-checklist-progress">
        <span className="pu-checklist-seg" aria-hidden="true">
          {items.map((it, i) => (
            <i key={it.id} data-on={i < done || undefined} />
          ))}
        </span>
        <span className="pu-checklist-count">{progress}</span>
      </div>
      <ol className="pu-checklist-rows" aria-label={label}>
        {items.map((it) => (
          <li key={it.id} className="pu-checklist-row" data-done={it.done || undefined} data-testid={it.testId}>
            <span className="pu-checklist-icon" aria-hidden="true">{it.icon}</span>
            <span className="pu-checklist-text">
              <b>{it.title}</b>
              {it.body ? <span>{it.body}</span> : null}
            </span>
            <span className="pu-checklist-action">
              {it.done ? (
                <span className="pu-checklist-done">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  {doneLabel}
                </span>
              ) : (
                it.action
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export interface ProgressPillProps {
  /** Steps finished. */
  done: number;
  /** Steps in all. */
  total: number;
  /** The pill's words ("Setup guide · 1 of 4 done"). They name the button. */
  children: ReactNode;
  /** Opens the guide again. */
  onClick: () => void;
  /** Becomes data-testid. */
  testId?: string;
  /** Layout only (fixed placement, margin). */
  className?: string;
}

/**
 * The guide folded away: a pill with a progress ring.
 * @stability beta
 */
export function ProgressPill({ done, total, children, onClick, testId, className }: ProgressPillProps) {
  const pct = total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;
  return (
    <button type="button" className={`pu-progress-pill${className ? ` ${className}` : ''}`} onClick={onClick} data-testid={testId}>
      <span className="pu-progress-ring" style={{ background: `conic-gradient(var(--pu-color-accent) ${Math.round(pct * 360)}deg, var(--pu-color-track) 0)` }} aria-hidden="true" data-done={done} data-total={total} />
      <span>{children}</span>
    </button>
  );
}
