import { Fragment, type ComponentType, type ReactNode } from 'react';
import { pagePath, REPO } from '../paths.ts';
import type { PageData } from './load.ts';
import { groupTitleOf } from './nav.ts';
import { Link } from './router.tsx';
import { ThemeSwitch } from './ThemeSwitch.tsx';
import { CodeIcon, ExternalIcon, Wordmark } from './icons.tsx';
import '../apps/shared/app.css';

// The frame of an app page (/apps/<slug>/): a slim bar with the app's name (the page's h1), the way back to the docs,
// the source and the theme; the app itself, which owns the rest of the viewport; then "About this app", the short
// page that says what it is built from. The app is site/src/apps/<slug>/App.tsx and knows nothing of this frame.

/** Inline `code` in prose. */
function Prose({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{i % 2 ? <code>{part}</code> : part}</Fragment>
      ))}
    </>
  );
}

function List({ id, title, items }: { id: string; title: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="doc-app-about-block">
      <h3 id={id}>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <Prose text={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AppView({ data, App }: { data: PageData; App: ComponentType }): ReactNode {
  const { page, related } = data;
  const source = `${REPO}/tree/main/site/src/apps/${page.slug}`;
  const screens = page.app?.screens ?? [];
  return (
    <div className="doc-app-page" data-testid={`app-${page.slug}`}>
      <header className="doc-app-bar">
        <Link className="doc-app-brand" to="/" aria-label="Punji UI documentation">
          <Wordmark height={16} />
        </Link>
        <span className="doc-app-crumb" aria-hidden="true">
          /
        </span>
        <h1 id="page-title" tabIndex={-1} className="doc-app-title">
          {page.navTitle ?? page.title}
        </h1>
        <span className="doc-app-badge">Demo · simulated data</span>
        <nav className="doc-app-links" aria-label="About this app">
          <a href="#about">About</a>
          <a href={source} target="_blank" rel="noopener noreferrer" className="doc-app-source">
            <CodeIcon />
            <span>Source</span>
            <span className="kit-sr"> (opens in a new tab)</span>
          </a>
        </nav>
        <ThemeSwitch />
      </header>

      <div className="doc-app-stage">
        <App />
      </div>

      <section id="about" className="doc-app-about" aria-labelledby="about-h">
        <div className="doc-app-about-in">
          <p className="doc-app-eyebrow">About this app</p>
          <h2 id="about-h">{page.title}</h2>
          <p className="doc-app-lead">
            <Prose text={page.summary} />
          </p>
          <p className="doc-app-note">
            <strong>A demo, not a product.</strong> Every part is a documented <code>@punji/ui</code> export; the screens, their state and the
            simulated market are site code in <a href={source} target="_blank" rel="noopener noreferrer">site/src/apps/{page.slug}<ExternalIcon /><span className="kit-sr"> (opens in a new tab)</span></a> for you to copy.
            Prices, companies and accounts are synthetic.
          </p>
          {screens.length > 0 && (
            <section aria-labelledby="screens-h" className="doc-app-about-block">
              <h3 id="screens-h">Screens</h3>
              <dl className="doc-app-screens">
                {screens.map((screen) => (
                  <div key={screen.id}>
                    <dt>
                      <a href={`#${screen.id}`}>{screen.title}</a>
                    </dt>
                    <dd>
                      <Prose text={screen.summary} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {page.app && (
            <section aria-labelledby="data-h" className="doc-app-about-block">
              <h3 id="data-h">Data</h3>
              <p>
                <Prose text={page.app.data} />
              </p>
            </section>
          )}
          {related.length > 0 && (
            <section aria-labelledby="built-from" className="doc-app-about-block">
              <h3 id="built-from">Built from {related.length} documented components</h3>
              <ul className="doc-related">
                {related.map((other) => (
                  <li key={other.slug}>
                    <Link to={pagePath(other)}>
                      <span className="doc-related-eyebrow">{groupTitleOf(other.group)}</span>
                      <strong>{other.title}</strong>
                      <span className="doc-related-lead">{other.lead}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <List id="adapt" title="Adapting it" items={page.use} />
          <List id="yours" title="What stays yours" items={page.avoid} />
          <List id="keyboard" title="Keyboard" items={page.keyboard} />
          <List id="a11y" title="Accessibility" items={page.accessibility} />
          <List id="responsive" title="Responsive behaviour" items={page.responsive} />
          {page.notes && <List id="notes" title={page.notes.title} items={page.notes.points} />}
          <p className="doc-app-foot">
            <Link to="/">Back to the Punji UI documentation</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
