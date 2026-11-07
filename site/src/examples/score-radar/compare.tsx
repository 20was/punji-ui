import { useState } from 'react';
import { ScoreRadar } from '@punji/ui/score-radar';

export default function Example() {
  const [axis, setAxis] = useState<string | null>('health');
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <ScoreRadar
        label="Company against its sector"
        labels={{ comparison: 'Sector average' }}
        selected={axis}
        onSelectedChange={setAxis}
        axes={[
          { key: 'value', label: 'Value', score: 2, comparison: 3 },
          { key: 'growth', label: 'Future growth', score: 4, comparison: 4 },
          { key: 'past', label: 'Past performance', score: 5, comparison: 3 },
          { key: 'health', label: 'Financial health', score: 6, comparison: 4 },
          { key: 'income', label: 'Dividends', score: 1, comparison: 2 },
          { key: 'moat', label: 'Competitive position', score: 3, comparison: 3 },
        ]}
      />
      <p style={{ margin: 0 }}>{axis ? `Selected: ${axis}. Press Enter or Space on the chart, or click an axis, to change it.` : 'No axis selected.'}</p>
    </div>
  );
}
