import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
// oxlint-disable-next-line import/no-unassigned-import -- the library's CSS distribution is a public API
import '@punji/ui/styles.css';
// oxlint-disable-next-line import/no-unassigned-import -- site styles (the stage padding and background)
import './styles.css';

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
if (Component) {
  createRoot(root).render(
    <main className="doc-stage-in" data-testid="preview">
      <Component />
    </main>,
  );
} else root.textContent = `No example ${slug}/${id}.`;
