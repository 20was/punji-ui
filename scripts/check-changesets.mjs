// Every pending changeset must parse, or the release workflow fails when it opens the version PR.
// A changeset is front matter (`---`, one `"@punji/ui": patch|minor|major` line, `---`) and a summary.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../.changeset/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
const bad = [];
for (const file of files) {
  const text = readFileSync(dir + file, 'utf8');
  const match = /^---\n((?:.*\n)*?)---\n([\s\S]*)$/.exec(text);
  if (!match) { bad.push(`${file}: missing the opening or closing --- line`); continue; }
  const lines = match[1].split('\n').filter(Boolean);
  if (lines.length === 0) bad.push(`${file}: no package bump in the front matter`);
  for (const line of lines) if (!/^(["'])@punji\/ui\1: (patch|minor|major)$/.test(line)) bad.push(`${file}: unexpected front matter line "${line}"`);
  if (!match[2].trim()) bad.push(`${file}: empty summary`);
}
if (bad.length) {
  console.error(bad.join('\n'));
  process.exit(1);
}
console.log(`changesets: ${files.length} pending, all parse`);
