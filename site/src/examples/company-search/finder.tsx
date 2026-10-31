import { useState } from 'react';
import { CompanySearch } from '@punji/ui/company-search';
import { holdings, symbols } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

const sectorOf = new Map(holdings.map((h) => [h.symbol, h.qty > 100 ? 'Large position' : 'Small position']));

export default function Example() {
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <Stack style={{ minHeight: 360 }}>
      <CompanySearch
        options={symbols}
        label="Find any company"
        placeholder="Symbol or name"
        onOpen={setOpened}
        sub={(o) => `${o.name} · ${sectorOf.get(o.symbol)}`}
        none={(q) => `No company matches “${q}”.`}
        testId="finder"
        optionTestId="finder-option"
        size="md"
        initialQuery="n"
      />
      <p>{opened ? `Opened ${opened}.` : 'Choose a suggestion to open it.'}</p>
    </Stack>
  );
}
