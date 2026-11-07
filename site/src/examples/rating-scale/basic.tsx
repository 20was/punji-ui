import { RatingChip } from '@punji/ui/rating-chip';
import { RatingScale } from '@punji/ui/rating-scale';
import { Stack } from '@punji/ui/stack';

const words = ['Sell', 'Underweight', 'Hold', 'Overweight', 'Buy'];

// Amber on the low side, grey in the middle, blue on the high side: never green or red, and the word is always printed.
export default function Example() {
  return (
    <Stack gap={4}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {words.map((word, step) => <RatingChip key={word} step={step}>{word}</RatingChip>)}
        <RatingChip step={null}>Not rated</RatingChip>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        <span>Overweight, up from Underweight</span>
        <RatingScale value={3} from={1} label="Overweight, up from Underweight" />
      </div>
      <RatingScale legend={['Low', 'Medium', 'High']} label="Risk" size="lg" />
      <RatingScale legend={words} label="Analyst rating" />
    </Stack>
  );
}
