// Contrast gate for the shipped themes (in `npm run lint`). Reads the token
// blocks of src/styles/tokens.css and src/styles/contrast.css, composites
// translucent colours over the surface they sit on, and checks every pair
// below against WCAG 2.2:
//   light, dark          text 4.5:1 (1.4.3 AA), UI and large text 3:1 (1.4.11)
//   light-hc, dark-hc    text 7:1   (1.4.6 AAA), UI 4.5:1 (stricter than 1.4.11)
// Also fails when the prefers-color-scheme dark block drifts from
// [data-theme='dark'], or a high-contrast theme leaves a colour token unset.
// `--json` prints every ratio (used to write docs/THEMING.md).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/styles/', import.meta.url));
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = strip(readFileSync(`${dir}tokens.css`, 'utf8'));
const contrast = strip(readFileSync(`${dir}contrast.css`, 'utf8'));

/** The declarations of the first rule whose selector list contains `needle`. */
function block(css, needle) {
  const at = css.indexOf(needle);
  if (at < 0) throw new Error(`check-contrast: no rule for ${needle}`);
  const open = css.indexOf('{', at);
  const close = css.indexOf('}', open);
  return new Map([...css.slice(open + 1, close).matchAll(/(--pu-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const light = block(tokens, ":root,\n  [data-theme='light'] {");
const darkOnly = block(tokens, "\n  [data-theme='dark'] {");
const darkMedia = block(tokens, ":root:not([data-theme='light']) {");
const dark = new Map([...light, ...darkOnly]);
const themes = {
  light: { vars: light, text: 4.5, ui: 3 },
  dark: { vars: dark, text: 4.5, ui: 3 },
  'light-hc': { vars: new Map([...light, ...block(contrast, "[data-theme='light-hc'] {")]), text: 7, ui: 4.5, own: block(contrast, "[data-theme='light-hc'] {") },
  'dark-hc': { vars: new Map([...light, ...block(contrast, "[data-theme='dark-hc'] {")]), text: 7, ui: 4.5, own: block(contrast, "[data-theme='dark-hc'] {") },
};

function parse(value) {
  let m = /^#([0-9a-f]{6})$/i.exec(value);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = /^#([0-9a-f]{3})$/i.exec(value);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16)).concat(1);
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(value);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  return null;
}
const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
const lum = (c) => {
  const [r, g, b] = c.slice(0, 3).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].toSorted((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, kind]. A translucent background is laid over --pu-color-bg first.
const SURFACES = ['bg', 'surface', 'surface-tint'];
const PAIRS = [
  ...['text', 'text-muted', 'text-tertiary', 'link', 'accent', 'gain', 'loss', 'warn'].flatMap((fg) => SURFACES.map((bg) => [fg, bg, 'text'])),
  ['on-accent-fill', 'accent-fill', 'text'],
  ['on-accent-fill', 'accent-fill-hover', 'text'],
  ['on-loss', 'loss', 'text'],
  ['tag-text', 'tag-bg', 'text'],
  ['text-inverse', 'surface-inverse', 'text'],
  ['inverse-gain', 'surface-inverse', 'text'],
  ['inverse-loss', 'surface-inverse', 'text'],
  ['inverse-warn', 'surface-inverse', 'text'],
  ['text', 'gain-soft', 'text'],
  ['text', 'loss-soft', 'text'],
  ['gain', 'gain-soft', 'text'],
  ['loss', 'loss-soft', 'text'],
  ['border-control', 'surface', 'ui'],
  ['border-control', 'surface-tint', 'ui'],
  ['chart', 'surface', 'ui'],
  ['series-nepse', 'surface', 'ui'],
  ['accent', 'surface', 'ui'],
];

const problems = [];
const report = {};
const colour = (vars, name, base) => {
  const raw = vars.get(`--pu-color-${name}`);
  const c = raw && parse(raw);
  if (!c) throw new Error(`check-contrast: --pu-color-${name} is not a plain colour (${raw})`);
  return c[3] < 1 ? over(c, base) : c;
};
for (const [theme, { vars, text, ui, own }] of Object.entries(themes)) {
  report[theme] = [];
  const page = colour(vars, 'bg', [255, 255, 255, 1]);
  for (const [fg, bg, kind] of PAIRS) {
    const back = colour(vars, bg, colour(vars, 'surface', page));
    const r = ratio(colour(vars, fg, back), back);
    const min = kind === 'text' ? text : ui;
    report[theme].push({ fg, bg, kind, ratio: Math.round(r * 100) / 100, min });
    if (r < min) problems.push(`${theme}: --pu-color-${fg} on --pu-color-${bg} is ${r.toFixed(2)}:1, needs ${min}:1 (${kind})`);
  }
  if (own) for (const name of light.keys()) if (name.startsWith('--pu-color-') && !own.has(name)) problems.push(`${theme}: ${name} is not set (a high-contrast theme sets every colour)`);
}
// The prefers-contrast blocks copy their theme's values; the dark one covers every token the light one sets.
const autoLight = block(contrast.slice(contrast.indexOf('@media (prefers-contrast: more) {\n  @layer')), ':root:not([data-theme]) {');
const autoDark = block(contrast.slice(contrast.indexOf('(prefers-contrast: more) and (prefers-color-scheme: dark)')), ':root:not([data-theme]) {');
for (const [auto, theme, label] of [[autoLight, 'light-hc', 'prefers-contrast light'], [autoDark, 'dark-hc', 'prefers-contrast dark']]) {
  for (const [name, value] of auto) if (themes[theme].own.get(name) !== value) problems.push(`contrast.css: ${name} in the ${label} block differs from [data-theme='${theme}']`);
}
for (const name of autoLight.keys()) if (!autoDark.has(name)) problems.push(`contrast.css: ${name} is set by the prefers-contrast light block but not the dark one`);
for (const [name, value] of darkOnly) if (darkMedia.get(name) !== value) problems.push(`tokens.css: ${name} differs between [data-theme='dark'] and the prefers-color-scheme block`);
for (const name of darkMedia.keys()) if (!darkOnly.has(name)) problems.push(`tokens.css: ${name} is only in the prefers-color-scheme block`);

if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 1));
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
const worst = Object.fromEntries(Object.entries(report).map(([t, rows]) => [t, Math.min(...rows.filter((r) => r.kind === 'text').map((r) => r.ratio)).toFixed(2)]));
if (!process.argv.includes('--json')) console.log(`contrast: ${PAIRS.length} pairs x ${Object.keys(themes).length} themes pass; lowest text ratio ${Object.entries(worst).map(([t, v]) => `${t} ${v}`).join(', ')}`);
