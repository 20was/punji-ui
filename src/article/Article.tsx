'use client';

/**
 * The article kit (design.punji.app/components/article): the parts of a long
 * explainer or guide that are not prose. A `Callout` for the one thing a reader
 * must not miss, `KeyFacts` for the at-a-glance panel, a `Timeline` of dated
 * events (Bikram Sambat and Gregorian), a `StepFlow` for a sequence, `Sources`
 * for the citations, a `CaveatList` for what to know before trusting a figure,
 * and the `TableOfContents`. All of it is real markup, never an image, so the
 * content is in server HTML for a crawler, an answer engine and a screen reader.
 *
 * Meaning never rests on colour alone: a Callout has an icon and a title in
 * words, a Timeline's order is an ordered list, a StepFlow's numbers are list
 * numbers. Text keeps a readable line length and the blocks print without their
 * backgrounds. Words are replaceable through `labels`.
 */
import { useId } from 'react';
import type { ReactNode } from 'react';

import { BsStatusMark, DEFAULT_BS_DATE_LABELS, dualDateText, type BsDateLabels } from '../internal/dualDate.tsx';
import { AppLink } from '../internal/link.tsx';
import type { LinkComponent } from '../internal/link.tsx';

export * from './TableOfContents.tsx';

type Level = 2 | 3 | 4 | 5 | 6;

/* Callout ------------------------------------------------------------- */

/** Callout's words: the title each tone shows when you give none. */
export interface CalloutLabels {
  /** neutral. Default "Note". */
  neutral?: string;
  /** info. Default "Information". */
  info?: string;
  /** accent, the tip. Default "Tip". */
  accent?: string;
  /** warn. Default "Warning". */
  warn?: string;
  /** danger. Default "Important". */
  danger?: string;
}

export interface CalloutProps {
  /** neutral (default), info, accent (a tip), warn or danger. Each has its own icon and default title. */
  tone?: 'neutral' | 'info' | 'accent' | 'warn' | 'danger';
  /** The title, in words: it names the tone for a screen reader. Default: the tone's word from `labels`. */
  label?: ReactNode;
  /** The callout's text. */
  children: ReactNode;
  /** Replaces the tone's icon (an svg or an Icon); keep it decorative. */
  icon?: ReactNode;
  /** Its words. */
  labels?: CalloutLabels;
  /** Becomes data-testid on the root. */
  testId?: string;
  /** Extra class names on the root. */
  className?: string;
}

const CALLOUT_WORDS: Required<CalloutLabels> = { neutral: 'Note', info: 'Information', accent: 'Tip', warn: 'Warning', danger: 'Important' };

function ToneMark({ tone }: { tone: NonNullable<CalloutProps['tone']> }) {
  return (
    <svg className="pu-callout-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {tone === 'warn' ? (
        <>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4M12 17h.01" />
        </>
      ) : tone === 'danger' ? (
        <>
          <path d="M8.3 2.5h7.4l5.8 5.8v7.4l-5.8 5.8H8.3l-5.8-5.8V8.3z" />
          <path d="M12 8v5M12 16.5h.01" />
        </>
      ) : tone === 'accent' ? (
        <>
          <path d="M9 18h6M10 21.5h4" />
          <path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.7v.5h6V16c0-.7.3-1.3.8-1.7A6.5 6.5 0 0 0 12 2.5z" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 11v5M12 8h.01" />
        </>
      )}
    </svg>
  );
}

/**
 * The one thing a reader must not miss: the gap between announced and in force, a warning, a tip.
 * @stability beta
 */
export function Callout({ tone = 'neutral', label, children, icon, labels, testId, className }: CalloutProps) {
  const title = label ?? { ...CALLOUT_WORDS, ...labels }[tone];
  const id = useId();
  return (
    // role="note", not <aside>: a callout is part of the article, so it must not add a complementary landmark.
    <div className={`pu-callout${className ? ` ${className}` : ''}`} data-tone={tone} role="note" aria-labelledby={id} data-testid={testId}>
      {icon ?? <ToneMark tone={tone} />}
      <div className="pu-callout-main">
        <p className="pu-callout-title" id={id}>{title}</p>
        <div className="pu-callout-body">{children}</div>
      </div>
    </div>
  );
}

/* KeyFacts ------------------------------------------------------------ */

export interface KeyFact {
  /** What the fact is ("Effective from"). */
  label: ReactNode;
  /** The fact ("Shrawan 1, 2083"). */
  value: ReactNode;
  /** A second line, for the qualifier a value needs to be honest ("proposed, not in force"). */
  note?: ReactNode;
}

