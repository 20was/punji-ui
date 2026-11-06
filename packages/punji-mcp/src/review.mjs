// review_usage: static, regex-level checks on a code string. Nothing is executed or evaluated.
// This is a deliberately small subset of what a type checker and lint rules give you; it exists so an agent can
// catch the common Punji mistakes before it writes the file. No @punji/ui ESLint plugin exists yet to reuse.

const NUMBER_LITERAL = /^[-+]?\d[\d_]*(\.\d+)?$/;
const FLOAT_MATH = /(?:^|[^\w$.])(?:Number|parseFloat|parseInt)\s*\(|\.toFixed\s*\(|\bMath\.(?:round|floor|ceil|trunc)\s*\(|\*\s*100\b|\/\s*100\b|\bas\s+number\b/;

const lineOf = (code, index) => code.slice(0, index).split('\n').length;
const snippet = (text) => text.replace(/\s+/g, ' ').trim().slice(0, 120);

/** Read the opening tag that starts at `start` (`<Name ...>`), balancing braces and quotes. Returns the attribute text. */
function openingTag(code, start) {
  let i = start + 1;
  while (i < code.length && /[\w$.]/.test(code[i])) i++;
  const attrsStart = i;
  let depth = 0;
  let quote = null;
  for (; i < code.length; i++) {
    const c = code[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (depth === 0 && (c === '"' || c === "'")) quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (depth > 0 && (c === '"' || c === "'" || c === '`')) quote = c;
    else if (depth === 0 && c === '>') return code.slice(attrsStart, i);
    if (depth < 0) return null;
  }
  return null;
}

/** `name={expr}` and `name="text"` pairs of an attribute string. */
function attributes(text) {
  const found = [];
  const re = /([A-Za-z_][\w:-]*)\s*=\s*/g;
  let m;
  while ((m = re.exec(text))) {
    let i = re.lastIndex;
    if (text[i] === '{') {
      let depth = 0;
      let quote = null;
      const from = i;
      for (; i < text.length; i++) {
        const c = text[i];
        if (quote) {
          if (c === '\\') i++;
          else if (c === quote) quote = null;
        } else if (c === '"' || c === "'" || c === '`') quote = c;
        else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) break;
      }
      found.push({ name: m[1], kind: 'expr', value: text.slice(from + 1, i).trim() });
      re.lastIndex = i + 1;
    } else if (text[i] === '"' || text[i] === "'") {
      const end = text.indexOf(text[i], i + 1);
      if (end < 0) break;
      found.push({ name: m[1], kind: 'string', value: text.slice(i + 1, end) });
      re.lastIndex = end + 1;
    }
  }
  return found;
}

/**
 * @param {string} code
 * @param {{ moneyProps: Record<string, string[]>, exportModules: Record<string, string> }} data
 */
export function reviewCode(code, data) {
  const findings = [];
  const add = (rule, severity, index, message, fix) => findings.push({ rule, severity, line: lineOf(code, index), message, fix, snippet: snippet(code.slice(index, index + 120)) });

  // 1. Money passed as number/float to bigint-typed props of Punji components.
  const tag = /<([A-Z][\w$]*)(?=[\s/>])/g;
  let m;
  while ((m = tag.exec(code))) {
    const props = data.moneyProps[m[1]];
    if (!props) continue;
    const attrText = openingTag(code, m.index);
    if (!attrText) continue;
    for (const attr of attributes(attrText)) {
      if (!props.includes(attr.name) || attr.kind !== 'expr') continue;
      const where = m.index + m[0].length + attrText.indexOf(attr.name);
      if (NUMBER_LITERAL.test(attr.value.replace(/_/g, ''))) {
        const n = attr.value.replace(/_/g, '');
        const fix = /\./.test(n)
          ? `Convert to integer minor units first (for a 2-decimal currency ${n} is ${Math.round(Number(n) * 100)}n), or pass the exact decimal string "${n}" where the prop accepts a string (MoneyDisplay value does).`
          : `Pass a bigint literal: ${attr.name}={${n}n}.`;
        add('money-number', 'error', where, `<${m[1]} ${attr.name}> is money (bigint minor units) but receives the number ${n}.`, fix);
      } else if (FLOAT_MATH.test(attr.value)) {
        add('money-float', 'error', where, `<${m[1]} ${attr.name}> is computed with floating-point (Number, parseFloat, toFixed, Math.round or *100).`, 'Keep money as bigint minor units end to end. Parse user text with parseMoney (@punji/ui/money) or CurrencyInput, divide only with an explicit rounding mode (divideRounded from @punji/ui/calculations), and send minor units over JSON as strings.');
      }
    }
  }
  const bigintFloat = /BigInt\s*\(\s*(?:-?\d+\.\d+\s*\)|[^)]*(?:parseFloat|toFixed|Number\s*\(|Math\.|\*\s*100\b))/g;
  while ((m = bigintFloat.exec(code))) {
    add('money-bigint-from-float', 'error', m.index, 'BigInt() fed from a float or float arithmetic: it throws on fractions and hides rounding errors for money.', 'Compute in bigint from the start (for example BigInt(units) * 100n + BigInt(cents)), or parse the decimal string with the library money parser.');
  }

  // 2. Root-barrel imports.
  const barrel = /(?:import\s+(type\s+)?(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from|require\s*\(|import\s*\()\s*['"]@punji\/ui['"]/g;
  while ((m = barrel.exec(code))) {
    const names = (m[3] ?? '').split(',').map((s) => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean);
    const lines = names.map((n) => (data.exportModules[n] ? `import { ${n} } from '${data.exportModules[n]}';` : `// ${n}: no subpath found, check get_component`));
    add('root-barrel-import', 'warning', m.index, "Importing from the package root '@punji/ui' pulls the whole barrel into the bundle.", lines.length ? `Import each name from its own subpath:\n${lines.join('\n')}` : "Import from the component's subpath (see get_component).");
  }

  // 3. Unsafe href values.
  const href = /\bhref\s*[=:]\s*\{?\s*[`'"]\s*(?:[\t\n\r ]*)(javascript|vbscript|data)\s*:/gi;
  while ((m = href.exec(code))) {
    add('unsafe-href', 'error', m.index, `href with a ${m[1].toLowerCase()}: URL runs script or injects content when clicked.`, 'Use a real route or https URL. For user-supplied links, pass them through safeHref from @punji/ui/link (it returns undefined for unsafe schemes), and supply your router link once with LinkProvider.');
  }
  const hrefDynamic = /\bhref\s*=\s*\{\s*(?:user|input|params|searchParams|props|data)[\w$.[\]'"]*\s*\}/g;
  while ((m = hrefDynamic.exec(code))) {
    add('unvalidated-href', 'info', m.index, 'href comes straight from data; a javascript: URL in that data would be clickable.', 'Wrap untrusted values: href={safeHref(value)} (import { safeHref } from "@punji/ui/link"). Punji components already guard their own href props; plain <a> elements do not.');
  }

  // 4. --pu-* token overrides.
  const token = /(['"]?)(--pu-[\w-]+)\1\s*:|setProperty\s*\(\s*['"](--pu-[\w-]+)/g;
  while ((m = token.exec(code))) {
    add('pu-token-override', 'warning', m.index, `Overrides the internal design token ${m[2] ?? m[3]}. --pu-* tokens are internal and can change between pre-1.0 releases.`, 'Use the supported switches: data-theme (light, dark, light-hc, dark-hc), data-pu-density, dir, and themeAttributes from @punji/ui/theme. If you need a brand colour, read get_guide theming and tokens first.');
  }

  findings.sort((a, b) => a.line - b.line);
  return findings;
}
