// Read-only inventory. No consumer code is copied or modified.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
const web = resolve(process.argv[2] ?? '../punji-web');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
const files = walk(`${web}/src`).filter(f => /\.(tsx?|css)$/.test(f));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const rootSource = readFileSync('src/index.ts', 'utf8');
const exported = new Set([...rootSource.matchAll(/export \{([^}]+)\}/g)].flatMap(m => m[1].split(',').map(n => n.trim().replace(/^type /, ''))));
for (const match of rootSource.matchAll(/export \* from '([^']+)'/g)) {
  const code = readFileSync(resolve('src', match[1]), 'utf8');
  for (const name of code.matchAll(/export (?:function|const|class|interface|type) (\w+)/g)) exported.add(name[1]);
}
const entries = files.filter(f => f.includes('/components/') && f.endsWith('.tsx') && !f.includes('__tests__')).map(f => {
  const code = readFileSync(f, 'utf8');
  const names = [...code.matchAll(/export (?:function|const|class) (\w+)/g)].map(m => m[1]);
  const imports = [...code.matchAll(/from ['"]([^'"]+)['"]/g)].map(m => m[1]);
  return { file: relative(web, f), exports: names, availableAtRoot: names.filter(n => exported.has(n)), missingAtRoot: names.filter(n => !exported.has(n)), imports };
});
const pages = files.filter(f => /\/(pages|design)\//.test(f) && f.endsWith('.tsx')).map(f => ({file: relative(web, f), imports: [...readFileSync(f,'utf8').matchAll(/from ['"]([^'"]+)['"]/g)].map(m=>m[1])}));
mkdirSync('docs/audit', { recursive: true });
const sha = execFileSync('git', ['-C', web, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
writeFileSync('docs/audit/inventory.json', JSON.stringify({ consumerCommit: sha, method: 'Static named-export/import inventory; does not certify visual or behavior parity.', packageEntrypoints: Object.keys(pkg.exports), components: entries, pages }, null, 2)+'\n');
writeFileSync('docs/audit/component-matrix.md', '# Consumer component inventory\n\nStatic comparison against '+sha+'. Missing means missing at the public root; matching names require behavioral review.\n\n| Consumer source | Available at root | Missing at root |\n|---|---|---|\n'+entries.map(e=>`| ${e.file} | ${e.availableAtRoot.join(', ') || '—'} | ${e.missingAtRoot.join(', ') || '—'} |`).join('\n')+'\n');
console.log(`${entries.length} component files, ${pages.length} page/example files inventoried`);
