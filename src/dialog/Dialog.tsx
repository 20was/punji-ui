'use client';

/**
 * Dialog and AlertDialog: the modal pair from the WAI-ARIA Authoring Practices. A Dialog holds a task or
 * some information and closes on Esc or a click on the scrim; an AlertDialog interrupts with a question
 * that must be answered, so only its own Cancel (or Esc, which is Cancel) closes it. Both are named by
 * the title, described by the body, keep Tab inside, make the page behind inert and still, and give focus
 * back to the control that opened them. Built on the same layer as Sheet and Drawer.
 */
import { useId, useRef, useState, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { confirmMatches } from '../internal/confirmMatch.ts';
import { ConfirmField } from '../internal/ConfirmField.tsx';
import { useFocusScope } from '../internal/focusScope.ts';
import { useInertOthers } from '../internal/inert.ts';
import { Portal } from '../internal/Portal.tsx';
import { useScrollLock } from '../internal/scrollLock.ts';

interface Shared {
  /** Shown or not. Nothing renders while false. */
  open: boolean;
  /** The heading. Names the dialog. */
  title: ReactNode;
  /** One or two lines under the title. Describes the dialog to a screen reader. */
  body?: ReactNode;
  /** Becomes data-testid on the dialog. */
  testId?: string;
}

export interface DialogProps extends Shared {
  /** The content between the body and the actions. */
  children?: ReactNode;
  /** The buttons at the foot. Mark the safe one `data-autofocus`, otherwise focus lands on the first control that is not destructive. */
  actions?: ReactNode;
  /** Called by Esc, the scrim and the close button. */
  onClose: () => void;
  /** The hidden close button's accessible name (default "Close"). Pass it in the reader's language. */
  closeLabel?: string;
}

export interface AlertDialogProps extends Shared {
  /** Called by the confirm button. */
  onConfirm: () => void;
  /** Called by the cancel button and by Esc. Nothing else dismisses it. */
  onCancel: () => void;
  /** What the confirm button does, named ("Sell 40 NTC"), never a bare "OK". */
  confirmLabel: string;
  /** The way back (default "Cancel"). Pass it in the reader's language. */
  cancelLabel?: string;
  /** The confirm destroys or commits something irreversible: it is a danger button and never takes first focus (Cancel does). Default false. */
  destructive?: boolean;
  /** The confirm is working: it shows loading and cannot be pressed twice. */
  busy?: boolean;
  /** How final it is: `danger` is the danger button (the same as `destructive`), `caution` the primary button for something the reader can start again. Default: `destructive` decides. */
  strength?: 'caution' | 'danger';
  /** A typed confirmation: the word the reader must type before the confirm works (case and outer spaces ignored). The field takes first focus; Enter in it confirms. */
  match?: string;
  /** The field's label with `match` ("Type DELETE to confirm"). Default: the `match` text. */
  matchLabel?: string;
  /** Becomes data-testid on the typed-confirmation field. */
  fieldTestId?: string;
}

interface LayerProps extends Shared {
  role: 'dialog' | 'alertdialog';
  onEscape?: () => void;
  onScrim?: () => void;
  children?: ReactNode;
  foot?: ReactNode;
}

function Layer({ role, title, body, testId, onEscape, onScrim, children, foot }: LayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  // Inert first: effect cleanups run in this order, so the page is live again before focus goes back into it.
  useInertOthers(ref, true);
  useScrollLock(true);
  useFocusScope(ref, { onEscape });
  return (
    <div className="kit-sheet-back" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onScrim?.()}>
      <div className="kit-sheet" role={role} aria-modal="true" aria-labelledby={titleId} aria-describedby={body ? bodyId : undefined} ref={ref} tabIndex={-1} data-testid={testId}>
        <h2 id={titleId}>{title}</h2>
        {body && <p id={bodyId}>{body}</p>}
        {children}
        {foot && <div className="actions">{foot}</div>}
      </div>
    </div>
  );
}

/**
 * A modal dialog: named by its title, described by its body, Tab trapped, the page behind inert, focus returned on close.
 * @stability beta
 */
export function Dialog({ open, title, body, children, actions, onClose, testId, closeLabel = 'Close' }: DialogProps) {
  if (!open) return null;
  return (
    <Portal>
      <Layer role="dialog" open title={title} body={body} testId={testId} onEscape={onClose} onScrim={onClose} foot={actions}>
        {children}
        <span className="kit-sr"><button type="button" onClick={onClose}>{closeLabel}</button></span>
      </Layer>
    </Portal>
  );
}

/**
 * A dialog that must be answered (role alertdialog): Esc cancels, the scrim does nothing, and a destructive confirm starts focus on Cancel.
 * With `match` the reader types a word first, and the field takes focus.
 * @stability beta
 */
export function AlertDialog({ open, ...rest }: AlertDialogProps) {
  if (!open) return null;
  return <OpenAlertDialog {...rest} open />;
}

function OpenAlertDialog({ title, body, onConfirm, onCancel, confirmLabel, cancelLabel = 'Cancel', destructive = false, busy, strength, match, matchLabel, fieldTestId, testId }: AlertDialogProps) {
  const [typed, setTyped] = useState('');
  const typing = match !== undefined;
  const typedOk = !typing || confirmMatches(typed, match);
  const danger = strength === 'danger' || (strength === undefined && destructive);
  const cancelFirst = danger && !typing;
  return (
    <Portal>
      <Layer
        role="alertdialog"
        open
        title={title}
        body={body}
        testId={testId}
        onEscape={onCancel}
        foot={
          <>
            <Button block variant="secondary" data-autofocus={cancelFirst ? '' : undefined} onClick={onCancel}>{cancelLabel}</Button>
            <Button block variant={danger ? 'danger' : 'primary'} loading={busy} disabled={!typedOk} data-autofocus={cancelFirst || typing ? undefined : ''} onClick={onConfirm}>{confirmLabel}</Button>
          </>
        }
      >
        {typing && (
          <ConfirmField
            label={matchLabel ?? match}
            value={typed}
            onChange={setTyped}
            dialogFocus
            testId={fieldTestId}
            onEnter={() => {
              if (typedOk && !busy) onConfirm();
            }}
          />
        )}
      </Layer>
    </Portal>
  );
}
