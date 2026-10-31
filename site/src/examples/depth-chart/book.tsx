import { DepthChart } from '@punji/ui/depth-chart';
import { depthAsks, depthBids } from '../../sample.ts';

export default function Example() {
  return <DepthChart label="NABIL order book depth" bids={depthBids} asks={depthAsks} />;
}
