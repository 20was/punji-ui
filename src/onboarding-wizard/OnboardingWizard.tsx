'use client';

/**
 * OnboardingWizard: the shell of a multi-step form such as opening an account or a KYC update. A progress list of the
 * steps (done, current, to do), the current step's heading, your step content, and Back and Continue (Submit on the
 * last step) in a real <form>, so Enter continues. When the step changes, focus moves to the new step's heading and
 * the change is announced. The wizard holds no data and validates nothing: you decide whether Continue may advance,
 * and the server checks everything again.
 */
import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { showDigits } from '../internal/lendingDigits.ts';

export interface WizardStep {
  /** Stable unique id. */
  id: string;
  /** The step's short name ("Personal details"), shown in the progress list and as the heading. */
  title: string;
  /** One line under the heading. */
  description?: string;
}

export interface OnboardingWizardLabels {
  /** "Step 2 of 5". */
  progress: (step: number, total: number) => string;
  back: string;
  next: string;
  submit: string;
  /** The progress list's name. */
  steps: string;
  /** State words for screen readers in the list. */
  done: string;
  current: string;
  upcoming: string;
}

export const DEFAULT_ONBOARDING_WIZARD_LABELS: OnboardingWizardLabels = {
  progress: (step, total) => `Step ${step} of ${total}`, back: 'Back', next: 'Continue', submit: 'Submit', steps: 'Steps',
  done: 'Done', current: 'Current step', upcoming: 'Not started',
};

export interface OnboardingWizardProps {
  /** Every step, in order. */
  steps: readonly WizardStep[];
  /** The current step's index (0-based). The wizard is controlled. */
  current: number;
  /** Called when Continue is pressed (or Enter in a field). Validate, then move `current` on. On the last step this is the submit. */
  onNext: () => void;
  /** Called when Back is pressed. Omit to hide Back. */
  onBack?: () => void;
  /** Let the reader jump back to a completed step from the progress list. */
  onStepSelect?: (index: number) => void;
  /** The current step's fields. */
  children: ReactNode;
  /** Shows a spinner on Continue and disables both buttons (while saving). */
  busy?: boolean;
  /** Disables Continue (when a step cannot be continued yet). Prefer showing errors on Continue instead. */
  nextDisabled?: boolean;
  /** Digits for the step numbers. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** The step heading's level. Default 2. */
  headingLevel?: 2 | 3;
  /** Replace any words, for translation. */
  labels?: Partial<OnboardingWizardLabels>;
  /** Extra class on the outer element. */
  className?: string;
  /** Sets `data-testid` on the form; buttons get `-back` and `-next`. */
  testId?: string;
}

export function OnboardingWizard({ steps, current, onNext, onBack, onStepSelect, children, busy, nextDisabled, digits = 'latn', headingLevel = 2, labels, className, testId }: OnboardingWizardProps) {
  const words = { ...DEFAULT_ONBOARDING_WIZARD_LABELS, ...labels };
  const uid = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const index = Math.min(Math.max(current, 0), Math.max(steps.length - 1, 0));
  const shownIndex = useRef(index);
  const step = steps[index];
  const last = index === steps.length - 1;
  useEffect(() => {
    // Only when the step changes, not on the first render: the page decides initial focus.
    if (shownIndex.current === index) return;
    shownIndex.current = index;
    heading.current?.focus();
  }, [index]);
  if (!step) return null;
  const Heading = `h${headingLevel}` as 'h2' | 'h3';
  const progress = words.progress(index + 1, steps.length);
  return (
    <form
      className={`pu-wizard${className ? ` ${className}` : ''}`}
      aria-labelledby={`${uid}-heading`}
      noValidate
      data-testid={testId}
      onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!busy && !nextDisabled) onNext(); }}
    >
      <nav aria-label={words.steps} className="pu-wizard-nav">
        <ol className="pu-wizard-steps">
          {steps.map((s, i) => {
            const state = i < index ? 'done' : i === index ? 'current' : 'upcoming';
            const body = (
              <>
                <span className="pu-wizard-num" aria-hidden="true">{state === 'done' ? <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="M3 8.5 6.5 12 13 4.5" /></svg> : showDigits(i + 1, digits)}</span>
                <span className="pu-wizard-name">{s.title}</span>
                <span className="kit-sr">, {words[state]}</span>
              </>
            );
            return (
              <li key={s.id} className="pu-wizard-step" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
                {state === 'done' && onStepSelect && !busy
                  ? <button type="button" className="pu-wizard-jump" onClick={() => onStepSelect(i)}>{body}</button>
                  : <span className="pu-wizard-jump">{body}</span>}
              </li>
            );
          })}
        </ol>
        <div className="pu-wizard-bar" aria-hidden="true"><span style={{ inlineSize: `${((index + 1) / steps.length) * 100}%` }} /></div>
      </nav>
      <div className="pu-wizard-head">
        <p className="pu-wizard-progress" id={`${uid}-progress`}>{showDigits(progress, digits)}</p>
        <Heading className="pu-wizard-title" id={`${uid}-heading`} ref={heading} tabIndex={-1} aria-describedby={`${uid}-progress`}>{step.title}</Heading>
        {step.description && <p className="pu-wizard-desc">{step.description}</p>}
      </div>
      <div className="pu-wizard-body">{children}</div>
      <div className="pu-wizard-actions">
        {onBack && index > 0 && <Button type="button" variant="secondary" onClick={onBack} disabled={busy} testId={testId && `${testId}-back`}>{words.back}</Button>}
        <Button type="submit" loading={busy} disabled={nextDisabled} testId={testId && `${testId}-next`}>{last ? words.submit : words.next}</Button>
      </div>
      <span className="kit-sr" role="status">{showDigits(`${progress}: ${step.title}`, digits)}</span>
    </form>
  );
}
