import { Button } from '@punji/ui/button';
import { OutlineTile, PromptCard } from '@punji/ui/prompt-card';

// The one thing to do on an empty page, and dashed outlines of what will show once there is data. The tiles hold no figures.
export default function Example() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PromptCard
        eyebrow="Watchlist"
        title="Add your first stock"
        body="Follow the shares you care about and see their price and change here."
        actions={
          <>
            <Button>Add a stock</Button>
            <Button variant="secondary">Import a list</Button>
          </>
        }
      />
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <OutlineTile title="Price and change" body="Shown once you add a stock." drawing={<path d="M4 46 L50 30 L90 38 L140 16 L196 8" />} />
        <OutlineTile title="Alerts" body="Set one on a price you care about." drawing={<><circle cx="100" cy="30" r="16" /><path d="M100 22v9l6 4" /></>} />
      </div>
    </div>
  );
}
