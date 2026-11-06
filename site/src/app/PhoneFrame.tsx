import { useEffect, useRef, useState } from 'react';
import type { PreviewPrefs } from './preview.ts';
import { BASE } from './router.tsx';

/** The smallest frame height: room for a menu, listbox or sheet the example opens inside its own viewport. */
const MIN_HEIGHT = 320;

/**
 * The phone-width preview: the example rendered in a same-origin iframe (site/preview-frame/), so it gets a real
 * 375 px viewport. Viewport media queries in the package CSS, matchMedia in hooks, and portals to document.body all
 * behave as on a phone, which a narrowed div cannot do. The frame loads the same stylesheet as the page, takes the
 * preview theme from the page (kept in step while it is open) and grows to its content's height.
 */
export function PhoneFrame({ slug, id, title, theme, prefs, showcase }: { slug: string; id: string; title: string; theme: string; prefs: PreviewPrefs; showcase: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_HEIGHT);
  // The theme the frame was created with goes in its URL (no flash); later changes are applied to its document.
  const [initial] = useState({ theme, locale: prefs.locale, density: prefs.density });
  const src = `${BASE}preview-frame/?${new URLSearchParams({ example: `${slug}/${id}`, theme: initial.theme, locale: initial.locale, density: initial.density, ...(showcase ? { showcase: '1' } : {}) })}`;

  useEffect(() => {
    ref.current?.contentDocument?.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Locale and density reach the frame as a message (it owns its provider); the frame also reads them from its URL.
  useEffect(() => {
    ref.current?.contentWindow?.postMessage({ type: 'punji-preview', locale: prefs.locale, density: prefs.density }, window.location.origin);
  }, [prefs.locale, prefs.density]);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let observer: ResizeObserver | undefined;
    const attach = () => {
      const doc = frame.contentDocument;
      const view = frame.contentWindow as (Window & typeof globalThis) | null;
      const root = doc?.getElementById('root');
      if (!doc || !view || !root) return;
      doc.documentElement.setAttribute('data-theme', theme);
      view.postMessage({ type: 'punji-preview', locale: prefs.locale, density: prefs.density }, window.location.origin);
      observer?.disconnect();
      observer = new view.ResizeObserver(() => setHeight(Math.max(MIN_HEIGHT, Math.ceil(root.getBoundingClientRect().height))));
      observer.observe(root);
    };
    // The frame may already have loaded before this effect ran (a cached document).
    if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.getElementById('root')) attach();
    frame.addEventListener('load', attach);
    return () => {
      frame.removeEventListener('load', attach);
      observer?.disconnect();
    };
    // theme and prefs are read once on attach; later changes go through the effects above.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    // oxlint-disable-next-line react/iframe-missing-sandbox -- the frame is this site's own page, and same-origin script access is the point (the page sets its theme and reads its height); a sandbox allowing both scripts and same-origin would protect nothing
    <iframe ref={ref} className="doc-phone-frame" src={src} title={`${title}, phone-width preview`} style={{ height }} allow="clipboard-write" data-testid="phone-frame" />
  );
}
