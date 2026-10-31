import { useState } from 'react';
import { Skeleton, SkeletonText } from '@punji/ui/states';
import { HeadlineFigure } from '@punji/ui/summary-figure';
import { Button } from '@punji/ui/button';
import { Cluster, Stack } from '@punji/ui/stack';

// Hold the space of what is loading, in its shape, so nothing jumps. One `label` for the whole region, not every block.
export default function Example() {
  const [loading, setLoading] = useState(true);
  return (
    <Stack>
      <Cluster>
        <Button size="sm" variant="secondary" onClick={() => setLoading((l) => !l)}>
          {loading ? 'Show loaded' : 'Show loading'}
        </Button>
      </Cluster>
      {loading ? (
        <Stack>
          <Skeleton width="40%" height={44} label="Loading your portfolio" />
          <SkeletonText lines={3} />
          <Cluster>
            <Skeleton circle width={40} height={40} />
            <Skeleton width={160} height={16} />
            <Skeleton still width={120} height={16} />
          </Cluster>
        </Stack>
      ) : (
        <Stack>
          <HeadlineFigure label="Worth now" currency="Rs" value="12,48,000" />
          <p>Across 14 holdings, after the 14 Nov close. Prices are synthetic.</p>
        </Stack>
      )}
    </Stack>
  );
}
