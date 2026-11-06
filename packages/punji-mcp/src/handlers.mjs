// Pure handlers: (snapshot, args) -> { content: [{ type: 'text', text }], isError? }. No SDK, no network, no file
// access after the snapshot is loaded, so they are testable directly.
import { reviewCode } from './review.mjs';

export const TOPICS = ['money-rules', 'theming', 'tokens', 'router', 'tables', 'charts', 'security', 'versioning'];

const text = (t, extra = {}) => ({ content: [{ type: 'text', text: t }], ...extra });
const fail = (t) => text(t, { isError: true });
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

/** First sentence of a description: the "one-line lead". */
const lead = (d) => (d ?? '').split(/(?<=[.!?])\s/)[0];

/** Index used by review_usage and name lookup, built once per snapshot. */
export function indexSnapshot(snapshot) {
  const exportModules = {};
  const byKey = new Map();
  for (const item of snapshot.items) {
    for (const key of [item.slug, item.title]) byKey.set(norm(key), item);
    for (const e of item.exports) {
      byKey.set(norm(e.name), byKey.get(norm(e.name)) ?? item);
      if (e.kind !== 'type') exportModules[e.name] ??= e.module;
    }
  }
  return { exportModules, byKey };
}

export function listComponents(snapshot, args = {}) {
  const { category, stability, search } = args;
  const q = search ? search.toLowerCase() : null;
  const rows = snapshot.items.filter((i) => {
    if (category && ![i.group, i.kind].some((c) => c.toLowerCase() === category.toLowerCase())) return false;
    if (stability && i.stability !== stability.toLowerCase()) return false;
    if (q) {
      const hay = [i.slug, i.title, i.description, ...i.exports.map((e) => e.name)].join(' ').toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    }
    return true;
  });
  if (!rows.length) {
    const groups = snapshot.groups.map((g) => g.id).join(', ');
    return text(`No components match. Categories (group ids) are: ${groups}. Kinds: component, utility, hooks, showcase, app. Stability: pre-1.0, pattern.`);
  }
  const lines = rows.map((i) => {
    const imports = [...new Set(i.exports.map((e) => e.module))].join(', ') || 'copy-in pattern (no package import)';
    return `- ${i.slug} | ${i.title} | ${i.group} | ${i.stability} | import from ${imports} | ${lead(i.description)}`;
  });
  return text(`${rows.length} of ${snapshot.items.length} entries (@punji/ui ${snapshot.version}). Format: slug | title | category | stability | import | lead\n${lines.join('\n')}\n\nCall get_component with a slug or export name for props, usage and examples.`);
}

const propTable = (props) => ['| Prop | Type | Default | Description |', '| --- | --- | --- | --- |', ...props.map((p) => `| ${p.name}${p.required ? ' (required)' : ''} | \`${cell(p.type)}\` | ${p.default ? `\`${cell(p.default)}\`` : ''} | ${cell(p.description)} |`)];
const cell = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
const bullets = (a) => (a ?? []).map((x) => `- ${x}`);
const fence = (lang, code) => [`\`\`\`${lang}`, code.replace(/\n+$/, ''), '```'];

