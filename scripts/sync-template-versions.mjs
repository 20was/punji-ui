// Run by `npm run version-packages` after `changeset version`: points every starter template's @punji/ui
// dependency at the new version (`^x.y.z`), so the version PR passes check:templates and the templates
// install the release they document once it is on npm.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const name of readdirSync(join(root, 'templates'))) {
  const file = join(root, 'templates', name, 'package.json');
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  const next = text.replace(/("@punji\/ui":\s*")[^"]*(")/, `$1^${version}$2`);
  if (next !== text) { writeFileSync(file, next); console.log(`template ${name}: @punji/ui ^${version}`); }
}