export interface KeyFactsProps {
  /** The facts in reading order. */
  facts: readonly KeyFact[];
  /** The panel's title ("At a glance"). */
  heading?: ReactNode;
  /** Becomes data-testid on the root. */
  testId?: string;
  /** Extra class names on the root. */
  className?: string;
}

/**
 * The at-a-glance panel: who, when, how many, in force or not, as a definition list.
 * @stability beta
 */
export function KeyFacts({ facts, heading: title, testId, className }: KeyFactsProps) {
  return (
    <div className={`pu-keyfacts${className ? ` ${className}` : ''}`} role={title ? 'group' : undefined} aria-label={typeof title === 'string' ? title : undefined} data-testid={testId}>
      {title && <p className="pu-keyfacts-title">{title}</p>}
      <dl className="pu-keyfacts-list">
        {facts.map((f, i) => (
          <div key={i} className="pu-keyfacts-row">
            <dt>{f.label}</dt>
            <dd>
              {f.value}
              {f.note && <span className="pu-keyfacts-note">{f.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* Timeline ------------------------------------------------------------ */

/** Timeline's words. */
export interface TimelineLabels extends Partial<BsDateLabels> {
  /** Printed after a Bikram Sambat date. Default "BS". */
  bs?: string;
  /** Printed after a Gregorian date. Default "AD". */
  ad?: string;
}

export interface Milestone {
  /** A Gregorian day as `YYYY-MM-DD` (printed in Bikram Sambat and Gregorian, in a <time>), or any text as it is stated ("Mid-2026"). */
  date: string;
  /** A short tag for where this sits: "Now", "In force", "Proposed". A date alone does not say whether it is now or later. */
  tag?: ReactNode;
  /** What happens then. */
  items: readonly ReactNode[];
}

export interface TimelineProps {
  /** The events in the order to read them. */
  milestones: readonly Milestone[];
  /** Which calendar leads an ISO date: 'bs' (default) or 'ad'. */
  primary?: 'bs' | 'ad';
  /** Month names: 'en' (default) or 'ne'. */
  language?: 'en' | 'ne';
  /** Digits: 'latn' (default) or 'deva'. */
  digits?: 'latn' | 'deva';
  /** The heading above it, as the list's name. */
  label?: string;
  /** Its words. */
  labels?: TimelineLabels;
  /** Becomes data-testid on the list. */
  testId?: string;
  /** Extra class names on the list. */
  className?: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A dated plan as an ordered list, with each ISO date in Bikram Sambat and Gregorian.
 * @stability beta
 */
export function Timeline({ milestones, primary = 'bs', language, digits, label, labels, testId, className }: TimelineProps) {
  const words = { bs: 'BS', ad: 'AD', ...DEFAULT_BS_DATE_LABELS, ...labels };
  return (
    <ol className={`pu-timeline${className ? ` ${className}` : ''}`} aria-label={label} data-testid={testId}>
      {milestones.map((m, i) => {
        const parts = ISO_DAY.test(m.date) ? dualDateText(m.date, { language, digits }) : null;
        const mark = <BsStatusMark status={parts?.bsStatus} labels={words} />;
        const bsText = parts?.bs ? <>{parts.bs} {words.bs}{mark}</> : null;
        const day = parts?.ad ? (primary === 'bs' && parts.bs ? [bsText, `${parts.ad} ${words.ad}`] : [`${parts.ad} ${words.ad}`, bsText]) : null;
        return (
          <li key={`${m.date}-${i}`} className="pu-timeline-item">
            <div className="pu-timeline-head">
              {day ? (
                <time className="pu-timeline-date" dateTime={m.date}>
                  <span>{day[0]}</span>
                  {day[1] && <> <span className="pu-timeline-alt">{day[1]}</span></>}
                </time>
              ) : (
                <span className="pu-timeline-date">{m.date}</span>
              )}
              {m.tag && <span className="pu-timeline-tag">{m.tag}</span>}
            </div>
            <ul className="pu-timeline-events">
              {m.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

/* StepFlow ------------------------------------------------------------ */

export interface FlowStep {
  /** The step in a few words. */
  title: ReactNode;
  /** What to do or what happens. */
  detail?: ReactNode;
}

export interface StepFlowProps {
  /** The steps in order. */
  steps: readonly FlowStep[];
  /** A line above the steps, naming the sequence ("How a margin loan works"); also the list's name. */
  label?: string;
  /** Becomes data-testid on the root. */
  testId?: string;
  /** Extra class names on the root. */
  className?: string;
}

/**
 * How a mechanic works as numbered steps in reading order (real list numbers).
 * @stability beta
 */
export function StepFlow({ steps, label, testId, className }: StepFlowProps) {
  return (
    <div className={`pu-stepflow${className ? ` ${className}` : ''}`} data-testid={testId}>
      {label && <p className="pu-stepflow-label">{label}</p>}
      <ol className="pu-stepflow-steps" aria-label={label}>
        {steps.map((s, i) => (
          <li key={i}>
            <p className="pu-stepflow-title">{s.title}</p>
            {s.detail && <p className="pu-stepflow-detail">{s.detail}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* Sources ------------------------------------------------------------- */

/** Sources' words. */
export interface SourcesLabels {
  /** The heading. Default "Sources". */
  title?: string;
  /** Said after a link that opens another site in a new tab. Default "(opens in a new tab)". */
  newTab?: string;
}

export interface Source {
  /** The address: an `https://` page (a new tab) or an in-app path (the router link). Passed through `safeHref`. */
  url: string;
  /** The title of the report or page. */
  label: string;
  /** Who published it. */
  publisher: string;
  /** When, as stated ("12 Jan 2026"). */
  date?: string;
}

export interface SourcesProps {
  /** The citations. */
  items: readonly Source[];
  /** The heading level (2 to 6) so the outline stays right. Default 2. */
  headingLevel?: Level;
  /** Its words. */
  labels?: SourcesLabels;
  /** Link component for in-app urls; wins over LinkProvider. */
  linkComponent?: LinkComponent;
  /** Becomes data-testid on the root. */
  testId?: string;
  /** Extra class names on the root. */
  className?: string;
}

const isExternal = (url: string) => /^https?:\/\//i.test(url.trim());

/**
 * The published sources behind an article's claims, so a reader can check each against where it was announced.
 * @stability beta
 */
export function Sources({ items, headingLevel = 2, labels, linkComponent, testId, className }: SourcesProps) {
  const words = { title: 'Sources', newTab: '(opens in a new tab)', ...labels };
  const Heading = `h${headingLevel}` as 'h2';
  return (
    <section className={`pu-sources${className ? ` ${className}` : ''}`} data-testid={testId}>
      <Heading className="pu-sources-title">{words.title}</Heading>
      <ul className="pu-sources-list">
        {items.map((s, i) => {
          const external = isExternal(s.url);
          return (
            <li key={`${s.url}-${i}`}>
              <AppLink href={s.url} external={external} linkComponent={linkComponent} target={external ? '_blank' : undefined} className="pu-sources-link">
                {s.label}
                {external && <span className="pu-sources-sr"> {words.newTab}</span>}
              </AppLink>{' '}
              <span className="pu-sources-meta">{s.date ? `${s.publisher}, ${s.date}` : s.publisher}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* CaveatList ---------------------------------------------------------- */

export interface CaveatFact {
  /** What the figure stands on ("Data as of"). */
  label: ReactNode;
  /** Its value. */
  value: ReactNode;
}

export interface CaveatListProps {
  /** The title ("Before you trust this"). */
  title: ReactNode;
  /** What to know first. Put the most specific first and keep it to five. */
  notes: readonly ReactNode[];
  /** The facts the figure stands on, as label and value rows. */
  facts?: readonly CaveatFact[];
  /** One closing line. */
  foot?: ReactNode;
  /** The title's heading level (2 to 6). Default 2. */
  headingLevel?: Level;
  /** Becomes data-testid on the root; the notes, facts and foot get `<testId>-notes`, `-facts` and `-foot`. */
  testId?: string;
  /** Extra class names on the root. */
  className?: string;
}

/**
 * What a reader should know before trusting a figure: notes, the facts it stands on, one closing line. A card of its own, never inside another.
 * @stability beta
 */
export function CaveatList({ title, notes, facts = [], foot, headingLevel = 2, testId, className }: CaveatListProps) {
  const Heading = `h${headingLevel}` as 'h2';
  const base = testId;
  return (
    <section className={`pu-caveat${className ? ` ${className}` : ''}`} data-testid={testId}>
      <Heading className="pu-caveat-title">{title}</Heading>
      {notes.length > 0 && (
        <ul className="pu-caveat-notes" data-testid={base ? `${base}-notes` : undefined}>
          {notes.map((n, i) => (
            <li key={i}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
      {facts.length > 0 && (
        <dl className="pu-caveat-facts" data-testid={base ? `${base}-facts` : undefined}>
          {facts.map((f, i) => (
            <div key={i}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {foot && (
        <p className="pu-caveat-foot" data-testid={base ? `${base}-foot` : undefined}>
          {foot}
        </p>
      )}
    </section>
  );
}
