import { Card } from '@punji/ui/card';
import { allocation, divideRounded } from '@punji/ui/calculations';
import { addMoney, currencyExponent, formatMoney, money, nepalMoneyConfig, parseMoney } from '@punji/ui/money';
import { DataRow, DataRows } from '@punji/ui/rows';
import { Stack } from '@punji/ui/stack';

// Every "Punji" value below is computed when the page renders, by the library functions the code calls.
// Every "Float" value is the same question asked of a JavaScript number.
const usd = { currency: 'USD', locale: 'en-US' } as const;
const plain = { ...usd, display: 'none' } as const;
const fixed2 = (n: number) => n.toFixed(2);

interface Case { id: string; title: string; input: string; float: string; punji: string; why: string }

function cases(): Case[] {
  // 10,000 payments of one cent.
  let floatSum = 0;
  let exactSum = money(0n, 'USD');
  for (let i = 0; i < 10_000; i++) { floatSum += 0.01; exactSum = addMoney(exactSum, money(1n, 'USD')); }

  // The first integer a float cannot hold, as minor units (cents).
  const huge = 9007199254740993n;

  // $100.00 shared three ways: whole cents to each, the leftover cents to the first shares.
  const total = 10000n;
  const base = divideRounded(total, 3n, 'trunc');
  const left = Number(total - base * 3n);
  const shares = [0, 1, 2].map((i) => base + (i < left ? 1n : 0n));
  const sharesSum = shares.reduce((sum, s) => addMoney(sum, money(s, 'USD')), money(0n, 'USD'));
  const pct = allocation([{ id: 'a', value: 1n }, { id: 'b', value: 1n }, { id: 'c', value: 1n }]);
  const thirds = [1, 2, 3].map(() => fixed2(100 / 3));

  // 123456 minor units in three currencies with three different minor units.
  const rows = ['JPY', 'USD', 'KWD'] as const;
  const german = parseMoney('1.234,56', { currency: 'EUR', locale: 'de-DE' });

  return [
    {
      id: 'sum', title: '0.10 + 0.20', input: '10 + 20 cents',
      float: String(0.1 + 0.2),
      punji: formatMoney(addMoney(money(10n, 'USD'), money(20n, 'USD')).minor, usd),
      why: 'Binary floats cannot hold 0.1 or 0.2, so their sum is off by a hair. Cents as a bigint add exactly.',
    },
    {
      id: 'many', title: '10,000 payments of 0.01', input: '10,000 x 1 cent',
      float: String(floatSum),
      punji: formatMoney(exactSum.minor, usd),
      why: 'Each float addition carries a tiny error and they accumulate. Integer cents never drift.',
    },
    {
      id: 'huge', title: 'Past 2^53', input: `${huge} cents`,
      float: fixed2(Number(huge) / 100),
      punji: formatMoney(huge, usd),
      why: 'A float holds whole numbers exactly only up to 9,007,199,254,740,992. Beyond it the last cent is silently wrong. bigint has no limit.',
    },
    {
      id: 'round-1005', title: 'Round 1.005 to 2 places', input: '1.005 (exact: 1005 thousandths)',
      float: `${fixed2(1.005)} (toFixed), ${Math.round(1.005 * 100) / 100} (Math.round)`,
      punji: `${formatMoney(divideRounded(1005n, 10n, 'half-up'), plain)} half-up, ${formatMoney(divideRounded(1005n, 10n, 'half-even'), plain)} half-even`,
      why: 'The float for 1.005 is really 1.00499999999999989..., so it rounds down whatever the rule. Exact 1.005 is a true tie: half-up goes to 1.01, half-even to the even digit, 1.00.',
    },
    {
      id: 'ties', title: 'Ties: 2.5, 3.5 and -2.5 to whole units', input: '25, 35 and -25 tenths',
      float: `${[2.5, 3.5, -2.5].map((n) => Math.round(n)).join(', ')} (Math.round)`,
      punji: `${[25n, 35n, -25n].map((n) => divideRounded(n, 10n, 'half-up')).join(', ')} half-up; ${[25n, 35n, -25n].map((n) => divideRounded(n, 10n, 'half-even')).join(', ')} half-even`,
      why: 'Math.round sends -2.5 up to -2 but 2.5 up to 3: ties are not symmetric. Half-up rounds ties away from zero. Half-even (banker\'s rounding) alternates, so errors cancel across many amounts. You choose; nothing is implicit.',
    },
    {
      id: 'split', title: 'Split 100.00 three ways', input: '10000 cents / 3',
      float: `${thirds.join(' + ')} = ${fixed2(3 * Number(thirds[0]))}`,
      punji: `${shares.map((s) => formatMoney(s, plain)).join(' + ')} = ${formatMoney(sharesSum.minor, plain)}`,
      why: 'Rounding each third loses a cent. Give each share the whole cents (divideRounded with trunc), then hand the leftover cents out one by one so the parts always add to the total.',
    },
    {
      id: 'shares', title: 'Three equal shares, in percent', input: '1 : 1 : 1',
      float: `${thirds.join(' + ')} = ${fixed2(3 * Number(thirds[0]))}`,
      punji: `${pct.map((p) => p.displayPercent).join(' + ')} = ${pct.reduce((s, p) => s + (p.displayPercent ?? 0), 0).toFixed(2)}`,
      why: 'allocation() rounds by the largest remainder, so a pie legend adds to exactly 100 instead of 99.99.',
    },
    {
      id: 'minor', title: 'Minor units differ by currency', input: '123456 minor units',
      float: `${rows.map(() => fixed2(123456 / 100)).join(' / ')} (always /100)`,
      punji: rows.map((c) => `${formatMoney(123456n, { currency: c, locale: 'en-US' })} (${currencyExponent(c)} decimals)`).join(' / '),
      why: 'Yen has no minor unit, the dollar and the rupee have two, the Kuwaiti dinar three. Dividing by 100 everywhere shows the wrong amount for two of the three. currencyExponent() asks the currency.',
    },
    {
      id: 'grouping', title: 'Lakh and crore grouping', input: '123456789 paisa',
      float: (123456789 / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      punji: `${formatMoney(123456789n, nepalMoneyConfig())} (lakh) / ${formatMoney(123456789n, { ...nepalMoneyConfig(), grouping: 'western' })} (international)`,
      why: 'South Asia groups the last three digits, then pairs: 12,34,567.89. The grouping is a setting of the formatter, not a string you patch together.',
    },
    {
      id: 'negative', title: 'Negative amounts and accounting format', input: '-123456 cents',
      float: fixed2(-123456 / 100),
      punji: `${formatMoney(-123456n, usd)} / ${formatMoney(-123456n, { ...usd, accounting: true })} / ${formatMoney(123456n, { ...usd, signDisplay: 'always' })}`,
      why: 'The sign belongs to the locale and the ledger convention: a minus, parentheses for accounting, or an explicit plus. A screen reader is told "-1,234.56 US dollars" either way.',
    },
    {
      id: 'neg-zero', title: 'Negative zero', input: '-0.001 rounded to cents',
      float: fixed2(-0.001),
      punji: formatMoney(divideRounded(-1n, 10n, 'half-even'), { ...usd, signDisplay: 'exceptZero' }),
      why: 'A float rounds to "-0.00", a minus sign in front of nothing. A bigint zero has no sign.',
    },
    {
      id: 'parse', title: 'Typed text in another locale', input: '"1.234,56" (German)',
      float: String(parseFloat('1.234,56')),
      punji: german.state === 'valid' ? `${formatMoney(german.minor, { currency: 'EUR', locale: 'de-DE' })} (${german.minor} cents)` : german.state,
      why: 'parseFloat stops at the second separator and reads 1.234. parseMoney reads the locale\'s own separators and returns exact minor units.',
    },
  ];
}

export default function Example() {
  return (
    <Stack>
      {cases().map((c) => (
        <Card key={c.id} title={c.title} headingLevel={3} testId={`lab-${c.id}`}>
          <DataRows flush label={`${c.title}: float against Punji`}>
            <DataRow label="Input" value={c.input} />
            <DataRow label="Float" value={c.float} testId={`lab-${c.id}-float`} />
            <DataRow label="Punji" value={c.punji} testId={`lab-${c.id}-punji`} />
          </DataRows>
          <p className="doc-muted">{c.why}</p>
        </Card>
      ))}
    </Stack>
  );
}
