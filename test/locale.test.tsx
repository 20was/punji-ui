import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { calendarLabels } from '../src/calendar/labels.ts';
import {
  HoldToConfirm, IbanInput, Pagination, PayeeVerification, PunjiLocaleProvider, ScamWarning, SCAM_SCENARIOS, SecureField,
  TransferReview, localAmountInWords, mergeMessages, type PunjiLocalePack, type PunjiMessages,
} from '../src/index.ts';
import { bn } from '../src/locale/bn.ts';
import { hi } from '../src/locale/hi.ts';
import { ne } from '../src/locale/ne.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

const PACKS: readonly PunjiLocalePack[] = [ne, hi, bn];

/** Every key path in a catalogue (functions and arrays are leaves). */
function paths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => paths(child, prefix ? `${prefix}.${key}` : key)).toSorted();
}

const keys = (pack: PunjiLocalePack) => paths(pack.messages).filter((key) => !key.startsWith('amountWords.currencies.'));

describe('message packs', () => {
  it('are marked machine-drafted and never claim a native review', () => {
    for (const pack of PACKS) expect(pack.review).toBe('machine-drafted');
  });

  it('fill the same keys in every language', () => {
    // Currency names differ by market (BDT in Bengali, INR in Hindi); everything else must match.
    expect(keys(hi)).toEqual(keys(ne));
    expect(keys(bn)).toEqual(keys(ne));
  });

  it('cover every scam scenario, every calendar label and 100 number words', () => {
    for (const pack of PACKS) {
      expect(Object.keys(pack.messages.scamWarning!.scenarios!).toSorted()).toEqual(Object.keys(SCAM_SCENARIOS).toSorted());
      expect(Object.keys(pack.messages.calendar!).toSorted()).toEqual(Object.keys(calendarLabels.en).toSorted());
      expect(pack.messages.amountWords!.numbers).toHaveLength(100);
      expect(new Set(pack.messages.amountWords!.numbers).size).toBe(100);
      for (const text of paths(pack.messages)) expect(text).not.toMatch(/undefined/);
    }
  });

  it('reads amounts in words in Nepali, Hindi and Bengali', () => {
    expect(localAmountInWords(12345650n, 'NPR', ne.messages.amountWords!)).toBe('एक लाख तेइस हजार चार सय छपन्न रुपैयाँ पचास पैसा मात्र');
    expect(localAmountInWords(12345650n, 'INR', hi.messages.amountWords!)).toBe('एक लाख तेईस हज़ार चार सौ छप्पन रुपये पचास पैसे मात्र');
    expect(localAmountInWords(12345650n, 'BDT', bn.messages.amountWords!)).toBe('এক লাখ তেইশ হাজার চার শত ছাপ্পান্ন টাকা পঞ্চাশ পয়সা মাত্র');
    expect(localAmountInWords(-500n, 'INR', hi.messages.amountWords!)).toBe('ऋण पाँच रुपये मात्र');
    expect(localAmountInWords(150n, 'JPY', hi.messages.amountWords!, { scale: 0 })).toBe('एक सौ पचास JPY मात्र');
  });

  it('merge namespace by namespace', () => {
    const merged = mergeMessages(ne.messages, { transferReview: { confirm: 'पठाउनुहोस्' } });
    expect(merged.transferReview?.confirm).toBe('पठाउनुहोस्');
    expect(merged.transferReview?.edit).toBe(ne.messages.transferReview?.edit);
  });

  it('are assignable to the components\' own label props without the provider', () => {
    const messages: PunjiMessages = hi.messages;
    render(<SecureField label="पासवर्ड" kind="current-password" value="" onChange={() => {}} labels={messages.secureField} />);
    expect(screen.getByRole('button', { name: 'दिखाएँ' })).toBeTruthy();
  });
});

function PagedTable() {
  const [page, setPage] = useState(1);
  return <Pagination label="पृष्ठहरू" page={page} total={30} pageSize={10} onPageChange={setPage} />;
}

describe('PunjiLocaleProvider', () => {
  it('localises the trust kit, amount in words and spoofing messages', async () => {
    const { container } = render(
      <PunjiLocaleProvider locale={ne}>
        <TransferReview amount={50000000n} currency="NPR" money={{ locale: 'ne-NP' }} recipient={{ name: 'Pаypal' }} knownPayees={['Paypal']} onConfirm={() => {}} />
      </PunjiLocaleProvider>,
    );
    expect(screen.getByRole('heading', { name: 'पठाउनुअघि जाँच गर्नुहोस्' })).toBeTruthy();
    expect(container.textContent).toContain('पाँच लाख रुपैयाँ मात्र');
    expect(container.textContent).toContain('यो "Paypal" जस्तै देखिन्छ तर फरक नाम हो।');
    expect(screen.getByRole('button', { name: 'पुष्टि गरी पठाउनुहोस्' })).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('lets a component\'s own labels win over the pack, and falls back to English for missing keys', () => {
    render(
      <PunjiLocaleProvider locale={hi} messages={{ holdToConfirm: { holdHint: undefined } }}>
        <PayeeVerification result="match" enteredName="Ram" labels={{ match: 'Custom match' }} />
        <HoldToConfirm onConfirm={() => {}} labels={{ done: 'OK' }}>Send</HoldToConfirm>
      </PunjiLocaleProvider>,
    );
    expect(screen.getByText('Custom match')).toBeTruthy();
    expect(screen.getByText('आपने लिखा')).toBeTruthy();
  });

  it('localises scam copy, pagination and payment field messages', async () => {
    const { container } = render(
      <PunjiLocaleProvider locale={bn}>
        <ScamWarning scenario="safe-account" onCancel={() => {}} />
        <PagedTable />
        <IbanInput label="IBAN" value="DE89" onValueChange={() => {}} />
      </PunjiLocaleProvider>,
    );
    expect(container.textContent).toContain(bn.messages.scamWarning!.scenarios!['safe-account']!.summary);
    expect(screen.getByRole('button', { name: 'পরের পৃষ্ঠা' })).toBeTruthy();
    await userEvent.click(screen.getByLabelText('IBAN'));
    await userEvent.tab();
    expect(container.querySelector('.err')?.textContent).toBe('পুরো IBAN লিখুন।');
  });

  it('changes nothing without a provider', () => {
    render(<Pagination label="Pages" page={1} total={30} pageSize={10} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeTruthy();
  });
});
