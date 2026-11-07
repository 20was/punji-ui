// API conventions guard (docs/API-CONVENTIONS.md): one prop vocabulary across components.
// Reads every exported `*Props` interface and every inline props type of an exported component in src/
// and checks the vocabulary: `size` on the sm/md/lg scale, `tone` from the shared tone names, user-visible
// words in `labels` (never `copy`, `messages`, `strings`), `variant` (never `appearance` or `intent`) for
// visual style, `on*` handler names, `x` + `defaultX` + `onXChange` controlled pairs, and `@deprecated`
// notes that name the replacement. CSS classes: new ones use `pu-`; the legacy `kit-` set is frozen.
// An old value or prop name may stay as a deprecated alias when its JSDoc says "Deprecated" and names it.
// Genuine exceptions are allow-listed below, each with a reason.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const sources = walk(join(root, 'src')).filter((f) => /\.tsx?$/.test(f) && !f.includes(`${join('src', 'locale')}`));

export const SIZES = ['sm', 'md', 'lg'];
// Semantic and surface tones. Direction: gain, loss, flat. Status: neutral, accent, info, warn, danger, highlight.
// Surface: inverse, tint, plain. Data palette: chart, series2..series12, rest, strong, scale*, nepse.
export const TONES = new Set([
  'neutral', 'accent', 'info', 'warn', 'danger', 'highlight',
  'gain', 'loss', 'flat',
  'inverse', 'tint', 'plain',
  'chart', 'rest', 'strong', 'nepse', ...Array.from({ length: 11 }, (_, i) => `series${i + 2}`),
]);
// Prop names that say the same thing as a conventional one.
export const RENAMED = { appearance: 'variant', intent: 'variant', color: 'tone', copy: 'labels', messages: 'labels', strings: 'labels', translations: 'labels', i18n: 'labels' };

// Allow-list: `Component.prop` (or `Component.prop=value`) -> reason. Keep each reason specific.
const ALLOW = {
  'HeadlineFigureProps.size=xl': 'A display figure, larger than any control; the scale stops at lg for controls and figures alike, xl is the lead-figure step above it.',
  'SplitPaneProps.size': 'A measurement (the first pane in px), paired with defaultSize/onSizeChange, not the sm/md/lg scale.',
  'QrCodeProps.size': 'A measurement (the rendered side in px or a CSS length), not the sm/md/lg scale.',
  'StateGlyph.size': 'A measurement (the icon side in px), not the sm/md/lg scale.',
  'NavIconProps.size': 'punji-web compatibility wrapper: a measurement (px side) so web call sites move over unchanged. Icon and the per-glyph components take sm/md/lg.',
  'SettingIconProps.size': 'punji-web compatibility wrapper: a measurement (px side) so web call sites move over unchanged. Icon and the per-glyph components take sm/md/lg.',
  'ToneIcon.tone=error': 'Names the icon shape (a cross), shared with Toast kinds; it is not a colour prop.',
  'ToneIcon.tone=success': 'Names the icon shape (a tick), shared with Toast kinds; it is not a colour prop.',
  'ScamWarningProps.copy': 'Scenario content (title, summary, warning signs) replacing the built-in research text, not interface words; the words are in `labels`.',
};

