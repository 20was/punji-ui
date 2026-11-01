import { useState } from 'react';
import { FilterChip } from '@punji/ui/filter-chip';
import { Button } from '@punji/ui/button';
import { Cluster, Stack } from '@punji/ui/stack';

// FilterChip shows one filter that is set, in words. The chip opens its editor (onOpen); the x removes it.
// A chip with a caret and no x (Sector) opens a list. Here the editor is a line of text; yours is a Popover or a Sheet.
export default function Example() {
  const [pb, setPb] = useState(true);
  const [dividend, setDividend] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const toggle = (name: string) => setEditing((e) => (e === name ? null : name));
  return (
    <Stack>
      <Cluster role="group" aria-label="Screener filters">
        <FilterChip label="Sector" value="Banking" caret openPrefix="Choose" expanded={editing === 'sector'} onOpen={() => toggle('sector')} testId="f-sector" />
        {pb && (
          <FilterChip
            label="P/B"
            value="0.00 to 1.20"
            openPrefix="Edit"
            removeLabel="Remove P/B"
            expanded={editing === 'pb'}
            onOpen={() => toggle('pb')}
            onRemove={() => setPb(false)}
            testId="f-pb"
          />
        )}
        {dividend && <FilterChip label="Pays dividend" removeLabel="Remove Pays dividend" onRemove={() => setDividend(false)} testId="f-div" />}
        <FilterChip label="EPS" value="above 40" error openPrefix="Edit" removeLabel="Remove EPS" onOpen={() => toggle('eps')} onRemove={() => {}} expanded={editing === 'eps'} testId="f-eps" />
      </Cluster>
      <p style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }} role="status">
        {editing === 'eps' ? 'EPS is a ratio, not a percent: enter 40, not 40%.' : editing ? `Editing ${editing}.` : 'Press a chip to edit it, or its x to remove it.'}
      </p>
      {(!pb || !dividend) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setPb(true);
            setDividend(true);
          }}
        >
          Restore filters
        </Button>
      )}
    </Stack>
  );
}
