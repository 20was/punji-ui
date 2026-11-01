'use client';
/**
 * CheckList, CheckRow and StatusDisc (design.punji.app/components/check-row):
 * a list of checks, one row each. A row leads with a StatusDisc (an icon in a
 * tinted chip: the check's tone), then its title and one line of what it
 * found, an optional small visual (a compact chart), its figure, its status as
 * words (a StatusPill) and a chevron. A row that opens something is a button
 * (`onClick`, pressed while its detail shows) or a link (`href`); a row with
 * nothing to open is plain. Rows are separated by hairlines, never boxed. In a
 * list under 600px wide the visual hides and the figure stacks over its
 * status.
 *
 * The status is always words with the tone, never colour alone; the disc's
 * icon says it a second time. Rows render a list item: draw them inside a
 * CheckList.
 */
import type { AriaAttributes, KeyboardEvent, ReactNode } from 'react';
import type { LinkComponent } from '../internal/link.tsx';

import { StatusPill } from '../status-pill/StatusPill.tsx';

export type CheckTone = 'gain' | 'warn' | 'loss' | 'info' | 'series3' | 'neutral';

/** The icon chip that leads a row or a panel: the tone tints it. `size="lg"` is the 44px tile of a title. Decorative: the words beside it carry the meaning. */
export function StatusDisc({ tone = 'neutral', size, children, testId }: {
  /** The disc's tint. Default neutral. */
  tone?: CheckTone;
  /** 'lg' for the 44px tile that leads a title. */
  size?: 'lg';
  /** The icon, drawn in the disc. */
  children: ReactNode;
  /** Sets `data-testid` on the disc. */
  testId?: string;
}) {
  return (
    <span className={`kit-disc${tone === 'neutral' ? '' : ` ${tone}`}${size === 'lg' ? ' lg' : ''}`} aria-hidden="true" data-testid={testId} data-tone={tone}>
      {children}
    </span>
  );
}

/**
 * The rows' list: a `ul`, or with `role="tablist"` a vertical tab list beside
 * its panel (Arrow Up/Down, Home and End move focus between the tabs; the
 * caller's `onKeyDown` runs first and can cancel that). A tab list needs a
 * name (`label` or `labelledBy`). Its width decides the rows' layout.
 */
export function CheckList({ children, label, labelledBy, role, onKeyDown, testId }: {
  /** The `CheckRow`s. */
  children: ReactNode;
  /** Names the list for screen readers. A tab list needs this or `labelledBy`. */
  label?: string;
  /** The id of an element that names the list. */
  labelledBy?: string;
  /** 'list' (default) or 'tablist' for a vertical tab list beside its panel. */
  role?: 'tablist' | 'list';
  /** Tab list only: a key handler that runs before the built-in arrow keys. */
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
  /** Sets `data-testid` on the list. */
  testId?: string;
}) {
  if (role === 'tablist')
    return (
      <div
        className="kit-crows"
        role="tablist"
        aria-orientation="vertical"
        tabIndex={-1}
        aria-label={label}
        aria-labelledby={labelledBy}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          const tabs = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')];
          const at = tabs.indexOf(document.activeElement as HTMLElement);
          if (at < 0 || tabs.length === 0) return;
          const to = e.key === 'ArrowDown' ? (at + 1) % tabs.length : e.key === 'ArrowUp' ? (at - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
          if (to < 0) return;
          e.preventDefault();
          tabs[to]?.focus();
        }}
        data-testid={testId}
      >
        {children}
      </div>
    );
  return (
    <ul className="kit-crows" aria-label={label} aria-labelledby={labelledBy} data-testid={testId}>
      {children}
    </ul>
  );
}

