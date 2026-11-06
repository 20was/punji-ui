// Backs the conformance cards on the "Money correctness lab" page. The cards come from one list
// (site/src/money-lab/conformance.ts); each claim there needs a proof here, keyed "<card>.<guarantee>".
// A claim without a proof fails, and so does a proof nobody claims, so a card cannot say what is not tested.
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { CurrencyInput, Delta, Figure, MoneyDisplay, PriceChange, getMoneyFormatter, money, nepalMoneyConfig, type CurrencyInputChange } from '../src/index.ts';
import { CARDS, GUARANTEES } from '../site/src/money-lab/conformance.ts';
import { seriousViolations } from './axe.ts';

const flat = (s: string | null | undefined) => (s ?? '').replace(/[\u00a0\u202f]/g, ' ');
/** 2^53 + 1 minor units: the first integer a float cannot hold. */
const PAST_2_53 = 9007199254740993n;
const text = (testId: string) => flat(screen.getByTestId(testId).textContent);

function Typed({ currency, locale, onChange }: { currency: string; locale: string; onChange: (c: CurrencyInputChange) => void }) {
  const [value, setValue] = useState('');
  return <CurrencyInput label="Amount" currency={currency} locale={locale} value={value} onValueChange={(c) => { setValue(c.value); onChange(c); }} />;
}

