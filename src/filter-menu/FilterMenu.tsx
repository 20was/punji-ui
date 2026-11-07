'use client';

/**
 * FilterMenu, FilterMenuGroup and FilterMenuItem (design.punji.app/components/filter-menu): the list behind
 * "+ Add filter", by group. Groups sit two across on a wide popover and one under another when it is narrow.
 * An item opens that filter's editor; a yes/no item is a checkbox-like toggle (aria-pressed); an item that cannot
 * be used yet is disabled and its group says why in one line, never a silent grey: the note is tied to each
 * disabled item with aria-describedby, so a screen reader hears the reason on the item.
 *
 * Arrow Up and Down move between the enabled items (Home and End jump), across groups and columns in reading
 * order; Tab leaves the menu. It stands alone, so it fits inside a FilterPopover or any other panel.
 */
import { Children, createContext, isValidElement, useContext, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

const NoteContext = createContext<string | undefined>(undefined);

export interface FilterMenuProps {
  /** FilterMenuGroup elements. A group with `column={2}` goes down the second column. */
  children: ReactNode;
  /** The menu's accessible name ("Add filter"). */
  label: string;
  /** Becomes data-testid on the root. */
  testId?: string;
}

/**
 * The groups of the "+ Add filter" list, two columns on a wide popover.
 * @stability beta
 */
export function FilterMenu({ children, label, testId }: FilterMenuProps) {
  const root = useRef<HTMLDivElement>(null);
  const all = Children.toArray(children);
  const second = all.filter((c) => isValidElement<{ column?: 1 | 2 }>(c) && c.props.column === 2);
  const first = all.filter((c) => !second.includes(c));
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const items = [...(root.current?.querySelectorAll<HTMLButtonElement>('.pu-filter-menu-item:not(:disabled)') ?? [])];
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : e.key === 'ArrowDown' ? Math.min(items.length - 1, at + 1) : Math.max(0, at - 1);
    e.preventDefault();
    items[next]?.focus();
  };
  return (
    // The group is not interactive itself: it only catches the arrow keys bubbling from the item buttons inside it.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div className="pu-filter-menu" ref={root} role="group" aria-label={label} onKeyDown={onKeyDown} data-testid={testId}>
      <div className="pu-filter-menu-cols">
        <div className="pu-filter-menu-col">{first}</div>
        {second.length > 0 && <div className="pu-filter-menu-col">{second}</div>}
      </div>
    </div>
  );
}

export interface FilterMenuGroupProps {
  /** The group's heading ("Valuation"). */
  title: string;
  /** Which column of a FilterMenu the group goes down (read by FilterMenu). Default 1. */
  column?: 1 | 2;
  /** Why the group's items are off, or what they need ("Choose only banks under Sector first."). */
  note?: ReactNode;
  /** FilterMenuItem elements. */
  children?: ReactNode;
  /** Becomes data-testid on the group. */
  testId?: string;
  /** Becomes data-testid on the note. */
  noteTestId?: string;
}

/**
 * One group of filters under a heading, with an optional note on why its items are off.
 * @stability beta
 */
export function FilterMenuGroup({ title, note, children, testId, noteTestId }: FilterMenuGroupProps) {
  const id = useId();
  return (
    <section className="pu-filter-menu-group" aria-labelledby={`${id}-t`} data-testid={testId}>
      <h3 id={`${id}-t`} className="pu-filter-menu-title">
        {title}
      </h3>
      <NoteContext.Provider value={note ? `${id}-note` : undefined}>{children}</NoteContext.Provider>
      {note && (
        <p className="pu-filter-menu-note" id={`${id}-note`} data-testid={noteTestId}>
          {note}
        </p>
      )}
    </section>
  );
}

export interface FilterMenuItemProps {
  /** The filter's name ("P/B"). */
  children: ReactNode;
  /** A quieter second part after the name: a count ("12"), or the term in another language (give it a `lang`). */
  aside?: ReactNode;
  /** A yes/no filter: a check box mark, and `on` is pressed. */
  toggle?: boolean;
  /** The filter is set now (a range shows underlined in the accent; a toggle is ticked). */
  on?: boolean;
  /** Said after the name when a range filter is set ("set"), so the underline is not the only sign. Not used on a toggle: its pressed state says it. */
  onLabel?: string;
  /** Off for now. Its group's `note` says why and is read with the item. */
  disabled?: boolean;
  /** Called when chosen: opens the editor, or flips the toggle. */
  onClick: () => void;
  /** Becomes data-testid on the item. */
  testId?: string;
}

/**
 * One filter in the list: opens its editor, or toggles a yes/no filter.
 * @stability beta
 */
export function FilterMenuItem({ children, aside, toggle, on, onLabel, disabled, onClick, testId }: FilterMenuItemProps) {
  const note = useContext(NoteContext);
  return (
    <button
      type="button"
      className={`pu-filter-menu-item${on ? ' on' : ''}${toggle ? ' toggle' : ''}`}
      aria-pressed={toggle ? (on ?? false) : undefined}
      aria-describedby={disabled ? note : undefined}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
    >
      {toggle && (
        <span className="pu-filter-menu-box" aria-hidden="true">
          {on && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          )}
        </span>
      )}
      <span className="pu-filter-menu-text">
        {children}
        {aside && (
          <>
            {' '}
            <span className="pu-filter-menu-aside">{aside}</span>
          </>
        )}
        {on && !toggle && onLabel && <span className="kit-sr">, {onLabel}</span>}
      </span>
    </button>
  );
}