const Chevron = () => (
  <svg className="pu-flip" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export interface CheckRowProps {
  /** The icon in the disc. */
  icon: ReactNode;
  /** The disc's tint: the check's tone ('neutral' for a row with no verdict). */
  tone?: CheckTone;
  /** The check's name, the row's main text. */
  title: ReactNode;
  /** One line under the title: what the check found, or the row's state. */
  line?: ReactNode;
  /** A small visual between the words and the figure (a compact chart); decorative, hidden in a narrow list. */
  trail?: ReactNode;
  /** The figure, the row's loudest text. Never truncated. */
  figure?: ReactNode;
  /** Under the figure: its change or what it is. */
  figureSub?: ReactNode;
  /** A tone for `figureSub`; its words must carry the sign. */
  figureSubTone?: 'gain' | 'loss';
  /** One control at the row's end in the chevron's place (a row that only invites: "Add a holding"). The row itself is then plain. */
  action?: ReactNode;
  /** The status in words ("OK", "Watch", "Below minimum"), as a pill of the tone. */
  status?: { label: ReactNode; tone?: 'gain' | 'warn' | 'loss' } | null;
  /** 'check' (default): a check with a verdict; 'report': a quieter row of what a report holds. */
  kind?: 'check' | 'report';
  /** Makes the row a button (when it has no `action`). With `tab` it is a tab. */
  onClick?: () => void;
  /** Makes the row a link (when it has no `action`). */
  href?: string;
  /** The link element for an in-app `href` (wrap your router's link). Default: a plain <a>. Absolute http(s) addresses are always a plain <a>. */
  linkComponent?: LinkComponent;
  /** Force a plain <a> for an address the router should not handle. */
  external?: boolean;
  /** Link target; `_blank` adds rel="noopener noreferrer". */
  target?: string;
  /** The row's detail is showing (aria-pressed on a button). */
  pressed?: boolean;
  /** Tab semantics (a button row only), when the list is a tab list beside its panel. */
  tab?: { selected: boolean; controls: string; id: string; tabIndex: number };
  /** The row's whole sentence for screen readers, when the visible words are short forms. */
  ariaLabel?: string;
  /** Sets `aria-haspopup` on a button row that opens a menu or dialog. */
  ariaHasPopup?: AriaAttributes['aria-haspopup'];
  /** A `data-row` hook for the caller (analytics-free: a plain attribute). */
  dataRow?: string;
  /** Sets `data-testid` on the row; the figure gets `<id>-value` and the status `<id>-status`. */
  testId?: string;
}

export function CheckRow({ icon, tone = 'neutral', title, line, trail, figure, figureSub, figureSubTone, status, action, kind = 'check', onClick, href, linkComponent, external, target, pressed, tab, ariaLabel, ariaHasPopup, dataRow, testId }: CheckRowProps) {
  const cls = `kit-crow${kind === 'report' ? ' is-report' : ''}${trail ? ' has-trail' : ''}${status ? ' has-status' : ''}${action ? ' has-action' : ''}`;
  const pressable = !!(onClick || href);
  const body = (
    <>
      <StatusDisc tone={tone}>{icon}</StatusDisc>
      <span className="kit-crow-b">
        <span className="kit-crow-t">{title}</span>
        {line && <span className="kit-crow-l">{line}</span>}
      </span>
      {trail && (
        <span className="kit-crow-trail" aria-hidden="true">
          {trail}
        </span>
      )}
      <span className="kit-crow-end">
        {((figure !== undefined && figure !== null) || figureSub) && (
          <span className="kit-crow-fig">
            {figure !== undefined && figure !== null && <b data-testid={testId ? `${testId}-value` : undefined}>{figure}</b>}
            {figureSub && <small className={figureSubTone}>{figureSub}</small>}
          </span>
        )}
        {status && (
          <span className="kit-crow-st">
            <StatusPill size="sm" tone={status.tone} testId={testId ? `${testId}-status` : undefined}>
              {status.label}
            </StatusPill>
          </span>
        )}
      </span>
      {action ? (
        <span className="kit-crow-act">{action}</span>
      ) : pressable ? (
        <span className="kit-crow-chev" aria-hidden="true">
          <Chevron />
        </span>
      ) : (
        <span aria-hidden="true" />
      )}
    </>
  );
  const common = { className: cls, 'aria-label': ariaLabel, 'data-row': dataRow, 'data-testid': testId, 'data-tone': tone };
  if (href && !action) {
    const L = linkComponent && !external && !/^https?:/.test(href) ? linkComponent : 'a';
    return (
      <li>
        <L {...common} href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>
          {body}
        </L>
      </li>
    );
  }
  if (onClick && !action) {
    const tabProps = tab ? { role: 'tab' as const, 'aria-selected': tab.selected, 'aria-controls': tab.controls, id: tab.id, tabIndex: tab.tabIndex } : { 'aria-pressed': pressed, 'aria-haspopup': ariaHasPopup };
    const b = (
      <button type="button" {...common} onClick={onClick} {...tabProps}>
        {body}
      </button>
    );
    return tab ? b : <li>{b}</li>;
  }
  const plain = <div {...common}>{body}</div>;
  return tab ? <div role="presentation">{plain}</div> : <li>{plain}</li>;
}
