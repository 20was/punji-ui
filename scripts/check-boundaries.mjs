// Keep pure utility modules independently usable outside React and the browser.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const problems = [];
// Pure directories and the one external dependency each may use per file.
const PURE = { nepal: { 'calendar.ts': '@remotemerge/nepali-date-converter' }, calculations: {}, money: {}, export: {}, ledger: {}, banking: {}, 'chart-math': {}, 'date-range-presets': {}, 'nepse-fees': {}, 'share-issues': {}, 'emvco-qr': {}, lending: {}, kyc: {}, 'nepal-address-data': {}, tax: {} };
// Pure modules may reuse these other pure modules (never components): the exact decimal parser, minor-unit helpers and rounding.
// The ledger helpers also reuse the calendar-date type, currency exponent and the CSV writer (all pure).
const SHARED = {
  money: new Set(['../nepal/decimal.ts', '../nepal/money.ts', '../calculations/rounding.ts']),
  banking: new Set(['../export/csv.ts', '../money/money.ts', '../nepal/money.ts']),
  'date-range-presets': new Set(['../nepal/date-only.ts', '../nepal/calendar.ts']),
  ledger: new Set(['../nepal/date-only.ts', '../nepal/money.ts', '../money/money.ts', '../export/csv.ts']),
  'nepse-fees': new Set(['../calculations/rounding.ts']),
  // Share issues and corporate actions: exact rounding only.
  'share-issues': new Set(['../calculations/rounding.ts']),
  'emvco-qr': new Set(['../nepal/money.ts']),
  // Loan and deposit maths reuse the exact rounding.
  lending: new Set(['../calculations/rounding.ts']),
  // Tax, invoicing and payroll helpers: exact rounding, calendar dates, minor-unit money and the CSV writer.
  tax: new Set(['../calculations/rounding.ts', '../nepal/date-only.ts', '../nepal/money.ts', '../export/csv.ts']),
};
for (const [dir, allowed] of Object.entries(PURE)) {
  for (const name of readdirSync(resolve(root, 'src', dir))) {
    if (!name.endsWith('.ts')) continue;
    const file = resolve(root, 'src', dir, name);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      const local = specifier.startsWith('.');
      const target = local ? relative(resolve(root, 'src', dir), resolve(dirname(file), specifier)) : specifier;
      if (local ? (target.startsWith('..') && !SHARED[dir]?.has(specifier)) || target.endsWith('.tsx') : allowed[name] !== specifier) {
        problems.push(`${dir}/${name}: forbidden dependency ${specifier}`);
      }
    }
    if (/\b(?:window|document|localStorage|sessionStorage|navigator)\b/.test(source)) problems.push(`${dir}/${name}: browser global in a pure module`);
  }
}
if (problems.length) throw new Error(problems.join('\n'));
console.log(`boundaries: ${Object.keys(PURE).join(', ')} utilities have no React, component, or browser dependencies; calendar dependency isolated`);
