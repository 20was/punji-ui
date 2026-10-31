'use client';

/**
 * InlineConfirm (design.punji.app/components/inline-confirm): the second
 * step of a destructive action, in place of the row or the actions that
 * asked for it. A question (title, one line), the danger button that names
 * what goes, and the way back. The confirm takes focus; Esc backs out
 * before anything around it reacts. A decision that needs the whole screen
 * is a Sheet.
 */
import { useEffect, useRef, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';

export interface InlineConfirmProps {
  /** The question, as a short heading ("Remove NABIL?"). It names the group for screen readers. */
  title?: ReactNode;
  /** One line under the title saying what goes ("Its 120 shares and notes leave your watchlist."). */
  body?: ReactNode;
  /** The danger button's words: name what goes ("Remove NABIL"), never just "OK". */
  confirm: ReactNode;
  /** The way back's words ("Keep it"). */
  cancel: ReactNode;
  /** Called when the danger button is pressed. */
  onConfirm: () => void;
  /** Called by the way-back button and by Esc, before anything around it reacts. */
  onCancel: () => void;
  /** The confirm is working (loading, not pressable twice). */
  busy?: boolean;
  /** Button size: sm (default) or md. */
  size?: 'sm' | 'md';
  /** The element: a div, or an li when it replaces a list item. */
  as?: 'div' | 'li';
  /** group (default), or alertdialog when it interrupts. */
  role?: 'group' | 'alertdialog';
  /** The root id; the title's id is derived from it. */
  id?: string;
  /** Becomes data-testid on the root. */
  testId?: string;
  /** Becomes data-testid on the confirm button. */
  confirmTestId?: string;
  /** Becomes data-testid on the cancel button. */
  cancelTestId?: string;
  /** Layout only (margin in its container), never a restyle. */
  className?: string;
}

export function InlineConfirm({
  title,
  body,
  confirm,
  cancel,
  onConfirm,
  onCancel,
  busy,
  size = 'sm',
  as = 'div',
  role = 'group',
  id,
  testId,
  confirmTestId,
  cancelTestId,
  className,
}: InlineConfirmProps) {
  const own = useRef<HTMLButtonElement>(null);
  const titleId = id ? `${id}-t` : undefined;
  useEffect(() => {
    own.current?.focus();
  }, []);
  const Tag = as;
  return (
    <Tag
      className={`kit-confirm${className ? ` ${className}` : ''}`}
      id={id}
      role={role}
      aria-labelledby={title && titleId ? titleId : undefined}
      aria-label={!title || !titleId ? (typeof title === 'string' ? title : undefined) : undefined}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }}
      data-testid={testId}
    >
      {(title || body) && (
        <div className="kit-confirm-t">
          {title && <b id={titleId}>{title}</b>}
          {body && <span>{body}</span>}
        </div>
      )}
      <div className="kit-confirm-b">
        <Button
          variant="danger"
          size={size}
          ref={own}
          loading={busy}
          onClick={onConfirm}
          testId={confirmTestId}
        >
          {confirm}
        </Button>
        <Button variant="secondary" size={size} onClick={onCancel} testId={cancelTestId}>
          {cancel}
        </Button>
      </div>
    </Tag>
  );
}
