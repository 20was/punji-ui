// The tarball gate: only dist JS, types and CSS (plus the files npm always
// adds) may ship. No source maps, no sources, no images or brand assets, no
// dotfiles, and an upper bound on the unpacked size.
import { execFileSync } from 'node:child_process';

// The whole kit (38 modules: JS, types with their docs, styles.css and the
// per-module sheets) is 300 kB unpacked; the budget is that plus headroom.
const MAX_UNPACKED = 320 * 1024;
const [info] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }));
const always = new Set(['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md']);
const allowed = (p) => always.has(p) || /^dist\/.+\.(js|d\.ts|css)$/.test(p);

const bad = info.files.map((f) => f.path).filter((p) => !allowed(p));
for (const f of info.files) console.log(`  ${String(f.size).padStart(7)}  ${f.path}`);
console.log(`pack: ${info.files.length} files, ${info.size} B packed, ${info.unpackedSize} B unpacked`);

if (bad.length) {
  console.error(`pack: files that must not ship:\n  ${bad.join('\n  ')}`);
  process.exit(1);
}
if (info.unpackedSize > MAX_UNPACKED) {
  console.error(`pack: unpacked ${info.unpackedSize} B is over the ${MAX_UNPACKED} B budget`);
  process.exit(1);
}
