import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { GROUPS, PAGES, leadOf, navTitleOf, pageBySlug, type ExampleDef, type GuideSection, type PageDef } from '../registry.ts';
import { pagePath } from '../seo.ts';
import sizes from '../generated/sizes.json';
import { Link } from './router.tsx';
import { apiEntry, type ApiEntry } from './api.ts';
import { Code, CopyButton } from './Code.tsx';
import { exampleSource, loadExample } from './examples.ts';
import { useResolvedTheme } from './theme.ts';
import { ChevronIcon, CodeIcon, DoIcon, DontIcon, MonitorIcon, MoonIcon, PhoneIcon, SunIcon } from './icons.tsx';

// ---------------------------------------------------------------------------------------------------------------
// Shared bits

const groupTitle = (page: PageDef) => GROUPS.find((g) => g.id === page.group)?.title ?? '';
const moduleSizes = (sizes as { modules: Record<string, number> }).modules;

/** size-limit's own units: bytes under 1 kB, otherwise kB with one decimal (1 kB = 1000 B). */
export const formatBytes = (bytes: number): string => (bytes < 1000 ? `${bytes} B` : `${(bytes / 1000).toFixed(1)} kB`);

/** The sidebar order flattened: what comes before and after a page. */
function neighbours(page: PageDef): { prev?: PageDef; next?: PageDef } {
  const order = GROUPS.flatMap((g) => PAGES.filter((p) => p.group === g.id));
  const i = order.findIndex((p) => p.slug === page.slug);
  return { prev: order[i - 1], next: order[i + 1] };
}

const INLINE = /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

/** Inline `code` and [text](href) in prose. Paths starting with / are in-site links; the rest open in a new tab. */
function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    out.push(text.slice(last, match.index));
    const [, code, label, href] = match;
    if (code) out.push(<code key={match.index}>{code}</code>);
    else if (href!.startsWith('/')) out.push(<Link key={match.index} to={href!}>{label}</Link>);
    else
      out.push(
        <a key={match.index} href={href} target="_blank" rel="noopener noreferrer">
          {label}
          <span className="kit-sr"> (opens in a new tab)</span>
        </a>,
      );
    last = match.index + match[0].length;
  }
  out.push(text.slice(last));
  return <>{out.map((node, i) => <Fragment key={i}>{node}</Fragment>)}</>;
}

/** Scrolls to an in-page section, respecting reduced motion, and records it in the address bar without a history entry. */
function goTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  window.history.replaceState(window.history.state, '', `#${id}`);
}

interface RailItem {
  id: string;
  label: string;
  onSelect?: () => void;
}

