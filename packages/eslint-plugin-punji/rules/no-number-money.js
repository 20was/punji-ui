import { createImportTracker, isNumberish } from './shared.js';

// The one table: Punji components whose props are exact bigint minor units, and the props to check.
// Figure and Delta are deliberately absent: they accept plain numbers (ratios, percentages) as well as Money.
export const MONEY_PROPS = {
  MoneyDisplay: ['value'],
  DebitCredit: ['value'],
  AmountKeypad: ['max'],
  PaymentReceipt: ['amount', 'fees', 'total'],
  BillSummary: ['total'],
  BankAccountCard: ['balance'],
  InsurancePremiumCard: ['premium', 'sumAssured'],
  LedgerTable: ['opening'],
  OrderTicket: ['defaultPrice', 'defaultQuantity'],
};

// Functions whose first argument is minor units, and MoneyFormatter methods that take minor units.
const MONEY_FUNCTIONS = new Set(['money', 'formatMoney', 'formatCompactMoney']);
const FORMATTER_METHODS = new Set(['format', 'formatToParts', 'formatSpoken', 'formatCompact', 'toDecimal']);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow JS numbers where Punji UI expects bigint minor units.' },
    schema: [],
    messages: {
      prop: 'Money prop "{{prop}}" on <{{component}}> must be bigint minor units, not a JS number. Use a bigint literal such as 1250n, or money(1250n, \'NPR\').',
      call: '{{callee}}() takes bigint minor units, not a JS number. Use a bigint literal such as 1250n; floats lose cents.',
    },
  },
  create(context) {
    const tracker = createImportTracker();
    const formatters = new Set();
    const isFormatterCreation = (node) => Boolean(node) && node.type === 'CallExpression' && tracker.calleeName(node.callee) === 'createMoneyFormatter';

    return {
      ImportDeclaration: tracker.ImportDeclaration,
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && isFormatterCreation(node.init)) formatters.add(node.id.name);
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.value?.type !== 'JSXExpressionContainer') return;
        const component = tracker.jsxName(node.parent.name);
        const props = component && MONEY_PROPS[component];
        if (!props?.includes(node.name.name)) return;
        const expr = node.value.expression;
        if (expr.type !== 'JSXEmptyExpression' && isNumberish(expr)) context.report({ node: expr, messageId: 'prop', data: { prop: node.name.name, component } });
      },
      CallExpression(node) {
        const [first] = node.arguments;
        if (!first || first.type === 'SpreadElement') return;
        const fn = tracker.calleeName(node.callee);
        if (fn && MONEY_FUNCTIONS.has(fn)) {
          if (isNumberish(first)) context.report({ node: first, messageId: 'call', data: { callee: fn } });
          return;
        }
        const c = node.callee;
        if (c.type !== 'MemberExpression' || c.computed || c.property.type !== 'Identifier' || !FORMATTER_METHODS.has(c.property.name)) return;
        const viaVariable = c.object.type === 'Identifier' && formatters.has(c.object.name);
        if ((viaVariable || isFormatterCreation(c.object)) && isNumberish(first)) context.report({ node: first, messageId: 'call', data: { callee: `formatter.${c.property.name}` } });
      },
    };
  },
};
