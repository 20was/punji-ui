// Checks site/dist/_headers (written by scripts/site-headers.mjs at the end of `site:build`): the security headers
// are present, the CSP has the directives that matter, and every inline script in the built pages is allowed by hash.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../site/dist/', import.meta.url));
const file = join(dist, '_headers');
const problems = [];
if (!existsSync(file)) {
  console.error('headers: site/dist/_headers is missing (run `npm run site:build` first)');
  process.exit(1);
}
const text = readFileSync(file, 'utf8');
const header = (name) => text.match(new RegExp(`^\\s+${name}:\\s*(.+)$`, 'im'))?.[1]?.trim();

if (!/^\/\*\s*$/m.test(text)) problems.push('no "/*" rule: security headers must apply to every path');
const csp = header('Content-Security-Policy');
if (!csp) problems.push('Content-Security-Policy is missing');
else {
  for (const directive of ["default-src 'self'", "frame-ancestors 'self'", "object-src 'none'", "base-uri 'self'"]) {
    if (!csp.split(/;\s*/).includes(directive)) problems.push(`CSP lacks "${directive}"`);
  }
  if (/script-src[^;]*'unsafe-(?:inline|eval)'/.test(csp)) problems.push("CSP script-src allows 'unsafe-inline' or 'unsafe-eval'");
  const allowed = new Set(csp.match(/'sha256-[^']+'/g) ?? []);
  for (const page of readdirSync(dist, { recursive: true }).filter((f) => String(f).endsWith('.html'))) {
    const html = readFileSync(join(dist, String(page)), 'utf8');
    for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)) {
      if (/\bsrc\s*=/i.test(attrs) || /\btype\s*=\s*["']?application\/(?:ld\+)?json/i.test(attrs)) continue;
      if (!allowed.has(`'sha256-${createHash('sha256').update(body).digest('base64')}'`)) problems.push(`${page}: an inline script is not allowed by the CSP hashes`);
    }
  }
}
if (header('X-Content-Type-Options')?.toLowerCase() !== 'nosniff') problems.push('X-Content-Type-Options: nosniff is missing');
if (!header('Referrer-Policy')) problems.push('Referrer-Policy is missing');
if (!header('Strict-Transport-Security')) problems.push('Strict-Transport-Security is missing');
if (!header('X-Frame-Options')) problems.push('X-Frame-Options is missing');

if (problems.length) {
  console.error(`headers: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('headers: CSP, nosniff, referrer policy, HSTS and frame protection present; every inline script is hashed');
