import { useState } from 'react';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as root from '../src/index.ts';
import * as hooks from '../src/hooks/hooks.ts';
import { SplitPane } from '../src/split-pane/SplitPane.tsx';
import { formatHotkey, matchHotkey, parseHotkey, useHotkeys } from '../src/use-hotkeys/useHotkeys.ts';
import { seriousViolations } from './axe.ts';

const key = (k: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

describe('parseHotkey / matchHotkey / formatHotkey', () => {
  it('parses modifiers and aliases, and rejects typos', () => {
    expect(parseHotkey('Mod+Shift+K')).toEqual({ key: 'k', mod: true, ctrl: false, meta: false, alt: false, shift: true });
    expect(parseHotkey('esc').key).toBe('escape');
    expect(parseHotkey('mod++').key).toBe('+');
    expect(() => parseHotkey('hyper+k')).toThrow(RangeError);
    expect(() => parseHotkey('')).toThrow(RangeError);
  });

  it('maps mod to Command on Apple platforms and Control elsewhere, with exact modifiers', () => {
    expect(matchHotkey(key('k', { metaKey: true }), 'mod+k', true)).toBe(true);
    expect(matchHotkey(key('k', { ctrlKey: true }), 'mod+k', true)).toBe(false);
    expect(matchHotkey(key('k', { ctrlKey: true }), 'mod+k', false)).toBe(true);
    expect(matchHotkey(key('K', { ctrlKey: true, shiftKey: true }), 'mod+k', false)).toBe(false);
    expect(matchHotkey(key('b'), 'b')).toBe(true);
    expect(matchHotkey(key('B', { shiftKey: true }), 'b')).toBe(false);
    expect(matchHotkey(key('b', { altKey: true }), 'b')).toBe(false);
  });

  it('lets a symbol match with the Shift the layout needs to type it', () => {
    expect(matchHotkey(key('?', { shiftKey: true }), '?')).toBe(true);
    expect(matchHotkey(key('/'), '/')).toBe(true);
  });

  it('formats for the platform', () => {
    expect(formatHotkey('mod+k', true)).toBe('⌘K');
    expect(formatHotkey('mod+k', false)).toBe('Ctrl+K');
    expect(formatHotkey('shift+escape, /', false)).toBe('Shift+Esc or /');
  });
});

describe('useHotkeys', () => {
  it('fires a plain key outside fields only, and a modified key everywhere', () => {
    const buy = vi.fn();
    const palette = vi.fn();
    renderHook(() => useHotkeys([{ keys: 'b', handler: buy }, { keys: 'ctrl+k, meta+k', handler: palette }]));
    const input = document.createElement('input');
    document.body.append(input);
    fireEvent.keyDown(document.body, { key: 'b' });
    expect(buy).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: 'b' });
    expect(buy).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'k', metaKey: true });
    expect(palette).toHaveBeenCalledTimes(2);
    input.remove();
  });

  it('prevents the default unless told not to, skips composition, and stops when disabled', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(({ enabled }) => useHotkeys([{ keys: '/', handler }], { enabled }), { initialProps: { enabled: true } });
    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, isComposing: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    rerender({ enabled: false });
    fireEvent.keyDown(document.body, { key: '/' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('uses the latest handler without re-binding', () => {
    const calls: string[] = [];
    const { rerender } = renderHook(({ name }) => useHotkeys([{ keys: 'g', handler: () => calls.push(name) }]), { initialProps: { name: 'first' } });
    rerender({ name: 'second' });
    fireEvent.keyDown(document.body, { key: 'g' });
    expect(calls).toEqual(['second']);
  });
});

describe('SplitPane', () => {
  it('renders both panes and a window-splitter separator on the server', () => {
    const html = renderToString(<SplitPane label="Resize chart and ticket" start={<p>Chart</p>} end={<p>Ticket</p>} defaultSize={60} />);
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-valuenow="60"');
    expect(html).toContain('--pu-split:60%');
  });

  it('moves with the arrow keys, Shift, Home and End inside min and max, and Enter collapses and restores', () => {
    const onSizeChange = vi.fn();
    render(<SplitPane label="Resize" start="A" end="B" defaultSize={50} min={25} max={75} step={5} onSizeChange={onSizeChange} />);
    const handle = screen.getByRole('separator', { name: 'Resize' });
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle.getAttribute('aria-valuenow')).toBe('55');
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(handle.getAttribute('aria-valuenow')).toBe('35');
    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handle.getAttribute('aria-valuenow')).toBe('25');
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle.getAttribute('aria-valuenow')).toBe('25');
    fireEvent.keyDown(handle, { key: 'End' });
    expect(handle.getAttribute('aria-valuenow')).toBe('75');
    fireEvent.keyDown(handle, { key: 'Enter' });
    expect(handle.getAttribute('aria-valuenow')).toBe('25');
    fireEvent.keyDown(handle, { key: 'Enter' });
    expect(handle.getAttribute('aria-valuenow')).toBe('75');
    expect(onSizeChange.mock.calls.map((c) => c[0])).toEqual([55, 35, 25, 75, 25, 75]);
  });

  it('uses the up and down arrows when vertical, and can be controlled', () => {
    function Controlled() {
      const [size, setSize] = useState(40);
      return <SplitPane label="Resize" orientation="vertical" start="A" end="B" size={size} onSizeChange={setSize} />;
    }
    render(<Controlled />);
    const handle = screen.getByRole('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(handle.getAttribute('aria-valuenow')).toBe('45');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle.getAttribute('aria-valuenow')).toBe('45');
  });

  it('follows the pointer while it is captured', () => {
    render(<SplitPane label="Resize" start="A" end="B" testId="sp" />);
    const handle = screen.getByTestId('sp-separator');
    const inner = handle.parentElement!;
    inner.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 400, right: 1000, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = () => true;
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 500 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 333 });
    expect(handle.getAttribute('aria-valuenow')).toBe('33.3');
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 990 });
    expect(handle.getAttribute('aria-valuenow')).toBe('80');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<SplitPane label="Resize chart and ticket" start={<p>Chart</p>} end={<p>Ticket</p>} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('exports', () => {
  it('are on the root and the hooks aggregate', () => {
    expect(root.SplitPane).toBe(SplitPane);
    expect(root.useHotkeys).toBe(useHotkeys);
    expect(hooks.useHotkeys).toBe(useHotkeys);
    expect(hooks.formatHotkey).toBe(formatHotkey);
  });
});
