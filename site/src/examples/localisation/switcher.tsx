import { useState } from 'react';
import { SegmentedControl } from '@punji/ui/controls';
import { PunjiLocaleProvider, type PunjiLocalePack } from '@punji/ui/locale';
import { bn } from '@punji/ui/locale/bn';
import { hi } from '@punji/ui/locale/hi';
import { ne } from '@punji/ui/locale/ne';
import { Pagination } from '@punji/ui/pagination';
import { Stack } from '@punji/ui/stack';
import { TransferReview } from '@punji/ui/transfer-review';

type Lang = 'en' | 'ne' | 'hi' | 'bn';
const PACKS: Record<Lang, PunjiLocalePack | undefined> = { en: undefined, ne, hi, bn };
const options: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' }, { value: 'ne', label: 'नेपाली' }, { value: 'hi', label: 'हिन्दी' }, { value: 'bn', label: 'বাংলা' },
];
const MONEY: Record<Lang, { currency: string; locale: string }> = {
  en: { currency: 'NPR', locale: 'en-IN' }, ne: { currency: 'NPR', locale: 'ne-NP' }, hi: { currency: 'INR', locale: 'hi-IN' }, bn: { currency: 'BDT', locale: 'bn-BD' },
};

// The packs are machine-drafted and need a native speaker's review before customers see them.
export default function Example() {
  const [lang, setLang] = useState<Lang>('ne');
  const [page, setPage] = useState(1);
  return (
    <Stack>
      <SegmentedControl<Lang> label="Language" prefix="loc" value={lang} onChange={setLang} options={options} />
      <div lang={lang}>
        <PunjiLocaleProvider locale={PACKS[lang]}>
          <Stack>
            <TransferReview
              amount={12345650n} currency={MONEY[lang].currency} money={{ locale: MONEY[lang].locale }} fee={1000n}
              recipient={{ name: 'Sita Sharma', account: '•••• 4821' }} onConfirm={() => {}} onEdit={() => {}}
            />
            <Pagination label="Pages" page={page} total={45} pageSize={10} onPageChange={setPage} />
          </Stack>
        </PunjiLocaleProvider>
      </div>
    </Stack>
  );
}
