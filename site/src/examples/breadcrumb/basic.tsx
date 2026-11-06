import { Breadcrumb } from '@punji/ui/breadcrumb';

// The last item is the current page: text with aria-current="page". The others are links (a router link when a
// LinkProvider is above). The nav's name is "Breadcrumb"; set labels.nav to translate it.
export default function Example() {
  return (
    <Breadcrumb
      labels={{ nav: 'Example: account path' }}
      items={[
        { label: 'Accounts', href: '#accounts' },
        { label: 'Savings', href: '#savings' },
        { label: 'Statements', href: '#statements' },
        { label: 'Kartik 2082' },
      ]}
    />
  );
}
