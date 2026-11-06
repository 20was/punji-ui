// @vitest-environment node
import { RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../index.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
});

const imp = "import { MoneyDisplay, PaymentReceipt, createMoneyFormatter, money } from '@punji/ui';\n";

tester.run('punji/no-number-money', plugin.rules['no-number-money'], {
  valid: [
    { code: `${imp}<MoneyDisplay value={1250n} currency="NPR" />;` },
    { code: `${imp}<MoneyDisplay value="12.50" currency="NPR" />;` },
    { code: `${imp}<MoneyDisplay value={BigInt(total) * 2n} />;` },
    { code: `${imp}<MoneyDisplay value={minor} />;` },
    // Not a Punji import: not our business.
    { code: "import { MoneyDisplay } from './local'; <MoneyDisplay value={12.5} />;" },
    // Not a money prop.
    { code: `${imp}<MoneyDisplay value={1n} digits={2} />;` },
    // Figure takes numbers legitimately.
    { code: "import { Figure } from '@punji/ui'; <Figure value={12.5} />;" },
    { code: `${imp}const f = createMoneyFormatter({ currency: 'NPR' }); f.format(1250n);` },
    { code: `${imp}money(1250n, 'NPR');` },
    { code: "const f = { format() {} }; f.format(12.5);" },
  ],
  invalid: [
    { code: `${imp}<MoneyDisplay value={12.5} currency="NPR" />;`, errors: [{ messageId: 'prop' }] },
    { code: "import { MoneyDisplay as MD } from '@punji/ui/money-display'; <MD value={100} />;", errors: [{ messageId: 'prop' }] },
    { code: "import * as UI from '@punji/ui'; <UI.PaymentReceipt amount={Number(x)} />;", errors: [{ messageId: 'prop' }] },
    { code: `${imp}<PaymentReceipt amount={parseFloat(input)} fees={total * 0.13} />;`, errors: [{ messageId: 'prop' }, { messageId: 'prop' }] },
    { code: `${imp}<MoneyDisplay value={-5} />;`, errors: [{ messageId: 'prop' }] },
    { code: `${imp}<MoneyDisplay value={ok ? 1 : 2} />;`, errors: [{ messageId: 'prop' }] },
    { code: `${imp}const f = createMoneyFormatter({ currency: 'NPR' }); f.format(12.5);`, errors: [{ messageId: 'call' }] },
    { code: `${imp}createMoneyFormatter({ currency: 'NPR' }).format(price * 100);`, errors: [{ messageId: 'call' }] },
    { code: `${imp}money(12.5, 'NPR');`, errors: [{ messageId: 'call' }] },
  ],
});

tester.run('punji/prefer-subpath-import', plugin.rules['prefer-subpath-import'], {
  valid: [
    { code: "import { Button } from '@punji/ui/button';" },
    { code: "import { Button, Card, MoneyDisplay, Avatar } from '@punji/ui';" }, // over the default limit of 3
    { code: "import { Button, NotARealExport } from '@punji/ui';" }, // unknown name: left alone
    { code: "import * as UI from '@punji/ui';" },
    { code: "import { Button, Card } from '@punji/ui';", options: [{ maxNames: 1 }] },
    { code: "import '@punji/ui';" },
  ],
  invalid: [
    {
      code: "import { Button } from '@punji/ui';",
      output: "import { Button } from '@punji/ui/button';",
      errors: [{ messageId: 'subpath' }],
    },
    {
      code: "import { Button as B, MoneyDisplay } from '@punji/ui';",
      output: "import { Button as B } from '@punji/ui/button';\nimport { MoneyDisplay } from '@punji/ui/money-display';",
      errors: [{ messageId: 'subpath' }],
    },
    {
      code: "import { Button, Card, MoneyDisplay, Avatar } from '@punji/ui';",
      options: [{ maxNames: 4 }],
      output: "import { Button } from '@punji/ui/button';\nimport { Card } from '@punji/ui/card';\nimport { MoneyDisplay } from '@punji/ui/money-display';\nimport { Avatar } from '@punji/ui/avatar';",
      errors: [{ messageId: 'subpath' }],
    },
  ],
});

tester.run('punji/no-raw-pu-token-override', plugin.rules['no-raw-pu-token-override'], {
  valid: [
    { code: "const s = { color: 'red', '--other': 1 };", filename: 'src/a.tsx' },
    { code: "const s = { '--pu-accent': '#f00' };", filename: 'src/theme/brand.ts' },
    { code: "const s = { '--pu-accent': '#f00' };", filename: 'src/app.theme.ts' },
    { code: "const s = { '--pu-accent': '#f00' };", filename: 'src/brand.ts', options: [{ allow: ['**/brand.ts'] }] },
    { code: "el.style.setProperty('--other', '1');", filename: 'src/a.ts' },
    { code: "<div style={{ color: 'var(--pu-accent)' }} />;", filename: 'src/a.tsx' },
  ],
  invalid: [
    { code: "<div style={{ '--pu-accent': '#f00' }} />;", filename: 'src/a.tsx', errors: [{ messageId: 'override' }] },
    { code: 'const s = { [`--pu-radius`]: 4 };', filename: 'src/a.tsx', errors: [{ messageId: 'override' }] },
    { code: "el.style.setProperty('--pu-accent', '#f00');", filename: 'src/a.ts', errors: [{ messageId: 'override' }] },
    { code: "const s = { '--pu-accent': '#f00' };", filename: 'src/a.tsx', options: [{ allow: ['**/brand.ts'] }], errors: [{ messageId: 'override' }] },
  ],
});

tester.run('punji/no-unsafe-href', plugin.rules['no-unsafe-href'], {
  valid: [
    { code: "import { Button } from '@punji/ui'; <Button href=\"/orders\">Go</Button>;" },
    { code: "import { Button } from '@punji/ui'; <Button href={url}>Go</Button>;" },
    { code: "import { Button } from '@punji/ui'; <Button href=\"https://example.com/javascript:\">Go</Button>;" },
    { code: "<Button href=\"javascript:alert(1)\">Go</Button>;" }, // not from Punji
    { code: "import { MoneyDisplay } from '@punji/ui'; <MoneyDisplay href=\"javascript:void(0)\" />;" },
  ],
  invalid: [
    { code: "import { Button } from '@punji/ui'; <Button href=\"javascript:void(0)\">Go</Button>;", errors: [{ messageId: 'unsafe' }] },
    { code: "import { CardLink } from '@punji/ui/card-link'; <CardLink href={'  JaVa\\tScript:alert(1)'} />;", errors: [{ messageId: 'unsafe' }] },
    { code: "import { StatusPill as P } from '@punji/ui'; <P href={`data:text/html,x`} />;", errors: [{ messageId: 'unsafe' }] },
    { code: "import * as UI from '@punji/ui'; <UI.CheckRow href=\"vbscript:x\" />;", errors: [{ messageId: 'unsafe' }] },
  ],
});

describe('recommended config', () => {
  it('registers every rule', () => {
    const { rules } = plugin.configs.recommended;
    for (const name of Object.keys(plugin.rules)) expect(rules[`punji/${name}`]).toBeDefined();
    expect(plugin.configs.recommended.plugins.punji).toBe(plugin);
  });
});
