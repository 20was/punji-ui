/**
 * A few DOM matchers for tests that do not pull in jest-dom: `toHaveFocus`, `toBeDisabled`, `toHaveValue`,
 * `toHaveAttribute` and `toHaveAccessibleDescription` (the text of the elements `aria-describedby` points at).
 * Import this file for its side effect.
 */
import { expect } from 'vitest';

interface DomMatchers<R = unknown> {
  toHaveFocus: () => R;
  toBeDisabled: () => R;
  toHaveValue: (value: string) => R;
  toHaveAttribute: (name: string, value?: string) => R;
  toHaveAccessibleDescription: (text?: string) => R;
}
declare module 'vitest' {
  // The type parameters must match vitest's own declaration.
  // oxlint-disable-next-line no-unused-vars
  interface Assertion<R, T> extends DomMatchers<R> {
    _domMatchers?: T;
  }
}

const describedBy = (el: Element) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => el.ownerDocument.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();

expect.extend({
  toHaveFocus(el: Element) {
    return { pass: el.ownerDocument.activeElement === el, message: () => `expected ${el.outerHTML.slice(0, 80)} ${this.isNot ? 'not ' : ''}to have focus` };
  },
  toBeDisabled(el: HTMLButtonElement) {
    return { pass: el.disabled === true, message: () => `expected the element ${this.isNot ? 'not ' : ''}to be disabled` };
  },
  toHaveValue(el: HTMLInputElement, value: string) {
    return { pass: el.value === value, message: () => `expected value ${JSON.stringify(el.value)} ${this.isNot ? 'not ' : ''}to be ${JSON.stringify(value)}` };
  },
  toHaveAttribute(el: Element, name: string, value?: string) {
    const has = el.hasAttribute(name);
    const pass = value === undefined ? has : el.getAttribute(name) === value;
    return { pass, message: () => `expected ${name}=${JSON.stringify(el.getAttribute(name))} ${this.isNot ? 'not ' : ''}to match ${JSON.stringify(value)}` };
  },
  toHaveAccessibleDescription(el: Element, text?: string) {
    const got = describedBy(el);
    const pass = text === undefined ? got !== '' : got === text;
    return { pass, message: () => `expected description ${JSON.stringify(got)} ${this.isNot ? 'not ' : ''}to be ${JSON.stringify(text)}` };
  },
});
