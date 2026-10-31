import { useState } from 'react';
import { HeadlineFigure, FigureChip } from '@punji/ui/summary-figure';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { Button } from '@punji/ui/button';
import { Stack } from '@punji/ui/stack';

const preset = nepalMoneyConfig();

export default function Example() {
  const [hidden, setHidden] = useState(false);
  return (
    <Stack>
      <HeadlineFigure
        size="lg"
        label="Total return"
        labelAction={
          <Button size="sm" variant="ghost" onClick={() => setHidden((h) => !h)} aria-pressed={hidden}>
            {hidden ? 'Show amounts' : 'Hide amounts'}
          </Button>
        }
        value={hidden ? 'Hidden' : <MoneyDisplay value={26_800_000n} preset={preset} />}
        aside={<FigureChip tone="up">+27.3% on cost</FigureChip>}
      />
      <HeadlineFigure label="Realised loss" value={<MoneyDisplay value={-1_250_000n} preset={preset} />}>
        <FigureChip tone="down" srLabel="Loss">
          Rs 12,500
        </FigureChip>
      </HeadlineFigure>
    </Stack>
  );
}
