/**
 * The screens of a Drawer (design.punji.app/components/drawer): a DrawerScreen
 * (a div, or the form itself) fills the drawer, a DrawerHeader (title, back,
 * close) sits at its top and a DrawerFooter (Save and Cancel) is docked at its
 * foot: the buttons stay in reach however long the form is, and sit at the
 * drawer's foot however short it is. The same screen pushed full screen on a
 * phone takes `ground="page"`.
 */
import type { ComponentPropsWithoutRef, ReactNode } from 'react';


export type DrawerScreenProps = ComponentPropsWithoutRef<'form'> & {
  /** div (default), or the form itself so Enter submits and the footer's Save is a submit button. */
  as?: 'div' | 'form';
  /** 'page': the same screen pushed full screen on a phone (its footer on the page ground). */
  ground?: 'panel' | 'page';
  /** Becomes data-testid on the screen. */
  testId?: string;
};

/** One screen of the drawer, filling its height: header, the content, the docked footer. */
export function DrawerScreen({ as = 'div', ground = 'panel', className, testId, children, ...rest }: DrawerScreenProps) {
  const cls = `kit-drawer-screen${ground === 'page' ? ' on-page' : ''}${className ? ` ${className}` : ''}`;
  if (as === 'form')
    return (
      <form className={cls} data-testid={testId} {...rest}>
        {children}
      </form>
    );
  const { onSubmit: _s, noValidate: _n, ...div } = rest;
  void _s;
  void _n;
  return (
    <div className={cls} data-testid={testId} {...(div as ComponentPropsWithoutRef<'div'>)}>
      {children}
    </div>
  );
}

const Icon = ({ d }: { d: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** The screen's title, a back chevron when it was opened from another screen, and the close (x). */
export interface DrawerHeaderProps {
  /** The screen's title; it is the heading (h2). */
  title: ReactNode;
  /** Shows a back chevron that calls this, when the screen was opened from another one. */
  onBack?: () => void;
  /** Called by the close (x) button. */
  onClose: () => void;
  /** The back button's accessible name ("Back to holdings"). */
  backLabel: string;
  /** The close button's accessible name ("Close"). */
  closeLabel: string;
  /** Prefix for the buttons' test ids: `${testId}-back` and `${testId}-close`. */
  testId?: string;
}

export function DrawerHeader({ title, onBack, onClose, backLabel, closeLabel, testId = 'desk-form' }: DrawerHeaderProps) {
  return (
    <div className={`kit-drawer-head${onBack ? '' : ' noback'}`}>
      {onBack && (
        <button type="button" className="kit-drawer-x" onClick={onBack} aria-label={backLabel} data-testid={`${testId}-back`}>
          <Icon d="M9 2.5L4.5 7 9 11.5" />
        </button>
      )}
      <h2>{title}</h2>
      <button type="button" className="kit-drawer-x" onClick={onClose} aria-label={closeLabel} data-testid={`${testId}-close`}>
        <Icon d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
      </button>
    </div>
  );
}

/** The screen's own content, between the header and the footer. */
export interface DrawerBodyProps {
  /** The fields and text of the screen. */
  children: ReactNode;
  /** Optional content heading, without an inset card or extra padding. */
  title?: ReactNode;
  /** Full descriptive text under the heading. */
  description?: ReactNode;
  /** One link or action beside the content heading. */
  action?: ReactNode;
}

export function DrawerBody({ children, title, description, action }: DrawerBodyProps) {
  return (
    <div className="kit-drawer-body">
      {title && (
        <header className="kit-card-h">
          <div className="kit-card-t">
            <h3>{title}</h3>
            {description && <p>{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </div>
  );
}

/** Save and Cancel, docked at the screen's foot; `note` is one quiet line under them (the keys). */
export interface DrawerFooterProps {
  /** The Save and Cancel buttons. */
  children: ReactNode;
  /** One quiet line under the buttons (the keys). */
  note?: ReactNode;
}

export function DrawerFooter({ children, note }: DrawerFooterProps) {
  return (
    <div className="kit-drawer-foot">
      <div className="kit-drawer-acts">{children}</div>
      {note && <p className="kit-drawer-note">{note}</p>}
    </div>
  );
}
