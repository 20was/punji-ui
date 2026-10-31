import { Link } from './router.tsx';

const POPULAR = [
  ['/components/money-display/', 'MoneyDisplay', 'Exact amounts in any currency'],
  ['/components/stock-table/', 'StockTable', 'A sortable quote board'],
  ['/components/data-table/', 'DataTable', 'Typed tables for financial rows'],
  ['/get-started/using/', 'Introduction', 'Install it and show your first amount'],
  ['/get-started/theming/', 'Theming', 'Light, dark and your own accent'],
] as const;

export function NotFound() {
  return (
    <div className="doc-page doc-404" data-testid="page-not-found">
      <article className="doc-article">
        <header className="doc-head">
          <p className="doc-eyebrow">Error 404</p>
          <h1 tabIndex={-1} id="page-title">
            Page not found
          </h1>
          <p className="doc-lead">There is no page at this address. It may have moved, or the link may be mistyped. Search with ⌘K, or start from one of these.</p>
        </header>
        <section aria-labelledby="nf-go" className="doc-section">
          <h2 id="nf-go" className="doc-subtle-h">
            Where to go
          </h2>
          <ul className="doc-related">
            <li>
              <Link to="/">
                <span className="doc-related-eyebrow">Home</span>
                <strong>Documentation overview</strong>
                <span className="doc-related-lead">Every domain, with live previews</span>
              </Link>
            </li>
            {POPULAR.map(([to, title, lead]) => (
              <li key={to}>
                <Link to={to}>
                  <span className="doc-related-eyebrow">Popular</span>
                  <strong>{title}</strong>
                  <span className="doc-related-lead">{lead}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
