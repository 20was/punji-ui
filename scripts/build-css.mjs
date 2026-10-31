// Builds the shipped CSS with Lightning CSS: resolves @import, minifies, and
// lowers syntax for the supported browsers. No source maps ship (they would
// carry local paths and add weight for no consumer value).
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Features, bundle } from 'lightningcss';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = `${root}src/styles/`;
const out = `${root}dist/`;

// Browser support (README "Browser support"): the versions that shipped
// cascade layers and color-mix(). Encoded as major << 16.
const targets = { chrome: 111 << 16, edge: 111 << 16, firefox: 113 << 16, safari: (16 << 16) | (4 << 8), ios_saf: (16 << 16) | (4 << 8) };

function build(file, dest) {
  const { code, warnings } = bundle({ filename: `${src}${file}`, minify: true, sourceMap: false, targets, exclude: Features.LightDark });
  for (const w of warnings) console.warn(`${file}: ${w.message}`);
  writeFileSync(dest, code);
  // An empty declaration lets TypeScript resolve `import '@punji/ui/styles.css'`
  // without the app declaring '*.css' (TS 6+ checks side-effect imports).
  writeFileSync(`${dest}.d.ts`, 'export {};\n');
}

mkdirSync(`${out}css`, { recursive: true });
build('styles.css', `${out}styles.css`);
build('tokens.css', `${out}tokens.css`);
for (const file of readdirSync(src)) {
  if (!file.endsWith('.css') || file === 'styles.css' || file === 'tokens.css') continue;
  build(file, `${out}css/${file}`);
}
console.log('css: built dist/styles.css, dist/tokens.css, dist/css/*.css with empty declarations');
