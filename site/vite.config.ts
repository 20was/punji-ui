import { defineConfig, loadEnv, type Plugin } from 'vite';
import { normaliseBase } from './src/paths.ts';
import pkg from '../package.json' with { type: 'json' };

// BASE_PATH: where the site is served ('/' at a domain root, '/punji-ui/' for GitHub Pages).
// SITE_URL: the public origin used in canonical URLs, sitemap and social tags. See site/README.md.
// `@punji/ui` resolves through the package's own export map to the built
// `dist/`: the files a consumer installs. No alias, no source import.
// The browser reads the registry through the split files scripts/site-pages.mjs writes (src/generated/nav.json,
// pages/<slug>.json, search.json). In dev, rewrite them when a registry file changes so an edit still shows at once.
function pageData(): Plugin {
  return {
    name: 'punji-site-pages',
    apply: 'serve',
    configureServer(server) {
      const regen = async (file: string) => {
        if (!/site\/src\/registry[\w-]*\.ts$/.test(file)) return;
        try {
          // Only the registry and site-pages are in the SSR graph; drop them so this load cannot see the old file.
          server.environments.ssr.moduleGraph.invalidateAll();
          const registry = await server.ssrLoadModule('/src/registry.ts');
          const { writePageData } = await server.ssrLoadModule(`${server.config.root}/../scripts/site-pages.mjs`);
          writePageData(registry);
        } catch (error) {
          server.config.logger.error(`site-pages: ${(error as Error).message}`);
        }
      };
      server.watcher.on('change', (file) => void regen(file));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const base = normaliseBase(env['BASE_PATH']);
  const siteUrl = (env['SITE_URL'] ?? 'https://design.punji.app').replace(/\/+$/, '');
  // The header's version badge reads the package version at build time (not the whole package.json in the bundle).
  return {
    base,
    define: { SITE_ORIGIN: JSON.stringify(siteUrl), PKG_VERSION: JSON.stringify(pkg.version) },
    plugins: [pageData()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2022',
      // The prerender reads the manifest to preload each route's chunks (<link rel="modulepreload">).
      manifest: true,
      // Vite would list every dynamic chunk's dependencies in the entry (tens of kB for hundreds of examples). The
      // prerendered HTML already preloads the current route's whole chunk graph, so dynamic imports keep none here;
      // a later navigation fetches a page's imports as the browser discovers them. HTML entries keep theirs.
      modulePreload: { resolveDependencies: (_file, deps, { hostType }) => (hostType === 'html' ? deps : []) },
      // One stylesheet for every page and the phone preview frame: a route's CSS is never a separate request that
      // could arrive after its prerendered HTML paints. (JavaScript is split per route; see src/app/load.ts.)
      cssCodeSplit: false,
      rollupOptions: {
        // The docs app, and the phone-width preview frame (one example in its own viewport, src/app/PhoneFrame.tsx).
        input: { main: 'index.html', frame: 'preview-frame/index.html' },
        // The package's 'use client' directives are for RSC bundlers; they are meaningless in this client-only bundle.
        onwarn: (warning, warn) => { if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning); },
      },
    },
    preview: { host: '127.0.0.1', port: 4174, strictPort: true },
    server: { host: '127.0.0.1', port: 5185, strictPort: true },
  };
});
