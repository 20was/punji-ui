import { useEffect, useState, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
// oxlint-disable-next-line import/no-unassigned-import -- the library's CSS distribution is a public API
import '@punji/ui/styles.css';
// oxlint-disable-next-line import/no-unassigned-import -- site styles (the stage padding and background)
import './styles.css';
import { LocaleScope } from './app/PreviewScope.tsx';
import { sanitise } from './app/preview.ts';

// The phone-width preview frame (site/preview-frame/index.html, opened by src/app/PhoneFrame.tsx): one example in
// its own viewport, so the package's viewport media queries, matchMedia and body portals behave as on a phone.
const params = new URLSearchParams(window.location.search);
const [slug = '', id = ''] = (params.get('example') ?? '').split('/');
if (params.get('showcase')) document.body.classList.add('is-showcase');

// Only this frame's entry carries the map of example files; the docs pages load examples with their route module.
const examples = import.meta.glob<{ default: ComponentType }>('./examples/*/*.tsx');
const key = `./examples/${slug}/${id}.tsx`;
const load = /^[a-z0-9-]+$/.test(slug) && /^[a-z0-9-]+$/.test(id) && Object.hasOwn(examples, key) ? examples[key] : undefined;
const Component = (await load?.())?.default;
const root = document.getElementById('root')!;

// Locale and density: from the URL at first, then from the page's messages (src/app/PhoneFrame.tsx). Density is an
// attribute on this document; the locale goes through the library's provider.
function Frame({ Example }: { Example: ComponentType }) {
  const [prefs, setPrefs] = useState(() => sanitise(Object.fromEntries(params)));
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | null;
      if (event.origin !== window.location.origin || data?.type !== 'punji-preview') return;
      setPrefs((prev) => ({ ...prev, ...sanitise({ ...data, theme: prev.theme }) }));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-pu-density', prefs.density);
  }, [prefs.density]);
  return (
    <LocaleScope locale={prefs.locale}>
      <main className="doc-stage-in" data-testid="preview">
        <Example />
      </main>
    </LocaleScope>
  );
}

if (Component) {
  createRoot(root).render(<Frame Example={Component} />);
} else root.textContent = `No example ${slug}/${id}.`;
