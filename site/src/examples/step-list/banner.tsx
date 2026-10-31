import { useState } from 'react';
import { StepList } from '@punji/ui/step-list';
import { Button } from '@punji/ui/button';
import { Stack } from '@punji/ui/stack';

// Banner: one band over a tool on a first visit. The page remembers the dismissal (here, local state).
export default function Example() {
  const [shown, setShown] = useState(true);
  return (
    <Stack>
      {shown ? (
        <StepList
          layout="banner"
          title="First visit"
          current={1}
          steps={[{ title: 'Pick a stock' }, { title: 'Read the chart' }, { title: 'Set an alert' }]}
          onDismiss={() => setShown(false)}
          dismissLabel="Dismiss the guide"
        />
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setShown(true)}>Show the guide again</Button>
      )}
    </Stack>
  );
}
