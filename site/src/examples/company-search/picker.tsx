import { useState } from 'react';
import { CompanySearch } from '@punji/ui/company-search';
import { symbols } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

// A picker: pass `value`. The field shows the pick and its name until it is clicked or focused.
export default function Example() {
  const [symbol, setSymbol] = useState<string | null>('NABIL');
  return (
    <Stack>
      <CompanySearch
        options={symbols}
        label="Stock"
        placeholder="Symbol or name"
        value={symbol}
        onOpen={setSymbol}
        meta="Rs 487.50"
        none={(q) => `No company matches “${q}”.`}
        testId="picker"
        optionTestId="picker-option"
        valueTestId="picker-value"
        size="md"
        shortcut={null}
      />
      <CompanySearch
        options={symbols}
        label="Stock (fixed)"
        placeholder="Symbol or name"
        value="NTC"
        readOnly
        onOpen={() => {}}
        none={(q) => `No company matches “${q}”.`}
        testId="picker-fixed"
        optionTestId="picker-fixed-option"
        size="md"
        shortcut={null}
      />
    </Stack>
  );
}
