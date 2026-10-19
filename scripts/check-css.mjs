// Token guard: component CSS reads colours only from tokens, and every
// var(--pu-*) it reads is defined in tokens.css. Fails with a list.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/styles/', import.meta.url));
const tokens = readFileSync(`${dir}tokens.css`, 'utf8');
const defined = new Set([...tokens.matchAll(/(--pu-[\w-]+)\s*:/g)].map((m) => m[1]));
const problems = [];

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.css') || file === 'tokens.css') continue;
  const css = readFileSync(`${dir}${file}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/g)) problems.push(`${file}: raw colour "${m[0]}" (use a --pu-color-* token)`);
  for (const m of css.matchAll(/var\((--pu-[\w-]+)/g)) if (!defined.has(m[1])) problems.push(`${file}: ${m[1]} is not defined in tokens.css`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`css: ${defined.size} tokens, component CSS uses tokens only`);
