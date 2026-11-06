// Token guard: component CSS reads colours only from tokens, and every
// var(--pu-*) it reads is defined in tokens.css. Fails with a list.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/styles/', import.meta.url));
const tokens = readFileSync(`${dir}tokens.css`, 'utf8');
const defined = new Set([...tokens.matchAll(/(--pu-[\w-]+)\s*:/g)].map((m) => m[1]));
const problems = [];
// contrast.css holds the high-contrast themes: raw colours are its job, but it
// may only give new values to tokens that tokens.css defines.
const TOKEN_FILES = new Set(['tokens.css', 'contrast.css']);
for (const m of readFileSync(`${dir}contrast.css`, 'utf8').matchAll(/(--pu-[\w-]+)\s*:/g)) if (!defined.has(m[1])) problems.push(`contrast.css: ${m[1]} is not defined in tokens.css`);

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.css') || file === 'tokens.css') continue;
  const css = readFileSync(`${dir}${file}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  if (!TOKEN_FILES.has(file)) for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/g)) problems.push(`${file}: raw colour "${m[0]}" (use a --pu-color-* token)`);
  for (const m of css.matchAll(/var\((--pu-[\w-]+)/g)) if (!defined.has(m[1])) problems.push(`${file}: ${m[1]} is not defined in tokens.css`);
}

// Scales must be monotonic: --pu-radius-<px> and --pu-space-<n> (4px steps) in document order of value.
const light = tokens.slice(0, tokens.indexOf("[data-theme='dark']"));
const px = (v) => (v.endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v));
for (const [name, re] of [['radius', /--pu-radius-(\d+)\s*:\s*([\d.]+(?:px|rem))/g], ['space', /--pu-space-(\d+(?:-5)?)\s*:\s*([\d.]+(?:px|rem))/g]]) {
  const steps = [...light.matchAll(re)].map((m) => [m[1], px(m[2])]);
  for (const [step, value] of steps) if (name === 'radius' && value !== Number(step)) problems.push(`tokens.css: --pu-radius-${step} is ${value}px, expected ${step}px`);
  for (let i = 1; i < steps.length; i++) if (steps[i][1] <= steps[i - 1][1]) problems.push(`tokens.css: --pu-${name}-${steps[i][0]} (${steps[i][1]}px) is not larger than --pu-${name}-${steps[i - 1][0]}`);
  if (steps.length < 5) problems.push(`tokens.css: found only ${steps.length} --pu-${name} scale steps`);
}
const full = /--pu-radius-full\s*:\s*([\d.]+)px/.exec(light);
if (!full || Number(full[1]) < 999) problems.push('tokens.css: --pu-radius-full must be a very large px value');

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`css: ${defined.size} tokens, component CSS uses tokens only`);
