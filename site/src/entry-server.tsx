import { renderToString } from 'react-dom/server';
import { App } from './app/App.tsx';
import { loadRoute } from './app/load.ts';
import { parseClientRoute } from './app/nav.ts';
import { relativePath } from './app/router.tsx';

// Server entry for the prerender (scripts/site-prerender.mjs). `path` is the full pathname, base included.
// preload() loads the route's chunks (the same loadRoute the browser awaits before hydrating) and resolves with the
// modules it used, as paths under site/, which the prerender turns into <link rel="modulepreload"> tags.
export const preload = (path: string): Promise<string[]> => loadRoute(parseClientRoute(relativePath(path)));
export const render = (path: string): string => renderToString(<App path={path} />);
