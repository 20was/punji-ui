import noNumberMoney from './rules/no-number-money.js';
import noRawPuTokenOverride from './rules/no-raw-pu-token-override.js';
import noUnsafeHref from './rules/no-unsafe-href.js';
import preferSubpathImport from './rules/prefer-subpath-import.js';

const plugin = {
  meta: { name: 'eslint-plugin-punji', version: '0.0.0' },
  rules: {
    'no-number-money': noNumberMoney,
    'no-raw-pu-token-override': noRawPuTokenOverride,
    'no-unsafe-href': noUnsafeHref,
    'prefer-subpath-import': preferSubpathImport,
  },
  configs: {},
};

// Flat config: `export default [punji.configs.recommended]` in eslint.config.js.
plugin.configs.recommended = {
  name: 'punji/recommended',
  files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
  plugins: { punji: plugin },
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  rules: {
    'punji/no-number-money': 'error',
    'punji/no-unsafe-href': 'error',
    'punji/no-raw-pu-token-override': 'warn',
    'punji/prefer-subpath-import': 'warn',
  },
};

export default plugin;
