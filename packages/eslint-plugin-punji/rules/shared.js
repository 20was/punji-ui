// Helpers shared by the rules: which local names come from @punji/ui, and what counts as a JS number.

/** True for '@punji/ui' and any '@punji/ui/<subpath>'. */
export function isPunjiSource(source) {
  return source === '@punji/ui' || (typeof source === 'string' && source.startsWith('@punji/ui/'));
}

/**
 * Tracks what a file imports from @punji/ui.
 * `named` maps local name -> imported name; `namespaces` holds `import * as X` locals.
 * Delegate `ImportDeclaration` from your rule's visitor.
 */
export function createImportTracker() {
  const named = new Map();
  const namespaces = new Set();
  return {
    named,
    namespaces,
    ImportDeclaration(node) {
      if (!isPunjiSource(node.source.value)) return;
      for (const spec of node.specifiers) {
        if (spec.type === 'ImportSpecifier') named.set(spec.local.name, spec.imported.name ?? spec.imported.value);
        else if (spec.type === 'ImportNamespaceSpecifier') namespaces.add(spec.local.name);
      }
    },
    /** The @punji/ui export a JSX element name refers to, or undefined. */
    jsxName(nameNode) {
      if (nameNode.type === 'JSXIdentifier') return named.get(nameNode.name);
      if (nameNode.type === 'JSXMemberExpression' && nameNode.object.type === 'JSXIdentifier' && namespaces.has(nameNode.object.name)) return nameNode.property.name;
      return undefined;
    },
    /** The @punji/ui export a callee identifier or namespace member refers to, or undefined. */
    calleeName(callee) {
      if (callee.type === 'Identifier') return named.get(callee.name);
      if (callee.type === 'MemberExpression' && !callee.computed && callee.object.type === 'Identifier' && namespaces.has(callee.object.name) && callee.property.type === 'Identifier') return callee.property.name;
      return undefined;
    },
  };
}

const ARITHMETIC = new Set(['+', '-', '*', '/', '%', '**']);
const NUMBER_CALLS = new Set(['Number', 'parseFloat', 'parseInt']);

/** True when the expression is evidently a JS number (a literal, Number(), parseFloat(), Math.*, or arithmetic on one). */
export function isNumberish(node) {
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'number';
    case 'UnaryExpression':
      return node.operator === '+' || (node.operator === '-' && isNumberish(node.argument));
    case 'CallExpression': {
      const c = node.callee;
      if (c.type === 'Identifier') return NUMBER_CALLS.has(c.name);
      return c.type === 'MemberExpression' && !c.computed && c.object.type === 'Identifier' && (c.object.name === 'Math' || (c.object.name === 'Number' && c.property.name === 'parseFloat'));
    }
    case 'BinaryExpression':
      return ARITHMETIC.has(node.operator) && (isNumberish(node.left) || isNumberish(node.right));
    case 'ConditionalExpression':
      return isNumberish(node.consequent) || isNumberish(node.alternate);
    case 'LogicalExpression':
      return isNumberish(node.left) || isNumberish(node.right);
    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'TSSatisfiesExpression':
      return isNumberish(node.expression);
    default:
      return false;
  }
}
