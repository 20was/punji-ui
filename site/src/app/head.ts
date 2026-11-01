import type { HeadData } from '../seo.ts';

// Keeps the document head in step with the route after client navigation. The first render already
// carries the right head (prerendered), so this only changes what differs.
function upsert(selector: string, tag: 'meta' | 'link', attrs: Record<string, string>, attribute: 'content' | 'href', value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.head.append(el);
  }
  el.setAttribute(attribute, value);
}
const meta = (key: 'name' | 'property', name: string, content: string) => upsert(`meta[${key}="${name}"]`, 'meta', { [key]: name }, 'content', content);

export function applyHead(head: HeadData): void {
  document.title = head.title;
  meta('name', 'description', head.description);
  meta('name', 'robots', head.robots);
  // The 404 view names no canonical URL (it is noindex and has no address of its own).
  if (head.canonical) upsert('link[rel="canonical"]', 'link', { rel: 'canonical' }, 'href', head.canonical);
  else document.head.querySelector('link[rel="canonical"]')?.remove();
  meta('property', 'og:title', head.title);
  meta('property', 'og:description', head.description);
  if (head.canonical) meta('property', 'og:url', head.canonical);
  meta('property', 'og:type', head.ogType);
  meta('name', 'twitter:title', head.title);
  meta('name', 'twitter:description', head.description);
  const ld = document.head.querySelector('script[type="application/ld+json"]');
  const json = head.jsonLd.length ? JSON.stringify(head.jsonLd.length === 1 ? head.jsonLd[0] : head.jsonLd) : '';
  if (json) {
    if (ld) ld.textContent = json;
    else {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = json;
      document.head.append(script);
    }
  } else ld?.remove();
}
