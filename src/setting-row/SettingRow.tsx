'use client';

/**
 * SettingRow and SettingList (design.punji.app/components/setting-row): one setting, one row. An optional StatusDisc
 * (what kind of setting) or a `lead` in its place (an Avatar), its title and one line under it (what it does, or its
 * state: "On · one summary after the close"), and its end:
 *
 *   toggle   a Switch that takes effect at once, named by the title and described by the line (the row is its label:
 *            a tap on the words flips it too)
 *   control  anything else (a SegmentedControl, a StatusTag, a Button); `stack` drops it under the words on a phone
 *   href / onClick   the whole row opens something, with a trail at the end: chevron (a page or a step), external
 *            (another site; with `newTab` it opens in a new tab and says so), expand (a step under the row:
 *            `expanded`, `controls`) or leave (signs out). `busy` puts a spinner in the trail's place.
 *
 * `danger` is the row that starts removing something (the removal itself asks in an InlineConfirm); `size="lg"` is the
 * account line at the top of a settings page. `note` is a quieter line under the row. Rows stack with hairlines in a
 * Card (in a SettingList when the card holds more than rows), or stand alone as a card's only content.
 */
import { useId, type ReactNode, type Ref } from 'react';

import { StatusDisc, type CheckTone } from '../check-row/CheckRow.tsx';
import { AppLink, type LinkComponent } from '../internal/link.tsx';
import { Switch } from '../switch/Switch.tsx';

export interface SettingListProps {
  /** The rows, and anything else the card holds (a description, an InlineConfirm). */
  children: ReactNode;
  /** Its rows are skeletons until a read answers: sets `aria-busy`. */
  busy?: boolean;
  /** Becomes data-testid on the list. */
  testId?: string;
}

/**
 * The rows of a card that holds more than rows, kept together and split by hairlines.
 * @stability beta
 */
export function SettingList({ children, busy, testId }: SettingListProps) {
  return (
    <div className="pu-set-list" aria-busy={busy || undefined} data-testid={testId}>
      {children}
    </div>
  );
}

/** What the end of a link or button row shows. */
export type SettingTrail = 'chevron' | 'external' | 'expand' | 'leave';

const TRAILS: Record<SettingTrail, ReactNode> = {
  chevron: <path d="m9 18 6-6-6-6" />,
  external: <path d="M9.5 5.5h9v9M18.5 5.5 6 18" />,
  expand: <path d="m6 9 6 6 6-6" />,
  leave: <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h11" />,
};

