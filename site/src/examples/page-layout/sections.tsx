import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { ListSectionHeader } from '@punji/ui/layout';

// A section title with one action or a quiet detail. level 3 sits under an h2; caption and size="sm" are for inside a card.
export default function Example() {
  return (
    <div className="ex-stack">
      <ListSectionHeader title="Holdings" action={<Button variant="ghost" size="sm">See all</Button>} />
      <ListSectionHeader title="Watchlist" detail="12 stocks" />
      <Card title="Dividends">
        <ListSectionHeader level={3} size="sm" title="Paid this year" detail="Rs 3,120" />
        <ListSectionHeader level={3} caption title="Upcoming" />
      </Card>
    </div>
  );
}
