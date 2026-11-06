/**
 * One definition of "can take keyboard focus" for every modal surface (Sheet, Drawer): the
 * natural controls, anything given a tabindex other than -1, summary and contenteditable.
 * Disabled controls, hidden inputs and anything inside [hidden] or aria-hidden are left out.
 */
export const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** The tabbable elements inside `root`, in DOM order, without disabled, hidden or aria-hidden ones. */
export function tabbables(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.closest('[hidden], [inert], [aria-hidden="true"]') && !el.matches('fieldset[disabled] *'),
  );
}

/** A control that destroys or commits something irreversible: a danger Button, or anything marked data-destructive. */
export function isDestructive(el: HTMLElement): boolean {
  return el.matches('.kit-btn.danger, [data-destructive]');
}
