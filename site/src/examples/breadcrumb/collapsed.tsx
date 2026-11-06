import { Breadcrumb } from '@punji/ui/breadcrumb';

// maxItems={3} keeps the first level, the current page and a "..." menu of the levels between. Pass it from your own
// width check (a media query) on phones.
export default function Example() {
  return (
    <Breadcrumb
      maxItems={3}
      labels={{ nav: 'Example: collapsed account path' }}
      items={[
        { label: 'Accounts', href: '#accounts' },
        { label: 'Savings', href: '#savings' },
        { label: 'Joint account', href: '#joint' },
        { label: 'Statements', href: '#statements' },
        { label: 'Kartik 2082' },
      ]}
    />
  );
}
