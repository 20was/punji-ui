import { FactList } from '@punji/ui/fact-list';
import { Stack } from '@punji/ui/stack';

// `quiet` marks a value that is a note, not a figure. `stack` puts every value under its label (a phone).
export default function Example() {
  return (
    <Stack>
      <FactList
        title="Across every month"
        facts={[
          { label: 'Best month', value: '+8.2%' },
          { label: 'Worst month', value: '-5.9%' },
          { label: 'Average month', value: '+0.7%' },
          { label: 'Five-year return', value: 'Need 5 years', quiet: true },
        ]}
      />
      <FactList
        stack
        title="Stacked"
        facts={[
          { label: 'Registered office', value: 'Durbar Marg, Kathmandu, Bagmati Province' },
          { label: 'Listed', value: '2051 BS' },
        ]}
      />
    </Stack>
  );
}