const proofs: Record<string, () => void | Promise<void>> = {
  'MoneyDisplay.exact': () => {
    render(<MoneyDisplay value={PAST_2_53} currency="USD" locale="en-US" testId="m" />);
    expect(screen.getByTestId('m').getAttribute('value')).toBe('90071992547409.93');
    expect(text('m')).toContain('$90,071,992,547,409.93');
    expect(String(Number(PAST_2_53))).not.toBe(String(PAST_2_53));
  },
  'MoneyDisplay.rounding': () => {
    render(<MoneyDisplay value={123456789n} preset={nepalMoneyConfig()} compact testId="c" />);
    expect(flat(screen.getByTestId('c').querySelector('[aria-hidden]')?.textContent)).toBe('NPR 12.35 L'); // shortened, display only
    expect(flat(screen.getByTestId('c').querySelector('.kit-sr')?.textContent)).toBe('NPR 12,34,567.89'); // the spoken text keeps the exact amount
    render(<MoneyDisplay value={123456789n} currency="USD" locale="en-US" testId="p" />);
    expect(flat(screen.getByTestId('p').querySelector('[aria-hidden]')?.textContent)).toBe('$1,234,567.89'); // not compact: nothing is shortened
  },
  'MoneyDisplay.grouping': () => {
    render(<MoneyDisplay value={123456789n} preset={nepalMoneyConfig()} testId="m" />);
    expect(text('m')).toBe('NPR 12,34,567.89');
  },
  'MoneyDisplay.sign': () => {
    render(<MoneyDisplay value={-250n} currency="USD" locale="en-US" testId="a" />);
    expect(text('a')).toContain('-$2.50');
    expect(screen.getByTestId('a').dataset.sign).toBe('negative');
    render(<MoneyDisplay value={-250n} currency="USD" locale="en-US" accounting testId="b" />);
    expect(screen.getByTestId('b').querySelector('[aria-hidden]')?.textContent).toBe('($2.50)');
  },
  'MoneyDisplay.spoken': () => {
    render(<MoneyDisplay value={123456n} currency="AUD" locale="en-US" testId="m" />);
    expect(screen.getByTestId('m').querySelector('.kit-sr')?.textContent).toBe('1,234.56 Australian dollars');
    render(<MoneyDisplay value={null} currency="USD" testId="none" />);
    expect(screen.getByTestId('none').querySelector('.kit-sr')?.textContent).toBe('No value');
  },
  'MoneyDisplay.axe': async () => {
    const { container } = render(<><MoneyDisplay value={123456n} currency="AUD" locale="en-US" /><MoneyDisplay value={-5n} currency="USD" accounting /><MoneyDisplay value={null} currency="USD" /></>);
    expect(await seriousViolations(container)).toEqual([]);
  },

  'Figure.exact': () => {
    render(<Figure value={money(PAST_2_53, 'USD')} testId="f" />);
    expect(text('f')).toBe('$90,071,992,547,409.93');
  },
  'Figure.grouping': () => {
    render(<Figure value={money(123456789n, 'NPR')} formatter={getMoneyFormatter({ ...nepalMoneyConfig(), display: 'none' })} testId="f" />);
    expect(text('f')).toBe('12,34,567.89');
  },
  'Figure.sign': () => {
    render(<Figure value={money(-250n, 'USD')} testId="f" />);
    expect(text('f')).toBe('-$2.50');
  },
  'Figure.axe': async () => {
    const { container } = render(<><Figure value={money(-250n, 'USD')} /><Figure value={12.5} kind="pct" /><Figure value={null} /></>);
    expect(await seriousViolations(container)).toEqual([]);
  },

  'Delta.exact': () => {
    render(<Delta value={money(PAST_2_53, 'USD')} testId="d" />);
    expect(text('d')).toContain('+$90,071,992,547,409.93');
  },
  'Delta.sign': () => {
    render(<><Delta value={money(250n, 'USD')} testId="up" /><Delta value={money(-250n, 'USD')} testId="dn" /><Delta value={money(0n, 'USD')} testId="zero" /></>);
    expect(text('up')).toContain('+$2.50');
    expect(screen.getByTestId('up').querySelector('[aria-hidden="true"]')?.textContent).toContain('▲');
    expect(text('dn')).toContain('−$2.50');
    expect(screen.getByTestId('dn').querySelector('[aria-hidden="true"]')?.textContent).toContain('▼');
    expect(screen.getByTestId('zero').querySelector('[aria-hidden="true"]')).toBeNull();
    expect(text('zero')).not.toMatch(/[+−]/);
  },
  'Delta.spoken': () => {
    render(<><Delta value={money(250n, 'USD')} testId="up" /><Delta value={money(-250n, 'USD')} testId="dn" /><Delta value={money(0n, 'USD')} testId="zero" /></>);
    expect(screen.getByTestId('up').querySelector('.kit-sr')?.textContent?.trim()).toBe('up');
    expect(screen.getByTestId('dn').querySelector('.kit-sr')?.textContent?.trim()).toBe('down');
    expect(screen.getByTestId('zero').querySelector('.kit-sr')?.textContent?.trim()).toBe('unchanged');
    render(<Delta value={money(250n, 'USD')} words={{ up: 'ऊपर', down: 'तल', flat: 'अपरिवर्तित' }} testId="ne" />);
    expect(screen.getByTestId('ne').querySelector('.kit-sr')?.textContent?.trim()).toBe('ऊपर');
  },
  'Delta.axe': async () => {
    const { container } = render(<><Delta value={money(250n, 'USD')} /><Delta value={-1.25} /><Delta value={0} /></>);
    expect(await seriousViolations(container)).toEqual([]);
  },

  'PriceChange.exact': () => {
    render(<PriceChange current={PAST_2_53 + 100n} previous={PAST_2_53} currency="USD" locale="en-US" display="none" showPercent={false} testId="p" />);
    expect(text('p')).toContain('+1.00');
  },
  'PriceChange.sign': () => {
    render(<><PriceChange current={1100n} previous={1000n} currency="USD" locale="en-US" testId="up" /><PriceChange current={900n} previous={1000n} currency="USD" locale="en-US" testId="dn" /></>);
    expect(screen.getByTestId('up').dataset.tone).toBe('up');
    expect(text('up')).toContain('+');
    expect(screen.getByTestId('up').querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('dn').dataset.tone).toBe('down');
    expect(text('dn')).toMatch(/[-−]/);
  },
  'PriceChange.spoken': () => {
    render(<PriceChange current={900n} previous={1000n} currency="USD" locale="en-US" display="none" showPercent={false} testId="p" />);
    const spoken = screen.getByTestId('p').querySelector('.kit-sr')?.textContent ?? '';
    expect(flat(spoken)).toContain('down');
    expect(spoken).toContain('1.00');
    expect(spoken).not.toMatch(/[-−+]/);
  },
  'PriceChange.axe': async () => {
    const { container } = render(<><PriceChange current={1100n} previous={1000n} currency="USD" /><PriceChange current={1000n} previous={1000n} currency="USD" /><PriceChange current={null} previous={null} currency="USD" /></>);
    expect(await seriousViolations(container)).toEqual([]);
  },

  'CurrencyInput.exact': async () => {
    let last: CurrencyInputChange | undefined;
    render(<Typed currency="USD" locale="en-US" onChange={(c) => { last = c; }} />);
    await userEvent.type(screen.getByRole('textbox'), '9007199254740993.00');
    expect(last?.minorUnits).toBe(900719925474099300n);
  },
  'CurrencyInput.rounding': async () => {
    const jpy = render(<Typed currency="JPY" locale="ja-JP" onChange={() => undefined} />);
    await userEvent.type(screen.getByRole('textbox'), '12.5');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('125'); // the "." is refused: yen has no decimals
    jpy.unmount();
    let last: CurrencyInputChange | undefined;
    render(<Typed currency="KWD" locale="en-US" onChange={(c) => { last = c; }} />);
    await userEvent.type(screen.getByRole('textbox'), '1.2349');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('1.234'); // a fourth digit is refused, not rounded
    expect(last?.minorUnits).toBe(1234n);
  },
  'CurrencyInput.grouping': async () => {
    render(<Typed currency="NPR" locale="en-IN" onChange={() => undefined} />);
    await userEvent.type(screen.getByRole('textbox'), '1234567');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('12,34,567');
  },
  'CurrencyInput.spoken': () => {
    render(<Typed currency="NPR" locale="en-IN" onChange={() => undefined} />);
    expect(screen.getByLabelText(/Amount/).getAttribute('id')).toBeTruthy();
    expect(flat(document.querySelector('label')?.textContent)).toBe('Amount (Nepalese Rupee)');
  },
  'CurrencyInput.axe': async () => {
    const { container } = render(<Typed currency="USD" locale="en-US" onChange={() => undefined} />);
    expect(await seriousViolations(container)).toEqual([]);
  },
};