/** One component as Markdown. Also served as the per-component resource. */
export function componentMarkdown(item) {
  const md = [`# ${item.title}`, '', `> ${item.description}`, '', `Stability: ${item.stability}. Docs: ${item.url}`, ''];
  if (item.uxOnly) md.push('> **UI is not enforcement.** ' + item.enforcementNote.replace(/^UI is not enforcement\.\s*/, ''), '');
  md.push(item.summary, '');
  if (item.exports.length) {
    md.push('## Import', '', ...fence('ts', item.exports.map((e) => e.import).join('\n')), '');
    md.push('## Props', '');
    for (const e of item.exports) {
      md.push(`### ${e.name} (${e.kind})`, '');
      if (e.description) md.push(e.description, '');
      if (e.props?.length) md.push(...propTable(e.props), '');
      if (e.signature) md.push(...fence('ts', e.signature), '');
      if (e.definition) md.push(...fence('ts', `type ${e.name} = ${e.definition}`), '');
    }
  } else md.push('A pattern to copy into your app (see the docs page and the shadcn registry); it is not package API.', '');
  md.push('## When to use', '', ...bullets(item.use), '', '## When not to use', '', ...bullets(item.avoid), '');
  md.push('## Keyboard', '', ...bullets(item.keyboard), '', '## Accessibility', '', ...bullets(item.accessibility), '', '## Responsive', '', ...bullets(item.responsive), '');
  if (item.notes) md.push(`## ${item.notes.title}`, '', ...bullets(item.notes.points), '');
  if (item.examples.length) {
    md.push('## Examples', '');
    for (const ex of item.examples) md.push(`### ${ex.title}`, '', ...(ex.note ? [ex.note, ''] : []), ...fence('tsx', ex.code), '');
  }
  if (item.related?.length) md.push('## Related', '', item.related.map((r) => `\`${r}\``).join(', '), '');
  return md.join('\n').replace(/\n+$/, '\n');
}

export function getComponent(snapshot, index, args = {}) {
  const { name } = args;
  if (!name) return fail('Pass a component name, slug or export name, for example "money-display" or "MoneyDisplay".');
  const key = norm(name);
  const item = index.byKey.get(key);
  if (!item) {
    const near = snapshot.items.filter((i) => norm(i.slug).includes(key) || key.includes(norm(i.slug)) || i.exports.some((e) => norm(e.name).includes(key))).slice(0, 8).map((i) => i.slug);
    return fail(`No component "${name}".${near.length ? ` Did you mean: ${near.join(', ')}?` : ''} Use list_components to browse.`);
  }
  return text(componentMarkdown(item));
}

export function getGuide(snapshot, args = {}) {
  const { topic } = args;
  const md = snapshot.guides[topic];
  if (!md) return fail(`Unknown topic "${topic}". Topics: ${TOPICS.join(', ')}.`);
  return text(md);
}

const ICON = { error: 'ERROR', warning: 'WARN', info: 'INFO' };

export function reviewUsage(snapshot, index, args = {}) {
  const { code } = args;
  if (typeof code !== 'string' || !code.trim()) return fail('Pass the code to review as a string.');
  const findings = reviewCode(code, { moneyProps: snapshot.moneyProps, exportModules: index.exportModules });
  if (!findings.length) return text('No findings. This is a static check of money props, root-barrel imports, javascript: hrefs and --pu-* overrides only; it does not replace the type checker, tests or server-side validation.', { structuredContent: { findings } });
  const body = findings.map((f) => `- [${ICON[f.severity]}] line ${f.line} ${f.rule}: ${f.message}\n  Fix: ${f.fix}\n  Code: ${f.snippet}`);
  return text(`${findings.length} finding(s):\n${body.join('\n')}`, { structuredContent: { findings } });
}

export const resources = {
  llms: 'punji://llms.txt',
  componentUri: (slug) => `punji://components/${slug}.md`,
};

/** Resource listing and reading, for the server and for tests. */
export function listResources(snapshot) {
  return [
    { uri: resources.llms, name: 'llms.txt', description: 'Index of the Punji UI docs for LLMs', mimeType: 'text/plain' },
    ...snapshot.items.map((i) => ({ uri: resources.componentUri(i.slug), name: `${i.slug}.md`, description: lead(i.description), mimeType: 'text/markdown' })),
  ];
}

export function readResource(snapshot, uri) {
  if (uri === resources.llms) return { uri, mimeType: 'text/plain', text: snapshot.llms };
  const m = /^punji:\/\/components\/([^/]+)\.md$/.exec(uri);
  const item = m && snapshot.items.find((i) => i.slug === m[1]);
  if (!item) return null;
  return { uri, mimeType: 'text/markdown', text: componentMarkdown(item) };
}
