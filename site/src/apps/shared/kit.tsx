// The small frame every app shares: which screen is showing (kept in the URL hash), a ticking clock that only runs
// in the browser, screens that load on demand, and the navigation shell (a rail on wide screens, a tab bar on
// phones). Built from @punji/ui exports and React; nothing here is package API.
import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Button } from '@punji/ui/button';
import { EmptyState, Skeleton } from '@punji/ui/states';
import { useMediaQuery } from '@punji/ui/hooks';

/**
 * The screen showing, synced with the URL hash (`#orders`), so a screen can be linked, reloaded and reached with
 * Back. The server and the first client render use `initial`; the hash is read after hydration.
 */
export function useScreen<T extends string>(ids: readonly T[], initial: T): [T, (id: T) => void] {
  const [screen, setScreen] = useState<T>(initial);
  const known = useRef(ids);
  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.slice(1) as T;
      if (known.current.includes(hash)) setScreen(hash);
      else if (!hash) setScreen(initial);
    };
    read();
    window.addEventListener('hashchange', read);
    window.addEventListener('popstate', read);
    return () => {
      window.removeEventListener('hashchange', read);
      window.removeEventListener('popstate', read);
    };
  }, [initial]);
  const go = useCallback((id: T) => {
    setScreen(id);
    if (window.location.hash !== `#${id}`) window.history.pushState(window.history.state, '', `#${id}`);
  }, []);
  return [screen, go];
}

/** Whether the person asked for less motion. False on the server and the first render. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Call `onTick` every `intervalMs` while `running` and the tab is visible. Never on the server, so the prerendered
 * HTML is the seeded opening state and the clock starts after hydration.
 */
export function useTicker(onTick: () => void, { intervalMs = 1500, running = true }: { intervalMs?: number; running?: boolean } = {}): void {
  const latest = useRef(onTick);
  useEffect(() => {
    latest.current = onTick;
  });
  useEffect(() => {
    if (!running) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (id === undefined && document.visibilityState === 'visible') id = setInterval(() => latest.current(), intervalMs);
    };
    const stop = () => {
      if (id !== undefined) clearInterval(id);
      id = undefined;
    };
    const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop());
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, running]);
}

export interface LazyScreen<P> {
  (props: P): ReactNode;
  /** Start loading (on hover or focus of its nav item), so the switch is instant. */
  preload: () => Promise<unknown>;
}

/**
 * A screen in its own chunk: it shows a loading placeholder until the chunk arrives and an error with a retry if it
 * cannot be fetched. Keeps an app's first load small (the docs budget is 150 kB of gzipped JavaScript up front).
 */
export function lazyScreen<P extends object>(load: () => Promise<{ default: ComponentType<P> }>, title: string): LazyScreen<P> {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  const preload = () => {
    pending ??= load().then(
      (m) => (loaded = m.default),
      (error: unknown) => {
        pending = null;
        throw error;
      },
    );
    return pending;
  };
  function Screen(props: P) {
    const [Component, setComponent] = useState<ComponentType<P> | null>(() => loaded);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
      if (Component || failed) return;
      let live = true;
      preload().then(
        (c) => live && setComponent(() => c),
        () => live && setFailed(true),
      );
      return () => {
        live = false;
      };
    }, [Component, failed]);
    if (Component) return <Component {...props} />;
    if (failed)
      return (
        <EmptyState
          title={`${title} could not be loaded`}
          body="Check your connection and try again. Your orders and settings are kept."
          headingLevel={2}
          action={
            <Button
              size="sm"
              onClick={() => setFailed(false)}
            >
              Try again
            </Button>
          }
        />
      );
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <span className="kit-sr">Loading {title}…</span>
        <Skeleton height={28} width="40%" still />
        <Skeleton height={160} still />
        <Skeleton height={220} still />
      </div>
    );
  }
  const screen = Screen as LazyScreen<P>;
  screen.preload = preload;
  return screen;
}

export interface FrameScreen<T extends string> {
  id: T;
  title: string;
  /** A shorter label for the phone tab bar. */
  short?: string;
  icon: ReactNode;
  /** Shown as a count beside the label (open orders). */
  badge?: number;
  preload?: () => unknown;
}

/**
 * The app's navigation shell. Screens are hash links (they work before hydration and open in a new tab); a click
 * switches in place and moves focus to the new screen's heading, so keyboard and screen reader users land on it.
 */
export function AppFrame<T extends string>({
  label,
  screens,
  current,
  onSelect,
  toolbar,
  banner,
  children,
}: {
  label: string;
  screens: readonly FrameScreen<T>[];
  current: T;
  onSelect: (id: T) => void;
  toolbar?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const focusNext = useRef(false);
  const screenRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusNext.current) return;
    const heading = screenRef.current?.querySelector<HTMLElement>('[data-screen-title]');
    if (!heading) return;
    focusNext.current = false;
    heading.focus({ preventScroll: true });
    const top = screenRef.current!.getBoundingClientRect().top + window.scrollY - 64;
    if (window.scrollY > top) window.scrollTo({ top });
  });
  return (
    <div className="app-frame">
      <nav className="app-nav" aria-label={`${label} screens`}>
        <ul>
          {screens.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={s.id === current ? 'page' : undefined}
                onMouseEnter={() => s.preload?.()}
                onFocus={() => s.preload?.()}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  focusNext.current = true;
                  onSelect(s.id);
                }}
                data-testid={`screen-${s.id}`}
              >
                <span className="app-nav-icon" aria-hidden="true">
                  {s.icon}
                </span>
                <span className="app-nav-label">
                  <span className="app-nav-long">{s.title}</span>
                  <span className="app-nav-short" aria-hidden="true">
                    {s.short ?? s.title}
                  </span>
                </span>
                {s.badge ? (
                  <span className="app-nav-badge">
                    {s.badge}
                    <span className="kit-sr"> open</span>
                  </span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="app-body">
        {toolbar && <div className="app-toolbar">{toolbar}</div>}
        {banner}
        <div className="app-screen" ref={screenRef} data-screen={current}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** A screen's heading (h2). Focus lands here when the screen is opened from the navigation. */
export function ScreenTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="app-screen-head">
      <h2 className="app-screen-title" tabIndex={-1} data-screen-title>
        {children}
      </h2>
      {aside && <div className="app-screen-aside">{aside}</div>}
    </div>
  );
}