describe('money conformance cards', () => {
  it('has a card for every money component and a vocabulary entry for every guarantee', () => {
    expect(CARDS.map((c) => c.key)).toEqual(['MoneyDisplay', 'Figure', 'Delta', 'PriceChange', 'CurrencyInput']);
    for (const card of CARDS) {
      for (const g of [...card.claims, ...card.notClaimed]) expect(GUARANTEES[g.id], `${card.key}.${g.id}`).toBeDefined();
      const ids = [...card.claims, ...card.notClaimed].map((g) => g.id);
      expect(new Set(ids).size, `${card.key} lists a guarantee twice`).toBe(ids.length);
      expect([...ids].toSorted(), `${card.key} must claim or disclaim every guarantee`).toEqual(Object.keys(GUARANTEES).toSorted());
    }
  });

  it('has no proof that no card claims', () => {
    const claimed = new Set(CARDS.flatMap((c) => c.claims.map((g) => `${c.key}.${g.id}`)));
    expect(Object.keys(proofs).filter((k) => !claimed.has(k))).toEqual([]);
  });

  for (const card of CARDS) {
    describe(`${card.key}`, () => {
      for (const claim of card.claims) {
        it(`${claim.id}: ${claim.claim}`, async () => {
          const proof = proofs[`${card.key}.${claim.id}`];
          expect(proof, `no proof for ${card.key}.${claim.id}`).toBeTypeOf('function');
          await proof!();
        });
      }
    });
  }
});
