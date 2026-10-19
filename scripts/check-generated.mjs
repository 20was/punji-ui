// Generated-files guard (CI, pull requests only): the code under src/ (except
// src/internal/), the stylesheets, docs/tokens.md, .size-limit.json and the
// package's exports map come from Punji's web app through the sync. A pull
// request that changes them must come from the sync branch, or carry the
// maintainers' `manual-change` label (the CI job is skipped then).
//
//   node scripts/check-generated.mjs <base ref>
import { execFileSync } from 'node:child_process';

const base = process.argv[2];
if (!base) {
  console.error('usage: node scripts/check-generated.mjs <base ref>');
  process.exit(2);
}
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const changed = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
const generated = (p) => (p.startsWith('src/') && !p.startsWith('src/internal/')) || p === 'docs/tokens.md' || p === '.size-limit.json';
const hits = changed.filter(generated);

const exportsAt = (ref) => {
  try {
    return JSON.stringify(JSON.parse(git('show', `${ref}:package.json`)).exports);
  } catch {
    return null;
  }
};
if (changed.includes('package.json') && exportsAt(base) !== exportsAt('HEAD')) hits.push('package.json (exports)');

if (hits.length) {
  console.error(`These files are generated from Punji's web app by the sync, and this pull request changes them by hand:\n  ${hits.join('\n  ')}\n\nMake the change in Punji; the Sync workflow mirrors it here (CONTRIBUTING.md, "Where the code lives").\nMaintainers changing the sync itself can add the "manual-change" label.`);
  process.exit(1);
}
console.log(`generated: ${changed.length} changed file(s), none of them generated`);
