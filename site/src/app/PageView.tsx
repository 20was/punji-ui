import { useState } from 'react';
import { SegmentedControl } from '@punji/ui/controls';
import { GROUPS, pageBySlug, type PageDef } from '../registry.ts';
import { apiEntry, type ApiEntry } from './api.ts';
import { Code } from './Code.tsx';
import { loadExample } from './examples.ts';

const names = (entry: ApiEntry, name: string) => (entry.kind === 'type' ? `type ${name}` : name);
const wrap = (list: string[], from: string) => {
  const one = `import { ${list.join(', ')} } from '${from}';`;
  return one.length <= 100 ? one : `import {\n  ${list.join(',\n  ')},\n} from '${from}';`;
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
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">
                <code>{row.name}</code>
                {row.required && <span className="doc-req"> required</span>}
              </th>
              <td>
                <code>{row.type}</code>
              </td>
              <td>
                {row.description || <span className="doc-muted">No description in the source yet.</span>}
                {row.default && (
                  <>
                    {' '}
                    <span className="doc-muted">Default: </span>
                    <code>{row.default}</code>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApiBlock({ entry }: { entry: ApiEntry }) {
  return (
    <div className="doc-api" data-testid={`api-${entry.name}`}>
      <h3 id={`api-${entry.name}`}>
        <code>{entry.name}</code> <span className="doc-kind">{entry.kind}</span>
      </h3>
      <p className="doc-from">
        from <code>{entry.module}</code>
      </p>
      {entry.description && <p>{entry.description}</p>}
      {entry.props && <PropsTable entry={entry} />}
      {entry.inherited && <p className="doc-muted">Also accepts the standard HTML attributes of the element it renders.</p>}
      {entry.signature && <Code label={`${entry.name} signature`} code={`${entry.kind === 'constant' ? 'const' : 'function'} ${entry.name}: ${entry.signature}`} />}
      {entry.definition && <Code label={`${entry.name} definition`} code={`type ${entry.name} = ${entry.definition}`} />}
    </div>
  );
}

function Preview({ page }: { page: PageDef }) {
  const [active, setActive] = useState(page.examples[0]?.id ?? '');
  const def = page.examples.find((e) => e.id === active) ?? page.examples[0];
  const loaded = def ? loadExample(page.slug, def.id) : undefined;
  if (!def || !loaded) return null;
  const { Component, source } = loaded;
  return (
    <section aria-labelledby="preview" className="doc-section">
      <h2 id="preview">Live preview</h2>
      {page.examples.length > 1 && (
        <SegmentedControl
          label={`${page.title} variants`}
          prefix={`variant-${page.slug}`}
          size="sm"
          value={active}
          onChange={setActive}
          options={page.examples.map((e) => ({ value: e.id, label: e.title }))}
        />
      )}
      <div className="doc-preview" data-testid="preview">
        <Component key={`${page.slug}/${def.id}`} />
      </div>
      {def.note && <p className="doc-muted">{def.note}</p>}
      <Code key={def.id} label={`${def.title} example code`} code={source} />
      {source.includes('/sample.ts') && (
        <p className="doc-muted">
          <code>sample.ts</code> is this site's synthetic NEPSE-style data (<code>fixtures/market-data.ts</code>), not market data and not part of the package.
        </p>
      )}
    </section>
  );
}

function List({ id, title, items }: { id: string; title: string; items: readonly string[] }) {
  return (
    <section aria-labelledby={id} className="doc-section">
      <h2 id={id}>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function PageView({ page }: { page: PageDef }) {
  const group = GROUPS.find((g) => g.id === page.group);
  const imports = page.api.length > 0 ? importLines(page) : undefined;
  const entries = [...new Set(page.api.map((a) => a.name))].map(apiEntry);
  return (
    <article className="doc-page" data-testid={`page-${page.slug}`}>
      <header>
        <p className="doc-eyebrow">{group?.title}</p>
        <h1 tabIndex={-1} id="page-title">{page.title}</h1>
        <p className="doc-lead">{page.summary}</p>
      </header>

      <div className="doc-split">
        <section aria-labelledby="use" className="doc-section">
          <h2 id="use">When to use</h2>
          <ul>
            {page.use.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="avoid" className="doc-section">
          <h2 id="avoid">When not to use</h2>
          <ul>
            {page.avoid.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      {imports && (
        <section aria-labelledby="import" className="doc-section">
          <h2 id="import">Import</h2>
          <p className="doc-muted">Each export has its own subpath (smallest bundle); everything is also on the root.</p>
          <Code label="Subpath import" code={imports.subpath} />
          <Code label="Root import" code={imports.root} />
          {page.kind !== 'utility' && page.kind !== 'hooks' && <p className="doc-muted">Load the styles once: <code>import '@punji/ui/styles.css';</code></p>}
        </section>
      )}

      <Preview page={page} />

      {entries.length > 0 && (
        <section aria-labelledby="api" className="doc-section">
          <h2 id="api">API</h2>
          <p className="doc-muted">Generated from the built type declarations, so it matches what you install.</p>
          {entries.map((entry) => (
            <ApiBlock key={entry.name} entry={entry} />
          ))}
        </section>
      )}

      <List id="keyboard" title="Keyboard behaviour" items={page.keyboard} />
      <List id="a11y" title="Accessibility" items={page.accessibility} />
      <List id="responsive" title="Responsive behaviour" items={page.responsive} />
      {page.notes && <List id="notes" title={page.notes.title} items={page.notes.points} />}

      <section aria-labelledby="related" className="doc-section">
        <h2 id="related">Related</h2>
        <ul className="doc-related">
          {page.related.map((slug) => {
            const other = pageBySlug(slug);
            return other ? (
              <li key={slug}>
                <a href={`#/${slug}`}>{other.title}</a>
              </li>
            ) : null;
          })}
        </ul>
      </section>
    </article>
  );
}
