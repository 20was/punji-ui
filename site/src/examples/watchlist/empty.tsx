import { Watchlist } from '@punji/ui/watchlist';
import { Button } from '@punji/ui/button';

export default function Example() {
  return (
    <Watchlist
      quotes={[]}
      label="My watchlist"
      emptyTitle="Nothing on your watchlist yet"
      emptyBody="Follow a company to see its price here."
      emptyAction={<Button size="sm">Find a company</Button>}
    />
  );
}
