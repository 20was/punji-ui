import { StrictMode, act } from 'react';
import { renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useMediaQuery } from '../src/use-media-query/useMediaQuery.ts';
import { useHydrated } from '../src/use-hydrated/useHydrated.ts';
import { useStableOrder, keepOrder } from '../src/stable-order/useStableOrder.ts';

afterEach(() => vi.unstubAllGlobals());
function Probe() { return <span>{String(useHydrated())}/{String(useMediaQuery('(min-width: 800px)'))}</span>; }
const keyOf=(row:{id:string;value:number})=>row.id;
function mediaMock() {
  const lists = new Map<string, { matches: boolean; listeners: Set<() => void>; addEventListener: (type:string, fn:()=>void)=>void; removeEventListener: (type:string, fn:()=>void)=>void }>();
  const get = (query:string) => {
    if (!lists.has(query)) {
      const listeners = new Set<() => void>();
      lists.set(query, {matches:false,listeners,addEventListener:(_type,fn)=>listeners.add(fn),removeEventListener:(_type,fn)=>listeners.delete(fn)});
    }
    return lists.get(query)!;
  };
  vi.stubGlobal('matchMedia', undefined);
  Object.defineProperty(window, 'matchMedia', {configurable:true,writable:true,value:vi.fn<(query:string)=>ReturnType<typeof get>>(get)});
  return { get, change: (query:string, matches:boolean) => { const list=get(query); list.matches=matches; for(const notify of list.listeners) notify(); } };
}
describe('media query lifecycle', () => {
  it('updates, switches queries and cleans up under StrictMode', () => {
    const mock = mediaMock();
    const {result,rerender,unmount} = renderHook(({query})=>useMediaQuery(query), {initialProps:{query:'(min-width: 800px)'},wrapper:StrictMode});
    expect(result.current).toBe(false);
    act(()=>mock.change('(min-width: 800px)',true));
    expect(result.current).toBe(true);
    expect(mock.get('(min-width: 800px)').listeners.size).toBe(1);
    rerender({query:'(prefers-reduced-motion: reduce)'});
    expect(result.current).toBe(false);
    expect(mock.get('(min-width: 800px)').listeners.size).toBe(0);
    unmount();
    expect(mock.get('(prefers-reduced-motion: reduce)').listeners.size).toBe(0);
  });
  it('uses the explicit fallback if matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia',undefined);
    expect(renderHook(()=>useMediaQuery('anything',true)).result.current).toBe(true);
  });
  it('hydrates server snapshots before adopting browser values', async () => {
    const mock=mediaMock(); mock.get('(min-width: 800px)').matches=true;

    const html=renderToString(<Probe/>);
    expect(html).toContain('false');
    expect(html).not.toContain('true');
    const container=document.createElement('div'); container.innerHTML=html;document.body.append(container);
    const recoverable=vi.fn<(error:unknown)=>void>();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async()=>{ root=hydrateRoot(container,<Probe/>,{onRecoverableError:recoverable}); });
    expect(container.textContent).toBe('true/true');
    expect(recoverable).not.toHaveBeenCalled();
    await act(async()=>root!.unmount());container.remove();
  });
});
describe('stable live ordering', () => {
  it('keeps positions but supplies fresh objects until sort or membership changes', () => {
    const first=[{id:'a',value:1},{id:'b',value:2}];
    const {result,rerender}=renderHook(({rows,sort})=>useStableOrder(rows,keyOf,sort),{initialProps:{rows:first,sort:'price'}});
    const next=[{id:'b',value:3},{id:'a',value:4}];
    rerender({rows:next,sort:'price'});
    expect(result.current.map(keyOf)).toEqual(['a','b']);
    expect(result.current[0]).toBe(next[1]);
    expect(result.current).not.toBe(first);
    rerender({rows:next,sort:'price-desc'});
    expect(result.current.map(keyOf)).toEqual(['b','a']);
    rerender({rows:[{id:'c',value:5},...next],sort:'price-desc'});
    expect(result.current.map(keyOf)).toEqual(['c','b','a']);
    rerender({rows:[],sort:'price-desc'});
    expect(result.current).toEqual([]);
  });
  it('rejects duplicate keys instead of dropping or duplicating financial rows', () => {
    expect(()=>keepOrder(['a','b'],['a','a'])).toThrow('Stable order requires unique keys');
    const previous=['a','b'];expect(keepOrder(previous,['b','a'])).toBe(previous);
    expect(keepOrder(previous,['c','b'])).toEqual(['c','b']);
  });
});
