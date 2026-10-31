import { defineConfig } from 'vite';

// Fixture app for the visual gate. `@punji/ui` resolves through the package's
// own export map to the built `dist/`, the same files a consumer installs.
export default defineConfig({
  build: { outDir: 'dist', emptyOutDir: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
