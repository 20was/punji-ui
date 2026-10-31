import { useState } from 'react';
import { CheckList, CheckRow } from '@punji/ui/check-row';
import { StateGlyph } from '@punji/ui/inline-state';
import { Sparkline } from '@punji/ui/sparkline';
import { Button } from '@punji/ui/button';
import { sampleCloses } from '../../sample.ts';

// Status is words plus tone, never colour alone. A row with onClick is a button (pressed while its detail shows).
export default function Example() {
  const [open, setOpen] = useState<string | null>('concentration');
  return (
    <CheckList label="Portfolio checks">
      <CheckRow
        icon={<StateGlyph name="info" size={18} />}
        tone="warn"
        title="Concentration"
        line="Banking is 46% of holdings"
        trail={<Sparkline values={sampleCloses(46, 2)} tone="chart" />}
        figure="46%"
        figureSub="+3.1% this month"
        figureSubTone="gain"
        status={{ label: 'Watch', tone: 'warn' }}
        onClick={() => setOpen(open === 'concentration' ? null : 'concentration')}
        pressed={open === 'concentration'}
      />
      <CheckRow
        icon={<StateGlyph name="check" size={18} />}
        tone="gain"
        title="Diversification"
        line="Five sectors, none under 5%"
        figure="5"
        status={{ label: 'OK', tone: 'gain' }}
        href="#/check-list"
      />
      <CheckRow
        icon={<StateGlyph name="error" size={18} />}
        tone="loss"
        title="Cash buffer"
        line="Below your minimum"
        figure="Rs 4,200"
        figureSub="-Rs 5,800 vs minimum"
        figureSubTone="loss"
        status={{ label: 'Below minimum', tone: 'loss' }}
      />
      <CheckRow
        kind="report"
        icon={<StateGlyph name="chart" size={18} />}
        tone="neutral"
        title="Annual statement"
        line="Holdings and dividends for 2081/82"
        href="#/check-list"
      />
      <CheckRow
        icon={<StateGlyph name="star" size={18} />}
        tone="info"
        title="Add a holding"
        line="Search for a company to follow it"
        action={<Button size="sm" variant="secondary">Add</Button>}
      />
    </CheckList>
  );
}
