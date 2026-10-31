import { StepList } from '@punji/ui/step-list';
import { Stack } from '@punji/ui/stack';

const steps = [
  { title: 'Add a holding', body: 'Search for NABIL' },
  { title: 'Set an alert', body: 'Hear when a price crosses your level' },
  { title: 'Review your sectors' },
];

// `current` is 0-based and gets aria-current="step"; -1 for none.
export default function Example() {
  return (
    <Stack>
      <StepList title="Start with your first holding" eyebrow="New here" lead="Three steps and you are set." current={0} steps={steps} foot="You can come back to this any time." />
      <StepList title="Questions to read by" layout="rows" tone="plain" headingLevel={3} current={-1} steps={steps} />
    </Stack>
  );
}
