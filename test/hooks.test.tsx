import { StrictMode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { act, render, renderHook, fireEvent, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as hooks from '../src/hooks/hooks.ts';
import { useMediaQuery } from '../src/use-media-query/useMediaQuery.ts';
import { useTweenedNumber } from '../src/live/live.ts';
import { useDebounce, useDebouncedCallback } from '../src/use-debounce/useDebounce.ts';
import { useThrottle } from '../src/use-throttle/useThrottle.ts';
import { useControllableState } from '../src/use-controllable-state/useControllableState.ts';
import { usePrevious } from '../src/use-previous/usePrevious.ts';
import { useToggle } from '../src/use-toggle/useToggle.ts';
import { useClipboard } from '../src/use-clipboard/useClipboard.ts';
import { useLocalStorage, useSessionStorage } from '../src/use-storage/useStorage.ts';
import { useClickOutside } from '../src/use-click-outside/useClickOutside.ts';
import { usePagination, paginate } from '../src/use-pagination/usePagination.ts';
import { useTableSelection } from '../src/use-table-selection/useTableSelection.ts';
import { useColumnVisibility } from '../src/use-column-visibility/useColumnVisibility.ts';

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});

describe('hooks aggregate', () => {
  it('re-exports every hook, including the existing ones, as the same functions', () => {
    expect(hooks.useMediaQuery).toBe(useMediaQuery);
    expect(hooks.useTweenedNumber).toBe(useTweenedNumber);
    for (const name of ['useHydrated', 'useStableOrder', 'useDebounce', 'useDebouncedCallback', 'useThrottle', 'useControllableState', 'usePrevious', 'useToggle', 'useClipboard', 'useLocalStorage', 'useSessionStorage', 'useClickOutside', 'usePagination', 'paginate', 'useTableSelection', 'useColumnVisibility']) {
      expect(typeof (hooks as Record<string, unknown>)[name]).toBe('function');
    }
  });
});

