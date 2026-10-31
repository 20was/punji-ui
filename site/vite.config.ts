import { defineConfig } from 'vite';

// `@punji/ui` resolves through the package's own export map to the built
// `dist/`: the files a consumer installs. No alias, no source import.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    // The package's 'use client' directives are for RSC bundlers; they are meaningless in this client-only bundle.
    rollupOptions: { onwarn: (warning, warn) => { if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning); } },
  },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
  server: { host: '127.0.0.1', port: 5185, strictPort: true },
});
