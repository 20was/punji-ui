// Matches a path against a glob (`**`, `*`, `?`). Enough for an allowlist; no braces or classes.
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      i += 1;
      if (glob[i + 1] === '/') {
        i += 1;
        re += '(?:.*/)?';
      } else re += '.*';
    } else if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const DEFAULT_ALLOW = ['**/theme.*', '**/*.theme.*', '**/theme/**', '**/themes/**'];
const isToken = (v) => typeof v === 'string' && v.trim().startsWith('--pu-');

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow setting --pu-* custom properties by hand outside a theme file; use createTheme.' },
    schema: [{ type: 'object', properties: { allow: { type: 'array', items: { type: 'string' } } }, additionalProperties: false }],
    messages: { override: 'Do not set {{token}} by hand. Build a theme with createTheme() so tokens stay consistent (or add this file to the "allow" globs).' },
  },
  create(context) {
    const patterns = (context.options[0]?.allow ?? DEFAULT_ALLOW).map(globToRegExp);
    const file = context.filename.replaceAll('\\', '/');
    if (patterns.some((p) => p.test(file))) return {};
    const report = (node, token) => context.report({ node, messageId: 'override', data: { token: token.trim() } });
    return {
      Property(node) {
        if (node.parent.type !== 'ObjectExpression') return;
        const k = node.key;
        if (k.type === 'Literal' && isToken(k.value)) report(k, k.value);
        else if (!node.computed && k.type === 'Identifier' && k.name.startsWith('--pu-')) report(k, k.name);
        else if (node.computed && k.type === 'TemplateLiteral' && k.expressions.length === 0 && isToken(k.quasis[0].value.cooked)) report(k, k.quasis[0].value.cooked);
      },
      CallExpression(node) {
        const c = node.callee;
        const [first] = node.arguments;
        if (c.type === 'MemberExpression' && !c.computed && c.property.name === 'setProperty' && first?.type === 'Literal' && isToken(first.value)) report(first, first.value);
      },
    };
  },
};
