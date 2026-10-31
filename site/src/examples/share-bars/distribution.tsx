import { DistributionBar, type DistributionItem, type ScaleStep } from '@punji/ui/meter';
import { ratingCounts } from '../../sample.ts';

const items: DistributionItem[] = ratingCounts.map((r) => ({ key: r.key, label: r.label, count: r.count, step: r.step as ScaleStep }));

// Counts on a five-step scale, highest step first in the legend. `foot` says what the bar leaves out.
export default function Example() {
  return (
    <DistributionBar
      items={items}
      label="Ratings: 18 strong, 42 good, 63 fair, 27 weak, 9 poor"
      foot="21 low confidence and 12 not rated are left out."
    />
  );
}
