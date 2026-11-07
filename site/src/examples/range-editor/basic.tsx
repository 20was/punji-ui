import { useRef, useState } from 'react';
import { Button } from '@punji/ui/button';
import { FilterPopover, RangeEditor } from '@punji/ui/range-editor';
import { Stack } from '@punji/ui/stack';

// Where 40 invented stocks sit on price to earnings, in six buckets of 10. The page hands the chart in; with
// @punji/ui/histogram this is <Histogram counts={...} kept={...} />. Here it is six plain bars.
const COUNTS = [3, 9, 14, 8, 4, 2];
const bucket = (i: number) => ({ from: i * 10, to: (i + 1) * 10 });

function Bars({ from, to }: { from: string; to: string }) {
  const lo = from === '' ? 0 : Number(from);
  const hi = to === '' ? 60 : Number(to);
  const max = Math.max(...COUNTS);
  return (
    <div role="img" aria-label="Stocks by P/E, in buckets of 10 from 0 to 60. The kept buckets are filled." style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
      {COUNTS.map((c, i) => {
        const b = bucket(i);
        const kept = b.to > lo && b.from < hi;
        return <span key={i} style={{ flex: 1, height: `${(c / max) * 100}%`, borderRadius: 3, background: kept ? 'var(--pu-color-accent-fill)' : 'var(--pu-color-surface-tint)' }} />;
      })}
    </div>
  );
}

// A range filter in its popover: what the measure is, where the set sits, quick ranges, a slider, From and To, and
// the result on the one action. Nothing applies until it is pressed. The ends are exact decimal strings.
export default function Example() {
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<[string, string]>(['', '']);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const crossed = from !== '' && to !== '' && Number(from) > Number(to);
  const kept = COUNTS.reduce((n, c, i) => n + (bucket(i).to > (from === '' ? 0 : Number(from)) && bucket(i).from < (to === '' ? 60 : Number(to)) ? c : 0), 0);
  return (
    <Stack>
      <div>
        <Button ref={opener} variant="secondary" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} testId="open-pe">
          P/E
        </Button>
        <FilterPopover open={open} title="Price to earnings" anchor={opener} wide onClose={(refocus) => (setOpen(false), refocus && opener.current?.focus())}>
          <RangeEditor
            why="Price over earnings per share. Lower means cheaper for each rupee earned."
            chartTitle="Where the market sits"
            chart={<Bars from={from} to={to} />}
            presets={[
              { id: 'cheap', label: 'Under 10', from: '', to: '10' },
              { id: 'fair', label: '10 to 25', from: '10', to: '25' },
            ]}
            track={{ min: '0', max: '60', step: '1' }}
            from={from}
            to={to}
            onFrom={setFrom}
            onTo={setTo}
            error={crossed ? 'To must be at least From.' : undefined}
            onClear={() => (setFrom(''), setTo(''))}
            applyLabel={kept === 0 ? 'No stock fits' : `Show ${kept} stocks`}
            onApply={() => (setApplied([from, to]), setOpen(false))}
            testIdPrefix="pe"
          />
        </FilterPopover>
      </div>
      <p style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }} role="status">
        {applied[0] === '' && applied[1] === '' ? 'No limit on P/E.' : `P/E from ${applied[0] || 'no limit'} to ${applied[1] || 'no limit'}.`}
      </p>
    </Stack>
  );
}
