import { renderToString } from 'react-dom/server';
import { App } from './app/App.tsx';

// Server entry for the prerender (scripts/site-prerender.mjs). `path` is the full pathname, base included.
export const render = (path: string): string => renderToString(<App path={path} />);
