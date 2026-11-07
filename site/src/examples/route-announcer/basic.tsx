import { useEffect, useState } from 'react';
import { Button } from '@punji/ui/button';
import { RouteAnnouncer } from '@punji/ui/route-announcer';

const PAGES = [
  { path: '/markets', title: 'Markets' },
  { path: '/portfolio', title: 'Portfolio' },
  { path: '/alerts', title: 'Alerts' },
] as const;

// With a router: <RouteAnnouncer routeKey={location.pathname} />. Here a state value stands in for the route, and the
// announced text is mirrored on screen for the demo (the real live region is visually hidden).
export default function Example() {
  const [path, setPath] = useState<string>(PAGES[0].path);
  const page = PAGES.find((p) => p.path === path) ?? PAGES[0];
  const [heard, setHeard] = useState('');
  useEffect(() => {
    document.title = `${page.title} · Punji UI demo`;
  }, [page]);
  useEffect(() => {
    const live = document.querySelector('[data-testid="route-demo-live"]');
    if (!live) return;
    const observer = new MutationObserver(() => setHeard(live.textContent ?? ''));
    observer.observe(live, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <RouteAnnouncer routeKey={path} focusId="route-demo-main" testId="route-demo-live" />
      <div style={{ display: 'flex', gap: 8 }}>
        {PAGES.map((p) => (
          <Button key={p.path} size="sm" variant={p.path === path ? 'primary' : 'secondary'} onClick={() => setPath(p.path)}>
            {p.title}
          </Button>
        ))}
      </div>
      <section id="route-demo-main" tabIndex={-1} aria-label="Page">
        <h3 style={{ margin: 0 }}>{page.title}</h3>
        <p>A screen reader hears the new title and focus is on this section.</p>
      </section>
      <p aria-hidden="true">Announced: {heard || 'nothing yet'}</p>
    </div>
  );
}
