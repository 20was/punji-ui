import { Card } from '@punji/ui/card';
import { CardLink } from '@punji/ui/card-link';

// Which kind it is comes from href: a path stays in the app (chevron, same tab); an http(s) address leaves
// (arrow, new tab, rel="noopener noreferrer", and the new-tab words spoken after the label).
export default function Example() {
  return (
    <div style={{ display: 'grid', gap: '16px 20px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))' }}>
      <Card title="Holdings" action={<CardLink href="#/card-link">Open portfolio</CardLink>}>
        <p>Stays in the app.</p>
      </Card>
      <Card title="Disclosures" action={<CardLink href="https://www.nepalstock.com.np">Exchange site</CardLink>}>
        <p>Leaves for another site.</p>
      </Card>
      <Card
        title="Reader's language"
        action={<CardLink href="https://www.nepalstock.com.np" newTabLabel="(नयाँ ट्याबमा खुल्छ)">बजार</CardLink>}
      >
        <p>Translated new-tab words.</p>
      </Card>
    </div>
  );
}
