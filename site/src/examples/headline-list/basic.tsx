import { Card } from '@punji/ui/card';
import { HeadlineList } from '@punji/ui/headline-list';

// A headline with an http(s) address opens another site in a new tab and says so; one without is plain text.
export default function Example() {
  return (
    <Card title="NABIL in the news" headingLevel={3}>
      <HeadlineList
        label="Latest headlines"
        items={[
          { key: 'div', title: 'NABIL proposes a 12% cash dividend for the fiscal year and a book closure on 18 Oct, subject to approval at the annual general meeting', line: 'Company filing · 2 days ago', href: 'https://example.com/nabil-dividend' },
          { key: 'agm', title: 'Annual general meeting on Sunday', line: 'NEPSE notice · 3 days ago' },
          { key: 'rate', title: 'Interest rates on fixed deposits unchanged this quarter', line: 'Press release · 6 days ago', href: 'https://example.com/rates' },
        ]}
      />
    </Card>
  );
}
