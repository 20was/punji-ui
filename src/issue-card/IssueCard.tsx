'use client';

/**
 * IssueCard and IssueList: share issues open for application (IPO, FPO, right share, mutual fund, debenture) as
 * cards. Each card names the company and the kind, says where the issue stands today in words (Upcoming, Open,
 * Closes today, Closed) with the days left, prints the open and close dates in Bikram Sambat and Gregorian, and
 * lists the units on offer, the price per unit and the kitta rules. A display: the Apply button is yours.
 */
import { useId, useMemo, useState, type ReactNode } from 'react';

import { ChipRow } from '../controls/Controls.tsx';
import { DualDate, formatUnits } from '../internal/dualDate.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { nepalMoneyConfig, type MoneyFormatConfig } from '../money/money.ts';
import type { NepalLanguage } from '../nepal/locale.ts';
import {
  ISSUE_STATUS_LABELS, SHARE_ISSUE_KIND_LABELS, daysBetween, issueStatus, sortIssues, type IssueStatus, type ShareIssue, type ShareIssueKind,
} from '../share-issues/issues.ts';
import { EmptyState } from '../states/States.tsx';
import { StatusPill } from '../status-pill/StatusPill.tsx';

const TONES: Record<IssueStatus, 'gain' | 'warn' | 'info' | undefined> = { open: 'gain', 'closing-today': 'warn', upcoming: 'info', closed: undefined };