describe('useDebounce / useDebouncedCallback', () => {
  beforeEach(() => vi.useFakeTimers());

  it('delays the value and restarts on each change', () => {
    const { result, rerender, unmount } = renderHook(({ v }) => useDebounce(v, 100), { initialProps: { v: 'a' } });
    expect(result.current).toBe('a');
    rerender({ v: 'b' });
    act(() => { vi.advanceTimersByTime(60); });
    rerender({ v: 'c' });
    act(() => { vi.advanceTimersByTime(60); });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(40); });
    expect(result.current).toBe('c');
    rerender({ v: 'd' });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('collapses a burst, uses the latest callback, keeps identity, and cancels on unmount', () => {
    const first = vi.fn<(...args: unknown[]) => void>();
    const second = vi.fn<(...args: unknown[]) => void>();
    const { result, rerender, unmount } = renderHook(({ fn }) => useDebouncedCallback(fn, 100), { initialProps: { fn: first } });
    const identity = result.current;
    result.current(1); result.current(2);
    rerender({ fn: second });
    expect(result.current).toBe(identity);
    act(() => { vi.advanceTimersByTime(100); });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith(2);
    result.current(3);
    unmount();
    act(() => { vi.advanceTimersByTime(500); });
    expect(second).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('supports cancel, flush and leading calls', () => {
    const fn = vi.fn<(...args: unknown[]) => void>();
    const { result } = renderHook(() => useDebouncedCallback(fn, 100));
    result.current('x'); result.current.cancel();
    act(() => { vi.advanceTimersByTime(200); });
    expect(fn).not.toHaveBeenCalled();
    result.current('y'); result.current.flush();
    expect(fn).toHaveBeenCalledExactlyOnceWith('y');
    act(() => { vi.advanceTimersByTime(200); });
    expect(fn).toHaveBeenCalledTimes(1);
    const lead = vi.fn<(...args: unknown[]) => void>();
    const { result: l } = renderHook(() => useDebouncedCallback(lead, 100, { leading: true }));
    l.current('a'); l.current('b');
    expect(lead).toHaveBeenCalledExactlyOnceWith('a');
    act(() => { vi.advanceTimersByTime(100); });
    expect(lead).toHaveBeenLastCalledWith('b');
  });
});

describe('useThrottle', () => {
  it('limits updates to one per interval and delivers the trailing value', () => {
    vi.useFakeTimers();
    const { result, rerender, unmount } = renderHook(({ v }) => useThrottle(v, 100), { initialProps: { v: 'a' } });
    expect(result.current).toBe('a');
    rerender({ v: 'b' });
    expect(result.current).toBe('b');
    act(() => { vi.advanceTimersByTime(10); });
    rerender({ v: 'c' });
    act(() => { vi.advanceTimersByTime(10); });
    rerender({ v: 'd' });
    expect(result.current).toBe('b');
    act(() => { vi.advanceTimersByTime(79); });
    expect(result.current).toBe('b');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('d');
    rerender({ v: 'e' });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('useControllableState', () => {
  it('uncontrolled: updates itself, accepts updaters, notifies, and has a stable setter', () => {
    const onChange = vi.fn<(...args: unknown[]) => void>();
    const { result } = renderHook(() => useControllableState({ defaultValue: 1, onChange }));
    const setter = result.current[1];
    act(() => result.current[1]((n) => n + 1));
    expect(result.current[0]).toBe(2);
    act(() => result.current[1](2));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(2);
    expect(result.current[1]).toBe(setter);
  });

  it('controlled: follows the prop and only reports requests', () => {
    const onChange = vi.fn<(...args: unknown[]) => void>();
    const { result, rerender } = renderHook(({ value }) => useControllableState({ value, defaultValue: 0, onChange }), { initialProps: { value: 5 } });
    act(() => result.current[1](9));
    expect(result.current[0]).toBe(5);
    expect(onChange).toHaveBeenCalledWith(9);
    rerender({ value: 9 });
    expect(result.current[0]).toBe(9);
  });

  it('warns without values when the mode switches', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = renderHook(({ value }: { value: number | undefined }) => useControllableState({ value, defaultValue: 7, name: 'Thing' }), { initialProps: { value: undefined as number | undefined } });
    expect(warn).not.toHaveBeenCalled();
    rerender({ value: 123456 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toMatch(/Thing changed from uncontrolled to controlled/);
    expect(String(warn.mock.calls[0]![0])).not.toContain('123456');
    rerender({ value: undefined });
    expect(String(warn.mock.calls[1]![0])).toMatch(/controlled to uncontrolled/);
  });
});

describe('usePrevious and useToggle', () => {
  it('reports the value before the latest change', () => {
    const { result, rerender } = renderHook(({ v }) => usePrevious(v), { initialProps: { v: 1 } });
    expect(result.current).toBeUndefined();
    rerender({ v: 1 });
    rerender({ v: 2 });
    expect(result.current).toBe(1);
    rerender({ v: 2 });
    expect(result.current).toBe(1);
    rerender({ v: 3 });
    expect(result.current).toBe(2);
    expect(renderHook(() => usePrevious(1, 0)).result.current).toBe(0);
  });

  it('toggles with stable callbacks and ignores event arguments', () => {
    const { result } = renderHook(() => useToggle());
    const [, toggle, set] = result.current;
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1]({ type: 'click' }));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    act(() => result.current[2](false));
    expect(result.current[0]).toBe(false);
    expect(result.current[1]).toBe(toggle);
    expect(result.current[2]).toBe(set);
  });
});

const setClipboard = (value: unknown) => Object.defineProperty(navigator, 'clipboard', { configurable: true, value });
function ClipboardProbe() { const c = useClipboard(); return <span>{`${c.supported}/${c.copied}`}</span>; }

describe('useClipboard', () => {
  afterEach(() => Reflect.deleteProperty(navigator, 'clipboard'));

  it('copies, flags copied, resets after the timeout and does not log the text', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn<(t: string) => Promise<void>>().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const log = vi.spyOn(console, 'error');
    const { result, unmount } = renderHook(() => useClipboard({ timeoutMs: 500 }));
    expect(result.current.supported).toBe(true);
    let ok = false;
    await act(async () => { ok = await result.current.copy('SECRET-123'); });
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('SECRET-123');
    expect(result.current).toMatchObject({ copied: true, error: null });
    expect(JSON.stringify(Object.keys(result.current))).not.toContain('SECRET');
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.copied).toBe(false);
    await act(async () => { await result.current.copy('x'); });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(log).not.toHaveBeenCalled();
  });

  it('reports denied and failed writes', async () => {
    const writeText = vi.fn<(t: string) => Promise<void>>().mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' })).mockRejectedValueOnce(new Error('boom'));
    setClipboard({ writeText });
    const { result } = renderHook(() => useClipboard());
    await act(async () => { expect(await result.current.copy('a')).toBe(false); });
    expect(result.current).toMatchObject({ copied: false, error: 'denied' });
    await act(async () => { await result.current.copy('a'); });
    expect(result.current.error).toBe('failed');
    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
  });

  it('reports unsupported when the API is absent', async () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.supported).toBe(false);
    await act(async () => { expect(await result.current.copy('a')).toBe(false); });
    expect(result.current.error).toBe('unsupported');
  });

  it('server render is unsupported and idle', () => {
    setClipboard({ writeText: vi.fn<(...args: unknown[]) => void>() });
    expect(renderToString(<ClipboardProbe />)).toContain('false/false');
  });
});

const isNumber = (v: unknown): v is number => typeof v === 'number';
const numberOptions = { defaultValue: 0, validate: isNumber };
const isList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const listOptions = { defaultValue: [] as string[], validate: isList };
const tab = (key: string, raw: string | null, area: Storage = localStorage) => act(() => {
  if (raw === null) area.removeItem(key); else area.setItem(key, raw);
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: raw, storageArea: area }));
});