function Trail({ kind, busy }: { kind: SettingTrail; busy?: boolean }) {
  if (busy) return <span className="kit-spin pu-set-spin" aria-hidden="true" />;
  return (
    <svg className={`pu-set-tr${kind === 'external' ? ' ext' : ''}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {TRAILS[kind]}
    </svg>
  );
}

export interface SettingRowProps {
  /** The icon in the disc; none for a plain row. */
  icon?: ReactNode;
  /** In place of the disc: an Avatar. */
  lead?: ReactNode;
  /** The disc's tint. Default 'info'. */
  tone?: CheckTone;
  /** The setting's name. */
  title: ReactNode;
  /** One line under the title: what it does, or its state. */
  line?: ReactNode;
  /** A quieter line under the whole row. */
  note?: ReactNode;
  /** An on/off that takes effect at once: a Switch named by the title. */
  toggle?: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; busy?: boolean; testId?: string };
  /** Any other control at the row's end (or a StatusTag). */
  control?: ReactNode;
  /** The control drops under the words on a phone (a SegmentedControl). */
  stack?: boolean;
  /** The row opens this address: an in-app path through `linkComponent`, or an http(s) address as another site. */
  href?: string;
  /** The link element for an in-app `href` (wrap your router's link); default the nearest `LinkProvider`, else a plain <a>. */
  linkComponent?: LinkComponent;
  /** `href` is a full page load (a plain <a>, not the router's link). */
  external?: boolean;
  /** Another site, in a new tab, with `newTabLabel` said after the title. */
  newTab?: boolean;
  /** Said after the title of a new-tab row, in the reader's language. Default '(opens in a new tab)'. */
  newTabLabel?: string;
  /** The web kit's name for `newTabLabel`. @deprecated Use `newTabLabel`; same value. Kept until the next major. */
  externalLabel?: string;
  /** The row presses to do something (a button row). */
  onClick?: () => void;
  /** What a link or button row's end shows. Default 'chevron'. */
  trail?: SettingTrail;
  /** `trail="expand"`: whether the step under the row is open. */
  expanded?: boolean;
  /** `trail="expand"`: the id of the step under the row. */
  controls?: string;
  /** A button row that cannot be pressed now. */
  disabled?: boolean;
  /** A button row whose action is running: a spinner in the trail's place. */
  busy?: boolean;
  /** The row that starts removing something: the title and the disc in the loss colour. */
  danger?: boolean;
  /** 'lg': the account line (a larger title beside an Avatar). */
  size?: 'lg';
  /** React 19: a ref is a prop. On the button of a button row (focus it when a confirm step closes). */
  ref?: Ref<HTMLButtonElement>;
  /** Becomes data-testid on the row; parts get `<testId>-line`, `-note`, `-link`, `-button`. */
  testId?: string;
}

/**
 * @stability beta
 */
export function SettingRow({
  icon,
  lead,
  tone = 'info',
  title,
  line,
  note,
  toggle,
  control,
  stack,
  href,
  linkComponent,
  external,
  newTab,
  newTabLabel,
  externalLabel,
  onClick,
  trail = 'chevron',
  expanded,
  controls,
  disabled,
  busy,
  danger,
  size,
  ref,
  testId,
}: SettingRowProps) {
  const id = useId();
  const outLabel = newTabLabel ?? externalLabel ?? '(opens in a new tab)';
  const words = (
    <span className="pu-set-t">
      <b id={`${id}-t`}>
        {title}
        {newTab && <span className="kit-sr"> {outLabel}</span>}
      </b>
      {line && (
        <span id={`${id}-l`} data-testid={testId ? `${testId}-line` : undefined}>
          {line}
        </span>
      )}
    </span>
  );
  const disc = lead ?? (icon ? <StatusDisc tone={danger ? 'loss' : tone}>{icon}</StatusDisc> : null);
  const foot = note ? (
    <p className="pu-set-note" data-testid={testId ? `${testId}-note` : undefined}>
      {note}
    </p>
  ) : null;
  const cls = `pu-set${icon || lead ? ' has-icon' : ''}${danger ? ' danger' : ''}${size === 'lg' ? ' lg' : ''}`;

  if (href || onClick) {
    const body = (
      <>
        {disc}
        {words}
        <span className="pu-set-end">{control ?? <Trail kind={newTab && trail === 'chevron' ? 'external' : trail} busy={busy} />}</span>
      </>
    );
    const rowCls = `pu-set-row is-link${trail === 'expand' && expanded ? ' open' : ''}`;
    return (
      <div className={cls} data-testid={testId}>
        {href ? (
          <AppLink className={rowCls} href={href} linkComponent={linkComponent} external={external || newTab} target={newTab ? '_blank' : undefined} data-testid={testId ? `${testId}-link` : undefined}>
            {body}
          </AppLink>
        ) : (
          <button
            type="button"
            ref={ref}
            className={rowCls}
            onClick={onClick}
            disabled={disabled || busy}
            aria-busy={busy || undefined}
            aria-expanded={trail === 'expand' ? expanded === true : undefined}
            aria-controls={trail === 'expand' && expanded ? controls : undefined}
            data-testid={testId ? `${testId}-button` : undefined}
          >
            {body}
          </button>
        )}
        {foot}
      </div>
    );
  }

  return (
    <div className={`${cls}${toggle?.disabled ? ' is-off' : ''}`} data-testid={testId}>
      <div className={`pu-set-row${stack ? ' stack' : ''}`}>
        {disc}
        {toggle ? (
          /* The words are the switch's label: a tap on them flips it, as on a phone's settings. */
          <label className="pu-set-lab" htmlFor={`${id}-sw`}>
            {words}
          </label>
        ) : (
          words
        )}
        <span className="pu-set-end">
          {toggle ? (
            <Switch id={`${id}-sw`} checked={toggle.checked} onChange={toggle.onChange} disabled={toggle.disabled} busy={toggle.busy} labelledBy={`${id}-t`} describedBy={line ? `${id}-l` : undefined} testId={toggle.testId} />
          ) : (
            control
          )}
        </span>
      </div>
      {foot}
    </div>
  );
}