export interface IssueCardLabels {
  opens: string;
  closes: string;
  units: string;
  price: string;
  kitta: string;
  issueManager: string;
  /** "Opens in 3 days", "Closes in 2 days", "Closed 5 days ago". `days` is positive. */
  countdown: (status: IssueStatus, days: number) => string;
  /** "10 to 1,000 (multiples of 10)". */
  kittaRange: (min: string, max: string, multiple: string | null) => string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const DEFAULT_ISSUE_CARD_LABELS: IssueCardLabels = {
  opens: 'Opens',
  closes: 'Closes',
  units: 'Units on offer',
  price: 'Price per unit',
  kitta: 'Kitta per application',
  issueManager: 'Issue manager',
  countdown: (status, days) => status === 'upcoming' ? (days === 1 ? 'Opens tomorrow' : `Opens in ${plural(days, 'day')}`)
    : status === 'open' ? (days === 1 ? 'Closes tomorrow' : `Closes in ${plural(days, 'day')}`)
      : status === 'closing-today' ? 'Last day to apply' : `Closed ${plural(days, 'day')} ago`,
  kittaRange: (min, max, multiple) => `${min} to ${max}${multiple ? ` (multiples of ${multiple})` : ''}`,
};

export interface IssueCardProps {
  /** The issue to show or apply for. */
  issue: ShareIssue;
  /** Today as Gregorian `YYYY-MM-DD`, from your server's business day. Needed for the status and days left unless `status` is given. */
  today?: string;
  /** Override the status (for example from your server). */
  status?: IssueStatus;
  /** Which calendar leads in the dates. Default 'bs'. */
  primaryCalendar?: 'bs' | 'ad';
  /** Month names in dates. Default 'en'. */
  language?: NepalLanguage;
  /** Digits for dates, units and money. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Money format. Default NPR in lakh/crore grouping (Devanagari with `digits="deva"`). */
  money?: MoneyFormatConfig;
  /** Your button or link ("Apply"). Rendered as given. */
  action?: ReactNode;
  /** Words for the kinds, in the reader's language. */
  kindLabels?: Partial<Record<ShareIssueKind, string>>;
  /** Words for the statuses. */
  statusLabels?: Partial<Record<IssueStatus, string>>;
  /** Replace the words. */
  labels?: Partial<IssueCardLabels>;
  /** Heading level of the company name. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Extra class for layout. */
  className?: string;
  /** Sets `data-testid` on the card. */
  testId?: string;
}

export function IssueCard({
  issue, today, status: statusProp, primaryCalendar = 'bs', language, digits = 'latn', money, action, kindLabels, statusLabels, labels,
  headingLevel = 3, className, testId,
}: IssueCardProps) {
  const words = { ...DEFAULT_ISSUE_CARD_LABELS, ...labels };
  const uid = useId();
  const status = statusProp ?? (today ? issueStatus(issue, today) : null);
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const preset = money ?? nepalMoneyConfig({ language, digits });
  const days = today && status ? (status === 'upcoming' ? daysBetween(today, issue.openDate) : status === 'closed' ? daysBetween(issue.closeDate, today) : daysBetween(today, issue.closeDate)) : null;
  const multiple = issue.kittaMultiple ?? 10n;
  const dateProps = { primary: primaryCalendar, language, digits } as const;
  return (
    <article className={`pu-issue kit-card${className ? ` ${className}` : ''}`} aria-labelledby={`${uid}-name`} data-status={status ?? undefined} data-testid={testId}>
      <div className="pu-issue-head">
        <div className="pu-issue-id">
          <p className="pu-issue-kind">
            <StatusPill size="sm" tone="accent">{kindLabels?.[issue.kind] ?? SHARE_ISSUE_KIND_LABELS[issue.kind]}</StatusPill>
            {issue.shareGroup && <span>{issue.shareGroup}</span>}
          </p>
          <Heading className="pu-issue-name" id={`${uid}-name`}>
            {issue.company}
            {issue.symbol && <span className="pu-issue-sym"> ({issue.symbol})</span>}
          </Heading>
        </div>
        {status && (
          <StatusPill tone={TONES[status]} dot size="sm" className="pu-issue-status" testId={testId ? `${testId}-status` : undefined}>
            {statusLabels?.[status] ?? ISSUE_STATUS_LABELS[status]}
          </StatusPill>
        )}
      </div>
      <dl className="pu-issue-dates">
        <div><dt>{words.opens}</dt><dd><DualDate value={issue.openDate} {...dateProps} /></dd></div>
        <div><dt>{words.closes}</dt><dd><DualDate value={issue.closeDate} {...dateProps} /></dd></div>
      </dl>
      {status && days !== null && <p className="pu-issue-countdown" data-testid={testId ? `${testId}-countdown` : undefined}>{words.countdown(status, days)}</p>}
      <dl className="pu-issue-facts">
        <div><dt>{words.units}</dt><dd>{formatUnits(issue.units, digits)}</dd></div>
        <div><dt>{words.price}</dt><dd><MoneyDisplay value={issue.pricePerUnit} preset={preset} /></dd></div>
        <div><dt>{words.kitta}</dt><dd>{words.kittaRange(formatUnits(issue.minKitta, digits), formatUnits(issue.maxKitta, digits), multiple > 1n ? formatUnits(multiple, digits) : null)}</dd></div>
        {issue.issueManager && <div><dt>{words.issueManager}</dt><dd>{issue.issueManager}</dd></div>}
      </dl>
      {action && <div className="pu-issue-actions">{action}</div>}
    </article>
  );
}

export interface IssueListLabels {
  /** The filter group's name. Default 'Issue type'. */
  filter: string;
  /** The "all kinds" chip. Default 'All'. */
  all: string;
  /** Empty list title. Default 'No issues to show'. */
  empty: string;
  /** Announced after filtering. Default "3 issues". */
  count: (n: number) => string;
}

export const DEFAULT_ISSUE_LIST_LABELS: IssueListLabels = {
  filter: 'Issue type', all: 'All', empty: 'No issues to show', count: (n) => (n === 1 ? '1 issue' : `${n} issues`),
};

export interface IssueListProps extends Omit<IssueCardProps, 'issue' | 'status' | 'action' | 'testId' | 'className'> {
  /** The issues, any order. */
  issues: readonly ShareIssue[];
  /** Today as Gregorian `YYYY-MM-DD`. Required: it sets each status and the order. */
  today: string;
  /** Order: 'status' (default: open, closing first; then upcoming; then closed) or 'given'. */
  order?: 'status' | 'given';
  /** Show kind filter chips (only kinds present, with counts). Default true when more than one kind is present. */
  filter?: boolean;
  /** Controlled kind filter ('all' or a kind). */
  kind?: ShareIssueKind | 'all';
  /** Called when a filter chip is pressed. */
  onKindChange?: (kind: ShareIssueKind | 'all') => void;
  /** Your action for one issue ("Apply" for open ones). */
  renderAction?: (issue: ShareIssue, status: IssueStatus) => ReactNode;
  /** Empty-state body. */
  emptyBody?: ReactNode;
  /** Replace the list's words. */
  listLabels?: Partial<IssueListLabels>;
  /** Names the list for screen readers. Default 'Share issues'. */
  label?: string;
  /** Extra class for layout. */
  className?: string;
  /** Sets `data-testid` on the root; cards get `<id>-<issue id>`. */
  testId?: string;
}

const KIND_ORDER: readonly ShareIssueKind[] = ['ipo', 'fpo', 'right', 'mutual-fund', 'debenture'];

export function IssueList({
  issues, today, order = 'status', filter, kind: kindProp, onKindChange, renderAction, emptyBody, listLabels, label = 'Share issues', className, testId, ...card
}: IssueListProps) {
  const words = { ...DEFAULT_ISSUE_LIST_LABELS, ...listLabels };
  const [own, setOwn] = useState<ShareIssueKind | 'all'>('all');
  const [announce, setAnnounce] = useState('');
  const kind = kindProp ?? own;
  const ordered = useMemo(() => (order === 'status' ? sortIssues(issues, today) : [...issues]), [issues, today, order]);
  const kinds = KIND_ORDER.filter((k) => issues.some((i) => i.kind === k));
  const showFilter = filter ?? kinds.length > 1;
  const shown = kind === 'all' ? ordered : ordered.filter((i) => i.kind === kind);
  const choose = (next: ShareIssueKind | 'all') => {
    if (kindProp === undefined) setOwn(next);
    onKindChange?.(next);
    setAnnounce(words.count(next === 'all' ? issues.length : issues.filter((i) => i.kind === next).length));
  };
  return (
    <div className={`pu-issue-list${className ? ` ${className}` : ''}`} data-testid={testId}>
      {showFilter && (
        <ChipRow
          label={words.filter}
          prefix={testId ? `${testId}-kind` : 'pu-issue-kind'}
          size="sm"
          wrap
          value={kind}
          onChange={choose}
          options={[
            { value: 'all' as const, label: words.all, count: issues.length },
            ...kinds.map((k) => ({ value: k, label: card.kindLabels?.[k] ?? SHARE_ISSUE_KIND_LABELS[k], count: issues.filter((i) => i.kind === k).length })),
          ]}
        />
      )}
      <p className="kit-sr" role="status">{announce}</p>
      {shown.length === 0 ? (
        <EmptyState title={words.empty} body={emptyBody} headingLevel={card.headingLevel ?? 3} />
      ) : (
        <ul className="pu-issue-grid" aria-label={label}>
          {shown.map((issue) => {
            const status = issueStatus(issue, today);
            return (
              <li key={issue.id}>
                <IssueCard {...card} issue={issue} today={today} status={status} action={renderAction?.(issue, status)} testId={testId ? `${testId}-${issue.id}` : undefined} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