// Literal-union type aliases across src, to resolve `size?: ControlSize` and `tone?: CheckTone`.
const aliases = new Map();
for (const f of sources) for (const m of readFileSync(f, 'utf8').matchAll(/^export type (\w+) =\s*([^;]+);/gm)) aliases.set(m[1], m[2]);
const literals = (type) => {
  const resolved = type.replace(/\b[A-Z]\w*\b/g, (name) => (aliases.has(name) && /'/.test(aliases.get(name)) ? `(${aliases.get(name)})` : name));
  return [...resolved.matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

// Splits a type-literal body into its top-level members: { doc, name, optional, type }.
function members(body) {
  const out = [];
  let depth = 0, cur = '', doc = '';
  body += '\n';
  for (let i = 0; i < body.length; i++) {
    if (depth === 0 && body.startsWith('/**', i)) { const end = body.indexOf('*/', i); doc += body.slice(i, end + 2); i = end + 1; continue; }
    if (depth === 0 && body.startsWith('//', i)) { i = body.indexOf('\n', i); if (i < 0) break; continue; }
    const c = body[i];
    if ('{([<'.includes(c) && !(c === '<' && body[i - 1] === ' ' && body[i + 1] === '=')) depth++;
    else if ('})]'.includes(c) || (c === '>' && body[i - 1] !== '=')) depth = Math.max(0, depth - 1);
    if (depth === 0 && (c === ';' || c === '\n' || c === ',')) {
      const m = /^\s*(?:readonly\s+)?(\w+)(\?)?\s*:\s*([\s\S]+?)\s*$/.exec(cur);
      if (m) { out.push({ doc, name: m[1], optional: !!m[2], type: m[3] }); doc = ''; }
      else if (cur.trim()) doc = '';
      cur = '';
      continue;
    }
    cur += c;
  }
  return out;
}
// The body of the brace block that opens at or after `from`.
function block(text, from) {
  const start = text.indexOf('{', from);
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(start + 1, i);
  }
  return '';
}

const problems = [];
const used = new Set();
const allowed = (key) => (key in ALLOW ? (used.add(key), true) : false);
const deprecates = (doc, value) => /deprecated/i.test(doc) && (value === undefined || doc.includes(`'${value}'`) || doc.includes(`\`${value}\``));
let checked = 0;

for (const f of sources) {
  const rel = f.slice(root.length);
  const text = readFileSync(f, 'utf8');
  const types = [];
  for (const m of text.matchAll(/^(?:export )?(?:interface (\w+)\b[^{=]*|type (\w+)(?:<[^=]*>)? = (?=\{))/gm)) types.push([m[1] ?? m[2], block(text, m.index + m[0].length), (m[1] ?? m[2]).endsWith('Props')]);
  for (const m of text.matchAll(/^export function ([A-Z]\w*)\b[^(]*\(\{[^}]*\}\s*:\s*(?=\{)/gm)) types.push([m[1], block(text, m.index + m[0].length), true]);
  for (const [owner, body, isProps] of types) {
    // A labels type's keys are words, not props.
    if (/(Labels|Messages|Words|Copy)$/.test(owner)) continue;
    checked++;
    const props = members(body);
    const names = new Set(props.map((p) => p.name));
    for (const p of props) {
      const where = `${rel}: ${owner}.${p.name}`;
      const fn = /=>/.test(p.type) && p.type.startsWith('(');
      if (p.name === 'size' && isProps && !allowed(`${owner}.size`)) {
        const values = literals(p.type);
        if (!values.length) problems.push(`${where}: size must be on the ${SIZES.join('/')} scale (got ${p.type}); a measurement needs its own name or an allow-list reason`);
        for (const v of values) if (!SIZES.includes(v) && !deprecates(p.doc, v) && !allowed(`${owner}.size=${v}`)) problems.push(`${where}: size '${v}' is off the ${SIZES.join('/')} scale`);
      }
      if (p.name === 'tone' && !/@deprecated/.test(p.doc)) for (const v of literals(p.type)) {
        if (!TONES.has(v) && !v.startsWith('scale') && !deprecates(p.doc, v) && !allowed(`${owner}.tone=${v}`)) problems.push(`${where}: tone '${v}' is not a shared tone name (${[...TONES].slice(0, 12).join(', ')}, ...)`);
      }
      if (p.name in RENAMED && !fn && !/^boolean\b/.test(p.type) && !deprecates(p.doc) && !allowed(`${owner}.${p.name}`)) problems.push(`${where}: use \`${RENAMED[p.name]}\` (the conventional name)`);
      // A words object (a `...Words`, `...Messages` or `...Copy` type) is `labels`, or `<scope>Labels` for a part's words.
      if (!fn && /\b\w+(Words|Messages|Copy)\b/.test(p.type) && !/^(labels|\w+Labels)$/.test(p.name) && !(p.name in RENAMED) && !deprecates(p.doc) && !allowed(`${owner}.${p.name}`)) problems.push(`${where}: words for the interface go in \`labels\``);
      if (fn && (/^handle[A-Z]/.test(p.name) || /(Handler|Callback)$/.test(p.name))) problems.push(`${where}: a handler prop is named on<Event> or on<Thing>Change`);
      if (/@deprecated/.test(p.doc) && !/`[^`]+`/.test(p.doc.slice(p.doc.indexOf('@deprecated')))) problems.push(`${where}: @deprecated must name the replacement in backticks`);
      const d = /^default([A-Z]\w*)$/.exec(p.name);
      if (d) {
        const state = d[1][0].toLowerCase() + d[1].slice(1);
        // onChange serves when the state is the component's (or hook's) only one.
        const change = [`on${d[1]}Change`, 'onChange', ...(state === 'value' ? ['onValueChange'] : [])];
        if (names.has(state) && !change.some((c) => names.has(c)) && !allowed(`${owner}.${p.name}`)) problems.push(`${where}: controlled \`${state}\` with \`${p.name}\` needs \`${change.join('` or `')}\``);
      }
    }
  }
}
for (const key of Object.keys(ALLOW)) if (!used.has(key)) problems.push(`check-api-conventions: allow-list entry "${key}" no longer matches anything; remove it`);

// Class prefix: `pu-` for every new class. The `kit-` classes that shipped before the convention are frozen
// in api-conventions-kit-classes.json (renaming them would break consumer CSS); none may be added.
const legacy = new Set(JSON.parse(readFileSync(join(root, 'scripts/api-conventions-kit-classes.json'), 'utf8')).classes);
const kit = new Set();
for (const f of [...sources, ...walk(join(root, 'src/styles')).filter((x) => x.endsWith('.css'))]) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/(?<![\w-])kit-[a-z0-9]+(?:-[a-z0-9]+)*/g)) kit.add(m[0]);
}
for (const c of kit) if (!legacy.has(c)) problems.push(`class "${c}": new classes use the pu- prefix (kit- is the frozen legacy set)`);
for (const c of legacy) if (!kit.has(c)) problems.push(`scripts/api-conventions-kit-classes.json: "${c}" is no longer used; remove it`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`api conventions: ${checked} props types follow the vocabulary; ${Object.keys(ALLOW).length} allow-listed exceptions; ${legacy.size} legacy kit- classes frozen`);