/** "On this page": the sections of what is showing. A link per section; the one in view is marked. */
function Rail({ items }: { items: RailItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const els = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => Boolean(el));
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const first = items.find((i) => seen.get(i.id));
        if (first) setActive(first.id);
      },
      { rootMargin: '-96px 0px -55% 0px' },
    );
    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);
  if (items.length < 2) return null;
  return (
    <nav className="doc-rail" aria-label="On this page">
      <p className="doc-rail-title">On this page</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                setActive(item.id);
                if (item.onSelect) item.onSelect();
                else goTo(item.id);
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PrevNext({ page }: { page: PageDef }) {
  const { prev, next } = neighbours(page);
  return (
    <nav className="doc-prevnext" aria-label="Previous and next page">
      {prev ? (
        <Link to={pagePath(prev)} className="is-prev">
          <span>Previous</span>
          <strong>{navTitleOf(prev)}</strong>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={pagePath(next)} className="is-next">
          <span>Next</span>
          <strong>{navTitleOf(next)}</strong>
        </Link>
      )}
    </nav>
  );
}

function RelatedCards({ page, id = 'related', level = 3 }: { page: PageDef; id?: string; level?: 2 | 3 }) {
  const others = page.related.map(pageBySlug).filter((p): p is PageDef => Boolean(p));
  if (others.length === 0) return null;
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <section aria-labelledby={id} className="doc-section">
      <H id={id}>Related</H>
      <ul className="doc-related">
        {others.map((other) => (
          <li key={other.slug}>
            <Link to={pagePath(other)}>
              <span className="doc-related-eyebrow">{groupTitle(other)}</span>
              <strong>{other.title}</strong>
              <span className="doc-related-lead">{leadOf(other)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PageHeader({ page, children }: { page: PageDef; children?: ReactNode }) {
  return (
    <header className="doc-head">
      <p className="doc-eyebrow">{groupTitle(page)}</p>
      <h1 tabIndex={-1} id="page-title">
        {page.title}
      </h1>
      <p className="doc-lead">{leadOf(page)}</p>
      {children}
    </header>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Component and utility pages

const names = (entry: ApiEntry, name: string) => (entry.kind === 'type' ? `type ${name}` : name);
const wrap = (list: string[], from: string) => {
  const one = `import { ${list.join(', ')} } from '${from}';`;
  return one.length <= 90 ? one : `import {\n  ${list.join(',\n  ')},\n} from '${from}';`;
};

function importLines(page: PageDef): { subpath: string; root: string } {
  const byModule = new Map<string, string[]>();
  const all: string[] = [];
  for (const ref of page.api) {
    const entry = apiEntry(ref.name);
    const list = byModule.get(entry.module) ?? [];
    list.push(names(entry, ref.name));
    byModule.set(entry.module, list);
    all.push(names(entry, ref.name));
  }
  return {
    subpath: [...byModule].map(([from, list]) => wrap(list, from)).join('\n'),
    root: wrap(all, '@punji/ui'),
  };
}

function Badges({ page }: { page: PageDef }) {
  const first = page.api[0];
  const module = first?.module;
  const size = module !== undefined ? moduleSizes[module] : undefined;
  const from = module === undefined ? undefined : module === '' ? '@punji/ui' : `@punji/ui/${module}`;
  const kind = page.kind === 'foundation' ? 'Foundation' : page.kind === 'component' ? 'React component' : page.kind === 'hooks' ? 'React hooks' : 'TypeScript utility';
  return (
    <ul className="doc-badges" aria-label="About this export">
      <li className="doc-badge">{kind}</li>
      {from && (
        <li className="doc-badge is-code">
          <code>{from}</code>
          <CopyButton text={from} label={`the import path ${from}`} className="doc-badge-copy" />
        </li>
      )}
      {page.kind === 'foundation' && (
        <li className="doc-badge is-code">
          <code>@punji/ui/tokens.css</code>
        </li>
      )}
      {size !== undefined && (
        <li className="doc-badge" title="Minified and gzipped, measured by size-limit at build time, React excluded">
          {formatBytes(size)} gzip
        </li>
      )}
    </ul>
  );
}

type TabId = 'examples' | 'code' | 'api' | 'usage';

function tabsFor(page: PageDef): { id: TabId; label: string }[] {
  const tabs: { id: TabId; label: string }[] = [];
  if (page.examples.length) tabs.push({ id: 'examples', label: 'Examples' });
  if (page.examples.length || page.api.length) tabs.push({ id: 'code', label: 'Code' });
  if (page.api.length) tabs.push({ id: 'api', label: 'API' });
  tabs.push({ id: 'usage', label: 'Usage' });
  return tabs;
}

const exampleFile = (slug: string, id: string) => `examples/${slug}/${id}.tsx`;

/** The demo frame: a title bar with the example's name, theme and width toggles, the live stage, then its code. */
function Demo({ page, def, onPick }: { page: PageDef; def: ExampleDef; onPick: (id: string) => void }) {
  const loaded = loadExample(page.slug, def.id);
  const resolved = useResolvedTheme();
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const [phone, setPhone] = useState(false);
  const [codeOpen, setCodeOpen] = useState(true);
  if (!loaded) return null;
  const { Component, source } = loaded;
  const shown = theme ?? resolved;
  return (
    <>
      {page.examples.length > 1 && (
        <div className="doc-chips" role="group" aria-label={`${page.title} variants`}>
          {page.examples.map((e) => (
            <button key={e.id} type="button" aria-pressed={e.id === def.id} onClick={() => onPick(e.id)}>
              {e.title}
            </button>
          ))}
        </div>
      )}
      <div className="doc-demo" id={`ex-${def.id}`}>
        <div className="doc-demo-bar">
          <div className="doc-demo-name">
            <strong>{def.title}</strong>
            {def.note && <span>{def.note}</span>}
          </div>
          <div className="doc-demo-tools">
            <div className="doc-seg doc-seg-width" role="group" aria-label="Preview width">
              <button type="button" aria-pressed={!phone} onClick={() => setPhone(false)} aria-label="Full width" title="Full width">
                <MonitorIcon />
              </button>
              <button type="button" aria-pressed={phone} onClick={() => setPhone(true)} aria-label="Phone width, 375 pixels" title="Phone width (375 px)">
                <PhoneIcon />
              </button>
            </div>
            <div className="doc-seg" role="group" aria-label="Preview theme">
              <button type="button" aria-pressed={shown === 'light'} onClick={() => setTheme('light')} aria-label="Light preview" title="Light preview">
                <SunIcon />
              </button>
              <button type="button" aria-pressed={shown === 'dark'} onClick={() => setTheme('dark')} aria-label="Dark preview" title="Dark preview">
                <MoonIcon />
              </button>
            </div>
          </div>
        </div>
        <div className={`doc-stage${phone ? ' is-phone' : ''}`} data-theme={theme ?? undefined}>
          <div className="doc-stage-in" data-testid="preview">
            <Component key={`${page.slug}/${def.id}`} />
          </div>
        </div>
        <div className="doc-demo-code">
          <div className="doc-demo-codebar">
            <button type="button" className="doc-demo-toggle" aria-expanded={codeOpen} aria-controls={`code-${def.id}`} onClick={() => setCodeOpen((o) => !o)}>
              <ChevronIcon className="doc-demo-chev" />
              <CodeIcon />
              {codeOpen ? 'Hide code' : 'Show code'}
            </button>
            <span className="doc-demo-file">{exampleFile(page.slug, def.id)}</span>
            <CopyButton text={source.replace(/\n+$/, '')} label={`${def.title} example code`} />
          </div>
          <div id={`code-${def.id}`} hidden={!codeOpen}>
            <Code key={def.id} flush label={`${def.title} example code`} title={exampleFile(page.slug, def.id)} code={source} />
          </div>
        </div>
      </div>
      {source.includes('/sample.ts') && (
        <p className="doc-footnote">
          <code>sample.ts</code> is this site’s synthetic NEPSE-style data (<code>fixtures/market-data.ts</code>), not market data and not part of the package.
        </p>
      )}
    </>
  );
}

function PropsTable({ entry }: { entry: ApiEntry }) {
  const rows = entry.props ?? [];
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be keyboard focusable
    <div className="doc-table-wrap" role="region" aria-label={`${entry.name} props`} tabIndex={0}>
      <table className="doc-table">
        <caption className="kit-sr">{entry.name} props</caption>
        <thead>
          <tr>
            <th scope="col">Prop</th>
            <th scope="col">Type</th>
            <th scope="col">Default</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">
                <code className="doc-prop">{row.name}</code>
                {row.required && <span className="doc-req">Required</span>}
              </th>
              <td>
                <code className="doc-type">{row.type}</code>
              </td>
              <td>{row.default ? <code className="doc-default">{row.default}</code> : <span className="doc-none" aria-label="No default">–</span>}</td>
              <td>{row.description ? <Rich text={row.description} /> : <span className="doc-muted">No description in the source yet.</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApiBlock({ entry }: { entry: ApiEntry }) {
  return (
    <section className="doc-api" data-testid={`api-${entry.name}`} aria-labelledby={`api-${entry.name}`}>
      <div className="doc-api-head">
        <h3 id={`api-${entry.name}`}>
          <code>{entry.name}</code>
        </h3>
        <span className="doc-kind">{entry.kind}</span>
        <span className="doc-from">
          <code>{entry.module}</code>
        </span>
      </div>
      {entry.description && (
        <p className="doc-api-desc">
          <Rich text={entry.description} />
        </p>
      )}
      {entry.props && <PropsTable entry={entry} />}
      {entry.inherited && (
        <details className="doc-inherited">
          <summary>
            <ChevronIcon className="doc-demo-chev" />
            Inherited HTML attributes
          </summary>
          <p>Also accepts the standard HTML attributes of the element it renders, such as <code>id</code>, <code>className</code> and <code>aria-*</code>.</p>
        </details>
      )}
      {entry.signature && <Code label={`${entry.name} signature`} title="Signature" lang="ts" code={`${entry.kind === 'constant' ? 'const' : 'function'} ${entry.name}: ${entry.signature}`} />}
      {entry.definition && <Code label={`${entry.name} definition`} title="Definition" lang="ts" code={`type ${entry.name} = ${entry.definition}`} />}
    </section>
  );
}

function Bullets({ id, title, items }: { id: string; title: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="doc-section">
      <h3 id={id}>{title}</h3>
      <ul className="doc-list">
        {items.map((item) => (
          <li key={item}>
            <Rich text={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComponentPage({ page }: { page: PageDef }) {
  const tabs = useMemo(() => tabsFor(page), [page]);
  const [tab, setTab] = useState<TabId>(tabs[0]!.id);
  const [active, setActive] = useState(page.examples[0]?.id ?? '');
  const def = page.examples.find((e) => e.id === active) ?? page.examples[0];
  const imports = useMemo(() => (page.api.length > 0 ? importLines(page) : undefined), [page]);
  const entries = useMemo(() => [...new Set(page.api.map((a) => a.name))].map(apiEntry), [page]);
  const styled = page.kind === 'component' || page.kind === 'foundation';

  const show = useCallback(
    (next: TabId, scroll = true) => {
      setTab(next);
      window.history.replaceState(window.history.state, '', next === tabs[0]!.id ? window.location.pathname : `#${next}`);
      if (!scroll) return;
      const bar = document.getElementById('page-tabs');
      if (bar && bar.getBoundingClientRect().top < 0) window.scrollTo({ top: window.scrollY + bar.getBoundingClientRect().top - 64 });
    },
    [tabs],
  );

  // A deep link (#api, #keyboard, #ex-nepal) opens the tab that holds it, after hydration so the server HTML matches.
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      if (tabs.some((t) => t.id === id)) return setTab(id as TabId);
      const el = document.getElementById(id);
      const panel = el?.closest<HTMLElement>('[data-tab]')?.dataset.tab as TabId | undefined;
      if (id.startsWith('ex-') && page.examples.some((e) => `ex-${e.id}` === id)) {
        setTab('examples');
        setActive(id.slice(3));
      } else if (panel) setTab(panel);
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, [tabs, page]);

  const rail = useMemo((): Record<TabId, RailItem[]> => ({
    examples: page.examples.map((e) => ({ id: `ex-${e.id}`, label: e.title, onSelect: () => setActive(e.id) })),
    code: [...(imports ? [{ id: 'import', label: 'Import' }] : []), ...page.examples.map((e) => ({ id: `src-${e.id}`, label: e.title }))],
    api: entries.map((e) => ({ id: `api-${e.name}`, label: e.name })),
    usage: [
      { id: 'overview', label: 'Overview' },
      { id: 'when', label: 'When to use' },
      ...(page.keyboard.length ? [{ id: 'keyboard', label: 'Keyboard' }] : []),
      ...(page.accessibility.length ? [{ id: 'a11y', label: 'Accessibility' }] : []),
      ...(page.responsive.length ? [{ id: 'responsive', label: 'Responsive' }] : []),
      ...(page.notes ? [{ id: 'notes', label: page.notes.title }] : []),
      ...(page.related.length ? [{ id: 'related', label: 'Related' }] : []),
    ],
  }), [page, imports, entries]);

  return (
    <div className="doc-page has-rail" data-testid={`page-${page.slug}`}>
      <article className="doc-article">
        <PageHeader page={page}>
          <Badges page={page} />
        </PageHeader>

        <nav id="page-tabs" className="doc-tabs" aria-label="Page sections">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              aria-current={tab === t.id ? 'true' : undefined}
              onClick={(event) => {
                event.preventDefault();
                show(t.id);
              }}
              data-testid={`tab-${t.id}`}
            >
              {t.label}
              {t.id === 'api' && <span className="doc-tab-count">{entries.length}</span>}
            </a>
          ))}
        </nav>

        {def && (
          <section id="examples" className="doc-panel" data-tab="examples" hidden={tab !== 'examples'} aria-labelledby="examples-h">
            <h2 id="examples-h" className="doc-panel-h">
              Examples
            </h2>
            <Demo page={page} def={def} onPick={setActive} />
          </section>
        )}

        <section id="code" className="doc-panel" data-tab="code" hidden={tab !== 'code'} aria-labelledby="code-h">
          <h2 id="code-h" className="doc-panel-h">
            Code
          </h2>
          {imports && (
            <section aria-labelledby="import" className="doc-section">
              <h3 id="import">Import</h3>
              <p className="doc-p">Each export has its own subpath, so you only ship what you import. Everything is also available from the package root.</p>
              <Code label="Subpath import" title="Subpath import (smallest bundle)" lang="ts" code={imports.subpath} />
              <Code label="Root import" title="Root import" lang="ts" code={imports.root} />
              {styled && (
                <p className="doc-p">
                  Load the styles once, in your app’s entry file: <code>import '@punji/ui/styles.css';</code>
                </p>
              )}
            </section>
          )}
          {page.examples.map((e) => {
            const source = loadExample(page.slug, e.id)?.source ?? '';
            return (
              <section key={e.id} aria-labelledby={`src-${e.id}`} className="doc-section">
                <h3 id={`src-${e.id}`}>{e.title}</h3>
                {e.note && <p className="doc-p">{e.note}</p>}
                <Code label={`${e.title} full source`} title={exampleFile(page.slug, e.id)} lang="tsx" code={source} />
              </section>
            );
          })}
        </section>

        {entries.length > 0 && (
          <section id="api" className="doc-panel" data-tab="api" hidden={tab !== 'api'} aria-labelledby="api-h">
            <h2 id="api-h" className="doc-panel-h">
              API
            </h2>
            <p className="doc-p doc-api-intro">Generated from the package’s published type declarations, so it always matches what you install.</p>
            {entries.map((entry) => (
              <ApiBlock key={entry.name} entry={entry} />
            ))}
          </section>
        )}

        <section id="usage" className="doc-panel" data-tab="usage" hidden={tab !== 'usage'} aria-labelledby="usage-h">
          <h2 id="usage-h" className="doc-panel-h">
            Usage
          </h2>
          <section aria-labelledby="overview" className="doc-section">
            <h3 id="overview">Overview</h3>
            <p className="doc-p">
              <Rich text={page.summary} />
            </p>
          </section>
          <section aria-labelledby="when" className="doc-section">
            <h3 id="when">When to use</h3>
            <div className="doc-dodont">
              <div className="is-do">
                <p className="doc-dodont-title">
                  <DoIcon /> Use it for
                </p>
                <ul>
                  {page.use.map((item) => (
                    <li key={item}>
                      <Rich text={item} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="is-dont">
                <p className="doc-dodont-title">
                  <DontIcon /> Not for
                </p>
                <ul>
                  {page.avoid.map((item) => (
                    <li key={item}>
                      <Rich text={item} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
          <Bullets id="keyboard" title="Keyboard" items={page.keyboard} />
          <Bullets id="a11y" title="Accessibility" items={page.accessibility} />
          <Bullets id="responsive" title="Responsive behaviour" items={page.responsive} />
          {page.notes && <Bullets id="notes" title={page.notes.title} items={page.notes.points} />}
          <RelatedCards page={page} />
        </section>

        <PrevNext page={page} />
      </article>
      <Rail key={tab} items={rail[tab]} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Guides

function GuideBlock({ slug, section }: { slug: string; section: GuideSection }) {
  return (
    <section aria-labelledby={section.id} className="doc-section doc-guide-section">
      <h2 id={section.id}>{section.title}</h2>
      {section.paragraphs.map((text) => (
        <p key={text} className="doc-p">
          <Rich text={text} />
        </p>
      ))}
      {section.points && (
        <ul className="doc-list">
          {section.points.map((text) => (
            <li key={text}>
              <Rich text={text} />
            </li>
          ))}
        </ul>
      )}
      {section.code?.map((block) => (
        <Code
          key={block.label}
          label={block.label}
          title={block.file ? `${block.label}` : block.label}
          lang={block.file ? 'tsx' : undefined}
          code={block.file ? (exampleSource(slug, block.file) ?? '') : (block.text ?? '')}
        />
      ))}
    </section>
  );
}

function GuidePage({ page }: { page: PageDef }) {
  const sections = useMemo(() => page.guide ?? [], [page]);
  const rail = useMemo((): RailItem[] => [...sections.map((s) => ({ id: s.id, label: s.title })), ...(page.related.length ? [{ id: 'related', label: 'Related' }] : [])], [sections, page]);
  return (
    <div className="doc-page has-rail" data-testid={`page-${page.slug}`}>
      <article className="doc-article doc-guide">
        <PageHeader page={page} />
        <p className="doc-intro">
          <Rich text={page.summary} />
        </p>
        {sections.map((section) => (
          <GuideBlock key={section.id} slug={page.slug} section={section} />
        ))}
        <div className="doc-guide-related">
          <RelatedCards page={page} level={2} />
        </div>
        <PrevNext page={page} />
      </article>
      <Rail items={rail} />
    </div>
  );
}

export function PageView({ page }: { page: PageDef }) {
  return page.guide ? <GuidePage page={page} /> : <ComponentPage page={page} />;
}

