// Which --pu-* custom properties a component reads, found by scanning its CSS (docs "Tokens" list).
//   1. The component's sources are the file that exports each documented name plus its folder (src/<folder>/*.tsx).
//   2. Their `pu-*` class names are collected.
//   3. Every CSS rule in src/styles/*.css (not tokens.css) whose selector names one of those classes is read, and the
//      var(--pu-*) it uses are listed, sorted.
// Pages with a hand-written `tokens` in the registry keep it. Utilities without a class list nothing.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

/** Split CSS into [selector, body] pairs for every innermost block (media queries are flattened). */
function rules(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') {
      const open = i;
      let j = i + 1;
      let nested = false;
      for (; j < text.length && text[j] !== '}'; j++) if (text[j] === '{') { nested = true; break; }
      if (!nested) {
        out.push([text.slice(start, open).trim(), text.slice(open + 1, j)]);
        i = j;
        start = j + 1;
      } else start = open + 1;
    } else if (c === '}') start = i + 1;
  }
  return out;
}

export function makeTokenScanner(root) {
  const srcFiles = walk(join(root, 'src')).filter((f) => /\.tsx?$/.test(f));
  const sources = new Map(srcFiles.map((f) => [f, readFileSync(f, 'utf8')]));
  const styleDir = join(root, 'src/styles');
  const blocks = readdirSync(styleDir)
    .filter((f) => f.endsWith('.css') && f !== 'tokens.css' && f !== 'contrast.css')
    .flatMap((f) => rules(readFileSync(join(styleDir, f), 'utf8')));

  return function tokensFor(page) {
    if (page.tokens) return [...page.tokens];
    if (!['component', 'foundation'].includes(page.kind)) return [];
    const dirs = new Set();
    for (const a of page.api) {
      const re = new RegExp(`^export (?:declare )?(?:async )?(?:function|const|class) ${a.name}\\b`, 'm');
      for (const [f, t] of sources) if (re.test(t)) dirs.add(f.slice(0, f.lastIndexOf('/')));
    }
    const classes = new Set();
    for (const [f, t] of sources) {
      if (!dirs.has(f.slice(0, f.lastIndexOf('/')))) continue;
      for (const m of t.matchAll(/\bpu-[a-z0-9][a-z0-9-]*/g)) classes.add(m[0]);
    }
    const found = new Set();
    for (const [selector, body] of blocks) {
      const names = [...selector.matchAll(/\.(pu-[a-z0-9-]+)/g)].map((m) => m[1]);
      if (!names.some((n) => classes.has(n))) continue;
      for (const m of body.matchAll(/var\(\s*(--pu-[a-z0-9-]+)/g)) found.add(m[1]);
    }
    return [...found].toSorted();
  };
}
