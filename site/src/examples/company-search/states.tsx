import { CompanySearch } from '@punji/ui/company-search';
import { symbols } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

const common = {
  options: symbols,
  placeholder: 'Symbol or name',
  onOpen: () => {},
  none: (q: string) => `No company matches “${q}”.`,
  size: 'md' as const,
  shortcut: null,
};

export default function Example() {
  return (
    <Stack>
      <CompanySearch {...common} label="Loading the list" loading initialQuery="na" testId="s-loading" optionTestId="s-loading-o" />
      <CompanySearch {...common} label="No match" initialQuery="zzz" testId="s-none" optionTestId="s-none-o" />
      <CompanySearch {...common} label="With an error" error="Choose a company from the list." testId="s-error" optionTestId="s-error-o" />
    </Stack>
  );
}
