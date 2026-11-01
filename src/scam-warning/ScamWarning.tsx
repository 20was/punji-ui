'use client';

/**
 * ScamWarning: a full-stop interstitial before a payment that looks like a known scam (a new payee asking for a
 * "safe account" transfer, an investment with guaranteed returns, someone pretending to be the bank or the police).
 * Built on what UK and EU authorised push payment fraud guidance found works: name the specific scam, ask the
 * questions a scammer tells victims to lie about, make cancelling the obvious choice, and make continuing a
 * deliberate act (an acknowledgement, and optionally a cooling-off delay).
 *
 * The heading takes focus when the warning appears, so a screen reader starts at the warning. "Cancel" is the primary
 * button and comes first. Your risk engine decides when to show it and with which `scenario`.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { Checkbox } from '../checkbox/Checkbox.tsx';
import { HoldToConfirm } from '../hold-to-confirm/HoldToConfirm.tsx';
import { useLocaleMessages } from '../locale/context.tsx';

export type ScamScenario = 'safe-account' | 'investment' | 'impersonation' | 'purchase' | 'romance' | 'urgent-request';

export interface ScamWarningCopy {
  /** What this scam looks like, one or two sentences. */
  summary: string;
  /** Yes/no questions the person should ask themselves. */
  questions: readonly string[];
}

/** Built-in English copy for each scenario. Replace it through `copy` for other languages or your own research. */
export const SCAM_SCENARIOS: Readonly<Record<ScamScenario, ScamWarningCopy>> = Object.freeze({
  'safe-account': {
    summary: 'No bank, police force or government office will ever ask you to move money to a "safe account". Anyone who does is a criminal.',
    questions: ['Did someone call, message or email you and ask you to move your money?', 'Were you told your account is at risk?', 'Were you told not to tell the bank the real reason?'],
  },
  investment: {
    summary: 'Promises of guaranteed or very high returns, crypto "opportunities" and pressure to invest quickly are signs of investment fraud.',
    questions: ['Were you promised returns that seem too good to be true?', 'Did you find this through social media, a celebrity advert or someone you met online?', 'Are you being rushed to pay before an offer ends?'],
  },
  impersonation: {
    summary: 'Criminals pretend to be your bank, a delivery company, the tax office, a utility or a family member, and copy their names and numbers.',
    questions: ['Did the request come by phone, text or email rather than from you?', 'Were you asked to pay a fee, fine or bill you did not expect?', 'Has a family member asked for money from a new number?'],
  },
  purchase: {
    summary: 'If you are paying by bank transfer for something you have not seen, from a seller you do not know, you may not get your money back.',
    questions: ['Have you seen the item, or the property, in person?', 'Is the price much lower than elsewhere?', 'Did the seller ask you to pay outside the marketplace?'],
  },
  romance: {
    summary: 'People met online who ask for money, however close you feel to them, are very often criminals.',
    questions: ['Have you met this person face to face?', 'Have they asked for money for an emergency, travel or an investment?', 'Have they asked you to keep it secret?'],
  },
  'urgent-request': {
    summary: 'Pressure to pay right now, or to keep a payment secret, is the most common sign of a scam.',
    questions: ['Are you being told to act immediately?', 'Have you been told what to say if the bank asks?', 'Are you being asked to pay by transfer, gift cards or crypto only?'],
  },
});

export interface ScamWarningLabels {
  /** Heading. Default "Stop. This could be a scam." */
  title?: string;
  /** Lead-in to the questions. Default "Ask yourself:" */
  questionsTitle?: string;
  /** Default "Cancel this payment". */
  cancel?: string;
  /** Default "I have read this warning and want to continue". */
  acknowledge?: string;
  /** Default "Continue to payment". */
  proceed?: string;
}

export interface ScamWarningProps {
  /** Which scam this payment looks like. */
  scenario: ScamScenario;
  /** Replace the built-in summary and questions (for another language, or your own). */
  copy?: ScamWarningCopy;
  /** Stop: the primary action. */
  onCancel: () => void;
  /** Continue anyway, after the acknowledgement (and the cooling-off, if any). Leave it out to block the payment. */
  onProceed?: () => void;
  /** Seconds before "Continue" works once acknowledged, 0 to 120. Default 0 (no delay). */
  coolingOffSeconds?: number;
  /** Who to talk to: a phone number or a link to your fraud team. */
  help?: ReactNode;
  /** Words, in the reader's language. */
  labels?: ScamWarningLabels;
  /** Becomes data-testid on the root. */
  testId?: string;
}

export function ScamWarning({ scenario, copy, onCancel, onProceed, coolingOffSeconds = 0, help, labels = {}, testId }: ScamWarningProps) {
  if (!Number.isInteger(coolingOffSeconds) || coolingOffSeconds < 0 || coolingOffSeconds > 120) throw new RangeError('coolingOffSeconds must be a whole number from 0 to 120');
  const {
    title = 'Stop. This could be a scam.', questionsTitle = 'Ask yourself:', cancel = 'Cancel this payment',
    acknowledge = 'I have read this warning and want to continue', proceed = 'Continue to payment', scenarios,
  } = { ...useLocaleMessages().messages.scamWarning, ...labels };
  const text = copy ?? scenarios?.[scenario] ?? SCAM_SCENARIOS[scenario];
  if (!text) throw new RangeError(`Unknown scam scenario: ${scenario}`);
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  useEffect(() => { heading.current?.focus(); }, []);

  return (
    <section className="pu-scam" aria-labelledby={`${id}-t`} data-scenario={scenario} data-testid={testId}>
      <div className="pu-scam-head">
        <svg className="pu-scam-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3 2 21h20L12 3Z" />
          <path d="M12 10v5" />
          <path d="M12 18v.1" />
        </svg>
        <h2 className="pu-scam-title" id={`${id}-t`} ref={heading} tabIndex={-1}>{title}</h2>
      </div>
      <p className="pu-scam-summary">{text.summary}</p>
      {text.questions.length > 0 && (
        <>
          <p className="pu-scam-qtitle">{questionsTitle}</p>
          <ul className="pu-scam-questions">
            {text.questions.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </>
      )}
      {help && <div className="pu-scam-help">{help}</div>}
      <div className="pu-scam-actions">
        <button type="button" className="kit-btn primary lg" onClick={onCancel}>{cancel}</button>
      </div>
      {onProceed && (
        <div className="pu-scam-continue">
          <Checkbox checked={acknowledged} onChange={setAcknowledged}>{acknowledge}</Checkbox>
          {coolingOffSeconds > 0 && acknowledged ? (
            <HoldToConfirm mode="cooling-off" delaySeconds={coolingOffSeconds} tone="primary" onConfirm={onProceed}>{proceed}</HoldToConfirm>
          ) : (
            <button type="button" className="kit-btn secondary" aria-disabled={!acknowledged || undefined} onClick={() => { if (acknowledged) onProceed(); }}>{proceed}</button>
          )}
        </div>
      )}
    </section>
  );
}
