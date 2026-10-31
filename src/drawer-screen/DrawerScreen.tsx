/**
 * The screens of a Drawer (design.punji.app/components/drawer): a DrawerScreen
 * (a div, or the form itself) fills the drawer, a DrawerHeader (title, back,
 * close) sits at its top and a DrawerFooter (Save and Cancel) is docked at its
 * foot: the buttons stay in reach however long the form is, and sit at the
 * drawer's foot however short it is. The same screen pushed full screen on a
 * phone takes `ground="page"`.
 */
import type { ComponentPropsWithoutRef, ReactNode } from 'react';


type ScreenProps = ComponentPropsWithoutRef<'form'> & { as?: 'div' | 'form'; /** 'page': the same screen pushed full screen on a phone (its footer on the page ground). */ ground?: 'panel' | 'page'; testId?: string };

/** One screen of the drawer, filling its height: header, the content, the docked footer. */
export function DrawerScreen({ as = 'div', ground = 'panel', className, testId, children, ...rest }: ScreenProps) {
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
export function DrawerHeader({ title, onBack, onClose, backLabel, closeLabel, testId = 'desk-form' }: { title: ReactNode; onBack?: () => void; onClose: () => void; backLabel: string; closeLabel: string; testId?: string }) {
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
export function DrawerBody({ children, title, description, action }: { children: ReactNode; /** Optional content heading, without an inset card or extra padding. */ title?: ReactNode; /** Full descriptive text under the heading. */ description?: ReactNode; /** One link or action beside the content heading. */ action?: ReactNode }) {
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
export function DrawerFooter({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="kit-drawer-foot">
      <div className="kit-drawer-acts">{children}</div>
      {note && <p className="kit-drawer-note">{note}</p>}
    </div>
  );
}
