import { ScoreRadar } from '@punji/ui/score-radar';

// The scores come from your app: this component only draws them.
export default function Example() {
  return (
    <ScoreRadar
      label="Company scores"
      max={6}
      axes={[
        { key: 'value', label: 'Value', score: 2 },
        { key: 'growth', label: 'Future growth', score: 4 },
        { key: 'past', label: 'Past performance', score: 5 },
        { key: 'health', label: 'Financial health', score: 6 },
        { key: 'income', label: 'Dividends', score: 4 },
      ]}
    />
  );
}