function StorageProbe() { return <span>{useLocalStorage('k', numberOptions).value}</span>; }

describe('useLocalStorage / useSessionStorage', () => {
  it('reads, writes JSON and shares updates between components in the same tab', () => {
    localStorage.setItem('n', '5');
    const a = renderHook(() => useLocalStorage('n', numberOptions));
    const b = renderHook(() => useLocalStorage('n', numberOptions));
    expect(a.result.current.value).toBe(5);
    act(() => a.result.current.set((n) => n + 1));
    expect(localStorage.getItem('n')).toBe('6');
    expect(b.result.current.value).toBe(6);
    act(() => b.result.current.remove());
    expect(a.result.current.value).toBe(0);
    expect(localStorage.getItem('n')).toBeNull();
  });

  it('follows storage events from another tab, ignores other keys and areas, and cleans up', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { result, unmount } = renderHook(() => useLocalStorage('n', numberOptions), { wrapper: StrictMode });
    tab('n', '41');
    expect(result.current.value).toBe(41);
    tab('other', '1');
    sessionStorage.setItem('n', '7');
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'n', newValue: '7', storageArea: sessionStorage })); });
    expect(result.current.value).toBe(41);
    tab('n', null);
    expect(result.current.value).toBe(0);
    act(() => { localStorage.setItem('n', '3'); window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage })); });
    expect(result.current.value).toBe(3);
    unmount();
    const added = add.mock.calls.filter(([type]) => type === 'storage').length;
    expect(remove.mock.calls.filter(([type]) => type === 'storage').length).toBe(added);
  });

  it('does not trust stored data: bad JSON and wrong shapes fall back and report invalid', () => {
    localStorage.setItem('list', '{not json');
    const { result } = renderHook(() => useLocalStorage('list', listOptions));
    expect(result.current.value).toBe(listOptions.defaultValue);
    expect(result.current.error).toBe('invalid');
    tab('list', '[1,2]');
    expect(result.current.value).toBe(listOptions.defaultValue);
    expect(result.current.error).toBe('invalid');
    tab('list', '{"__proto__":{"x":1}}');
    expect(result.current.value).toBe(listOptions.defaultValue);
    tab('list', '["a","b"]');
    expect(result.current.value).toEqual(['a', 'b']);
    expect(result.current.error).toBeNull();
    expect(result.current.value).toBe(result.current.value);
  });

  it('keeps a stable value reference while storage is unchanged', () => {
    localStorage.setItem('list', '["a"]');
    const { result, rerender } = renderHook(() => useLocalStorage('list', listOptions));
    const first = result.current.value;
    rerender();
    expect(result.current.value).toBe(first);
  });

  it('surfaces quota, serialisation and unavailable errors instead of throwing', () => {
    const { result } = renderHook(() => useLocalStorage('n', numberOptions));
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    act(() => result.current.set(1));
    expect(result.current.error).toBe('quota');
    expect(result.current.value).toBe(0);
    spy.mockImplementation(() => { throw new Error('denied'); });
    act(() => result.current.set(1));
    expect(result.current.error).toBe('unavailable');
    spy.mockRestore();
    const big = renderHook(() => useLocalStorage<bigint>('b', { defaultValue: 0n, validate: (v): v is bigint => typeof v === 'bigint' }));
    act(() => big.result.current.set(1n));
    expect(big.result.current.error).toBe('serialize');
    act(() => result.current.set(2));
    expect(result.current.error).toBeNull();
    expect(result.current.value).toBe(2);
  });

  it('survives a throwing getItem', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const { result } = renderHook(() => useLocalStorage('n', numberOptions));
    expect(result.current.value).toBe(0);
  });

  it('keeps local and session storage separate; server render uses the default', () => {
    localStorage.setItem('k', '1');
    sessionStorage.setItem('k', '2');
    expect(renderHook(() => useLocalStorage('k', numberOptions)).result.current.value).toBe(1);
    const s = renderHook(() => useSessionStorage('k', numberOptions));
    expect(s.result.current.value).toBe(2);
    tab('k', '9', sessionStorage);
    expect(s.result.current.value).toBe(9);
    expect(renderToString(<StorageProbe />)).toContain('>0<');
  });
});

