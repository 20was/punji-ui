/**
 * InsurancePremiumCard: one policy's premium at a glance: plan and insurer, policy status (in force, grace period,
 * lapsed, matured; words and an icon, never colour alone), the premium and how often it is due, the next due date,
 * the sum assured and term, and an optional breakdown (base premium, riders, VAT, stamp duty) whose total is an exact
 * bigint sum. Display only: the insurer's schedule and receipt are the record.
 */
import type { ReactNode } from 'react';

import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { nepalMoneyPreset, type MoneyFormatConfig } from '../money/money.ts';
import { formatCalendarDate, parseCalendarDate } from '../nepal/date-only.ts';
import { showDigits } from '../internal/lendingDigits.ts';

export type PremiumFrequency = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'single';
export type PolicyStatus = 'active' | 'grace' | 'lapsed' | 'matured';

export interface PremiumLine {
  /** Stable unique id. */
  id: string;
  /** What the line is ("Accidental death rider", "VAT 13%"). Plain text. */
  label: string;
  /** Amount in minor units. */
  amount: bigint;
}

export interface InsurancePremiumCardLabels {
  /** Fact names. */
  premium: string;
  nextDue: string;
  sumAssured: string;
  term: string;
  policyNumber: string;
  breakdown: string;
  total: string;
  /** "per month" and so on, after the premium. */
  frequency: Record<PremiumFrequency, string>;
  status: Record<PolicyStatus, string>;
  /** "15 years". */
  years: (n: string) => string;
}

export const DEFAULT_INSURANCE_PREMIUM_CARD_LABELS: InsurancePremiumCardLabels = {
  premium: 'Premium', nextDue: 'Next due', sumAssured: 'Sum assured', term: 'Term', policyNumber: 'Policy number', breakdown: 'Premium breakdown', total: 'Total premium',
  frequency: { monthly: 'per month', quarterly: 'per quarter', 'half-yearly': 'every six months', yearly: 'per year', single: 'single premium' },
  status: { active: 'In force', grace: 'In grace period', lapsed: 'Lapsed', matured: 'Matured' },
  years: (n) => `${n} years`,
};

export interface InsurancePremiumCardProps {
  /** The plan's name ("Endowment Plus"). Plain text. */
  plan: string;
  /** The insurer's name, a display string. */
  insurer?: string;
  /** The policy number. Shown in full: pass a masked one if it should not be. */
  policyNumber?: string;
  /** Where the policy stands, from the insurer. */
  status?: PolicyStatus;
  /** The premium per instalment in minor units. Ignored when `breakdown` is given: the total of the lines is shown. */
  premium?: bigint | null;
  /** How often the premium is due. */
  frequency: PremiumFrequency;
  /** Lines that make up one premium. Their exact sum is the premium shown. */
  breakdown?: readonly PremiumLine[];
  /** The next due date, ISO 'YYYY-MM-DD'. */
  nextDueDate?: string;
  /** Your own text for the due date (a Bikram Sambat date, "in 12 days"). Replaces the formatted date. */
  nextDueLabel?: ReactNode;
  /** The sum assured in minor units. */
  sumAssured?: bigint;
  /** The policy term in years. */
  termYears?: number;
  /** Money format. Default NPR with lakh and crore grouping. */
  money?: MoneyFormatConfig;
  /** Words and digits: 'en' (default) or 'ne' for dates. */
  language?: 'en' | 'ne';
  /** Digits for dates and the term. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Buttons or links (Pay premium, Download schedule). */
  actions?: ReactNode;
  /** The plan heading's level. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Replace any words, for translation. */
  labels?: Partial<InsurancePremiumCardLabels>;
  /** Extra class on the card. */
  className?: string;
  /** Sets `data-testid` on the card. */
  testId?: string;
}

const STATUS_ICONS: Record<PolicyStatus, ReactNode> = {
  active: <path d="M3 8.5 6.5 12 13 4.5" />,
  grace: <><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.5l2 1.5" /></>,
  lapsed: <path d="m4.5 4.5 7 7m0-7-7 7" />,
  matured: <><circle cx="8" cy="8" r="5.5" /><path d="M5.5 8.2 7.3 10l3.2-3.6" /></>,
};

export function InsurancePremiumCard({
  plan, insurer, policyNumber, status, premium, frequency, breakdown, nextDueDate, nextDueLabel, sumAssured, termYears, money = nepalMoneyPreset,
  language = 'en', digits = 'latn', actions, headingLevel = 3, labels, className, testId,
}: InsurancePremiumCardProps) {
  const words = { ...DEFAULT_INSURANCE_PREMIUM_CARD_LABELS, ...labels, frequency: { ...DEFAULT_INSURANCE_PREMIUM_CARD_LABELS.frequency, ...labels?.frequency }, status: { ...DEFAULT_INSURANCE_PREMIUM_CARD_LABELS.status, ...labels?.status } };
  const total = breakdown && breakdown.length > 0 ? breakdown.reduce((sum, line) => sum + line.amount, 0n) : premium ?? null;
  const Heading = `h${headingLevel}` as 'h3';
  const due = nextDueLabel ?? (nextDueDate && parseCalendarDate(nextDueDate) ? formatCalendarDate(nextDueDate, { language, digits }) : null);
  return (
    <article className={`pu-premium${className ? ` ${className}` : ''}`} data-status={status} data-testid={testId}>
      <div className="pu-premium-head">
        <div className="pu-premium-id">
          <Heading className="pu-premium-plan">{plan}</Heading>
          {insurer && <p className="pu-premium-insurer">{insurer}</p>}
        </div>
        {status && (
          <span className="pu-premium-status" data-status={status}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{STATUS_ICONS[status]}</svg>
            {words.status[status]}
          </span>
        )}
      </div>
      <div className="pu-premium-amount">
        <span className="pu-premium-label">{words.premium}</span>
        <span className="pu-premium-figure"><MoneyDisplay value={total} preset={money} /> <span className="pu-premium-freq">{words.frequency[frequency]}</span></span>
      </div>
      <dl className="pu-premium-facts">
        {due && <div><dt>{words.nextDue}</dt><dd>{nextDueDate && !nextDueLabel ? <time dateTime={nextDueDate}>{due}</time> : due}</dd></div>}
        {sumAssured !== undefined && <div><dt>{words.sumAssured}</dt><dd><MoneyDisplay value={sumAssured} preset={money} /></dd></div>}
        {termYears !== undefined && <div><dt>{words.term}</dt><dd>{words.years(showDigits(termYears, digits))}</dd></div>}
        {policyNumber && <div><dt>{words.policyNumber}</dt><dd className="pu-premium-policy">{policyNumber}</dd></div>}
      </dl>
      {breakdown && breakdown.length > 0 && (
        <details className="pu-premium-breakdown">
          <summary>{words.breakdown}</summary>
          <dl>
            {breakdown.map((line) => <div key={line.id}><dt>{line.label}</dt><dd><MoneyDisplay value={line.amount} preset={money} /></dd></div>)}
            <div className="pu-premium-total"><dt>{words.total}</dt><dd><MoneyDisplay value={total} preset={money} /></dd></div>
          </dl>
        </details>
      )}
      {actions && <div className="pu-premium-actions">{actions}</div>}
    </article>
  );
}
