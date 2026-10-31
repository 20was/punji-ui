import { DepthChart } from '@punji/ui/depth-chart';
import { depthBids } from '../../sample.ts';

// Levels in any order; invalid ones are dropped; a crossed book claims no mid price.
export default function Example() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <DepthChart label="Only bids published" bids={depthBids} asks={[]} height={160} />
      <DepthChart
        label="A crossed book"
        bids={[{ price: 489, quantity: 800 }, { price: 488, quantity: 1500 }]}
        asks={[{ price: 488.5, quantity: 600 }, { price: 490, quantity: 900 }]}
        height={160}
      />
    </div>
  );
}