function One({ fn }: { fn: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, fn);
  return <div ref={ref}>box</div>;
}

function Harness({ onOutside, enabled = true }: { onOutside: () => void; enabled?: boolean }) {
  const anchor = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useClickOutside([anchor, panel], onOutside, { enabled });
  return (
    <div>
      <div ref={anchor}><button>anchor</button></div>
      {createPortal(<div ref={panel}><button>portal</button></div>, document.body)}
      <button>elsewhere</button>
    </div>
  );
}

const stop = (e: Event) => e.stopPropagation();

describe('useClickOutside', () => {
  it('fires for outside pointerdown only, honours multiple refs and portals', () => {
    const onOutside = vi.fn<(...args: unknown[]) => void>();
    render(<Harness onOutside={onOutside} />);
    fireEvent.pointerDown(screen.getByText('anchor'));
    fireEvent.pointerDown(screen.getByText('portal'));
    expect(onOutside).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText('elsewhere'));
    fireEvent.pointerDown(document.body);
    expect(onOutside).toHaveBeenCalledTimes(2);
  });

  it('sees events whose propagation is stopped, toggles with enabled and removes its listener', () => {
    const onOutside = vi.fn<(...args: unknown[]) => void>();
    const el = document.createElement('button');
    document.body.append(el);
    el.addEventListener('pointerdown', stop);
    const { rerender, unmount } = render(<Harness onOutside={onOutside} />);
    fireEvent.pointerDown(el);
    expect(onOutside).toHaveBeenCalledTimes(1);
    rerender(<Harness onOutside={onOutside} enabled={false} />);
    fireEvent.pointerDown(el);
    expect(onOutside).toHaveBeenCalledTimes(1);
    rerender(<Harness onOutside={onOutside} />);
    const remove = vi.spyOn(document, 'removeEventListener');
    unmount();
    expect(remove).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    fireEvent.pointerDown(el);
    expect(onOutside).toHaveBeenCalledTimes(1);
    el.remove();
  });

  it('accepts a single ref and calls the latest handler', () => {
    const first = vi.fn<(...args: unknown[]) => void>();
    const second = vi.fn<(...args: unknown[]) => void>();
    const { rerender } = render(<One fn={first} />);
    rerender(<One fn={second} />);
    fireEvent.pointerDown(document.body);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('paginate / usePagination', () => {
  it('handles empty, exact and ragged totals', () => {
    expect(paginate(0, 1, 10)).toMatchObject({ page: 1, pageCount: 1, startIndex: 0, endIndex: 0, hasNext: false, hasPrevious: false });
    expect(paginate(20, 2, 10)).toMatchObject({ pageCount: 2, startIndex: 10, endIndex: 20, hasNext: false, hasPrevious: true });
    expect(paginate(21, 3, 10)).toMatchObject({ startIndex: 20, endIndex: 21 });
    expect(paginate(21, 99, 10).page).toBe(3);
    expect(paginate(21, -4, 10).page).toBe(1);
  });

  it('clamps garbage input without throwing', () => {
    expect(paginate(NaN, NaN, 0)).toMatchObject({ page: 1, pageSize: 1, total: 0, pageCount: 1 });
    expect(paginate(-5, 2, 10).total).toBe(0);
    expect(paginate(Infinity, 1, 10).total).toBe(0);
    expect(paginate(25.9, 1.9, 10.5)).toMatchObject({ page: 1, pageSize: 10, total: 25, pageCount: 3 });
  });

  it('navigates, clamps setters and shrinks to the last page when total drops', () => {
    const { result, rerender } = renderHook(({ total }) => usePagination({ total, defaultPageSize: 10 }), { initialProps: { total: 45 } });
    expect(result.current.pageCount).toBe(5);
    act(() => result.current.last());
    expect(result.current.page).toBe(5);
    act(() => result.current.next());
    expect(result.current.page).toBe(5);
    rerender({ total: 31 });
    expect(result.current).toMatchObject({ page: 4, startIndex: 30, endIndex: 31, pageIndex: 3 });
    rerender({ total: 0 });
    expect(result.current).toMatchObject({ page: 1, pageCount: 1, startIndex: 0, endIndex: 0 });
    rerender({ total: 45 });
    expect(result.current.page).toBe(5);
    act(() => result.current.setPage(1000));
    expect(result.current.page).toBe(5);
    act(() => result.current.first());
    act(() => result.current.previous());
    expect(result.current.page).toBe(1);
  });

  it('keeps the first visible row when the page size changes and reports changes when controlled', () => {
    const { result } = renderHook(() => usePagination({ total: 100, defaultPage: 3, defaultPageSize: 10 }));
    act(() => result.current.setPageSize(25));
    expect(result.current).toMatchObject({ pageSize: 25, page: 1 });
    const onPageChange = vi.fn<(...args: unknown[]) => void>();
    const c = renderHook(() => usePagination({ total: 100, page: 2, pageSize: 10, onPageChange }));
    act(() => c.result.current.next());
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(c.result.current.page).toBe(2);
    const stable = c.result.current.setPage;
    c.rerender();
    expect(c.result.current.setPage).toBe(stable);
  });
});

describe('useTableSelection', () => {
  const page1 = ['a', 'b', 'c'];
  const page2 = ['d', 'e'];
  const all = [...page1, ...page2];

  it('tracks page state, indeterminate, and keeps selection across page changes', () => {
    const { result, rerender } = renderHook(({ pageIds }) => useTableSelection({ pageIds, allIds: all }), { initialProps: { pageIds: page1 } });
    expect(result.current.pageState).toBe('none');
    act(() => result.current.toggle('a'));
    expect(result.current).toMatchObject({ pageState: 'some', allState: 'some' });
    act(() => result.current.togglePage());
    expect(result.current.pageState).toBe('all');
    rerender({ pageIds: page2 });
    expect(result.current.pageState).toBe('none');
    act(() => result.current.togglePage());
    expect(result.current).toMatchObject({ pageState: 'all', allState: 'all' });
    expect([...result.current.selected].toSorted()).toEqual(all);
    act(() => result.current.togglePage());
    expect(result.current.pageState).toBe('none');
    expect([...result.current.selected].toSorted()).toEqual(page1);
    rerender({ pageIds: page1 });
    act(() => result.current.togglePage());
    expect(result.current.selectedRowIds).toEqual([]);
  });

  it('selects and clears everything, ignoring empty pages and missing allIds', () => {
    const { result } = renderHook(() => useTableSelection({ pageIds: [], allIds: all }));
    expect(result.current.pageState).toBe('none');
    act(() => result.current.toggleAll());
    expect(result.current.allState).toBe('all');
    act(() => result.current.toggleAll());
    expect(result.current.selected.size).toBe(0);
    act(() => result.current.select(['a', 'b']));
    act(() => result.current.deselect(['a']));
    expect(result.current.selectedRowIds).toEqual(['b']);
    expect(result.current.isSelected('b')).toBe(true);
    act(() => result.current.clear());
    expect(result.current.selected.size).toBe(0);
    const bare = renderHook(() => useTableSelection({ pageIds: page1 }));
    act(() => bare.result.current.toggleAll());
    expect(bare.result.current).toMatchObject({ allState: 'none' });
    expect(bare.result.current.selected.size).toBe(0);
  });

  it('supports controlled use and does not re-notify for no-ops', () => {
    const onChange = vi.fn<(...args: unknown[]) => void>();
    const { result } = renderHook(() => useTableSelection({ pageIds: page1, selected: new Set(['a']), onChange }));
    act(() => result.current.toggle('b'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect([...(onChange.mock.calls[0]![0] as Set<string>)]).toEqual(['a', 'b']);
    expect(result.current.selected.has('b')).toBe(false);
    act(() => result.current.select(['a']));
    act(() => result.current.deselect(['zzz']));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('useColumnVisibility', () => {
  const columns = ['name', 'price', 'volume'];

  it('hides and shows in column order, ignores unknown ids and never hides the last column', () => {
    const { result } = renderHook(() => useColumnVisibility({ columns }));
    expect(result.current.visible).toEqual(columns);
    act(() => result.current.hide('price'));
    act(() => result.current.hide('nope'));
    expect(result.current.visible).toEqual(['name', 'volume']);
    expect([...result.current.hidden]).toEqual(['price']);
    act(() => result.current.toggle('name'));
    act(() => result.current.toggle('volume'));
    expect(result.current.visible).toEqual(['volume']);
    act(() => result.current.show('price'));
    expect(result.current.visible).toEqual(['price', 'volume']);
    act(() => result.current.showAll());
    expect(result.current.isVisible('name')).toBe(true);
  });

  it('falls back to the first column if a controlled value hides everything', () => {
    const { result } = renderHook(() => useColumnVisibility({ columns, hidden: new Set(columns) }));
    expect(result.current.visible).toEqual(['name']);
  });

  it('reports changes when controlled', () => {
    const onChange = vi.fn<(...args: unknown[]) => void>();
    const { result } = renderHook(() => useColumnVisibility({ columns, hidden: new Set<string>(), onChange }));
    act(() => result.current.hide('price'));
    expect([...(onChange.mock.calls[0]![0] as Set<string>)]).toEqual(['price']);
  });
});
