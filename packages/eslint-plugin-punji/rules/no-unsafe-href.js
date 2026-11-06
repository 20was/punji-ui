import { createImportTracker } from './shared.js';

// Punji components that render an <a> from an `href` prop.
export const LINK_COMPONENTS = new Set(['Button', 'CardLink', 'CheckRow', 'StatusPill']);

// Browsers ignore whitespace and control characters inside a scheme, so strip them before testing.
const strip = (s) => [...s].filter((ch) => { const c = ch.codePointAt(0); return c > 0x20 && !(c >= 0x7f && c <= 0x9f); }).join('');
const UNSAFE = /^(?:javascript|vbscript|data):/i;

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow literal javascript:, vbscript: and data: hrefs on Punji link components.' },
    schema: [],
    messages: { unsafe: 'Unsafe href on <{{component}}>: {{scheme}} URLs run code. Use a real URL, or a Button with onClick and no href. (safeHref drops these at runtime, which silently breaks the link.)' },
  },
  create(context) {
    const tracker = createImportTracker();
    return {
      ImportDeclaration: tracker.ImportDeclaration,
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'href' || !node.value) return;
        const component = tracker.jsxName(node.parent.name);
        if (!component || !LINK_COMPONENTS.has(component)) return;
        let value = node.value;
        if (value.type === 'JSXExpressionContainer') value = value.expression;
        let text;
        if (value.type === 'Literal' && typeof value.value === 'string') text = value.value;
        else if (value.type === 'TemplateLiteral') text = value.quasis[0].value.cooked; // the static prefix decides the scheme
        if (text === undefined) return;
        const clean = strip(text);
        if (UNSAFE.test(clean)) context.report({ node: value, messageId: 'unsafe', data: { component, scheme: `${clean.split(':')[0].toLowerCase()}:` } });
      },
    };
  },
};
