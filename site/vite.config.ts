import { defineConfig, loadEnv } from 'vite';
import { normaliseBase } from './src/seo.ts';
import pkg from '../package.json' with { type: 'json' };

// BASE_PATH: where the site is served ('/' at a domain root, '/punji-ui/' for GitHub Pages).
// SITE_URL: the public origin used in canonical URLs, sitemap and social tags. See site/README.md.
// `@punji/ui` resolves through the package's own export map to the built
// `dist/`: the files a consumer installs. No alias, no source import.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const base = normaliseBase(env['BASE_PATH']);
  const siteUrl = (env['SITE_URL'] ?? 'https://design.punji.app').replace(/\/+$/, '');
  // The header's version badge reads the package version at build time (not the whole package.json in the bundle).
  return {
    base,
    define: { SITE_ORIGIN: JSON.stringify(siteUrl), PKG_VERSION: JSON.stringify(pkg.version) },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2022',
      // The package's 'use client' directives are for RSC bundlers; they are meaningless in this client-only bundle.
      rollupOptions: { onwarn: (warning, warn) => { if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning); } },
    },
    preview: { host: '127.0.0.1', port: 4174, strictPort: true },
    server: { host: '127.0.0.1', port: 5185, strictPort: true },
  };
});
