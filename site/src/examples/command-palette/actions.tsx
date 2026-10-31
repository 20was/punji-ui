import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { CommandPalette, type CommandItem, type CommandPaletteLabels } from '@punji/ui/command-palette';
import { symbols } from '../../sample.ts';

const labels: CommandPaletteLabels = {
  dialog: 'Find a company',
  close: 'Close',
  move: 'Move',
  choose: 'Choose action',
  open: 'Run',
  closeKey: 'Close',
  chosen: (label) => `${label} chosen`,
  chosenMark: 'chosen',
  actionsHint: 'Left and right arrows choose an action',
};

// kind "entity": a symbol and a name; the row's actions appear as chips when it is the chosen row.
// Enter runs the first action; the left and right arrows move between chips wherever the caret is.
const toItem = (o: { symbol: string; name: string }): CommandItem => ({
  id: o.symbol,
  group: 'companies',
  groupLabel: 'Companies',
  title: o.symbol,
  sub: o.name,
  kind: 'entity',
  actions: [
    { id: 'open', label: 'Open' },
    { id: 'watch', label: 'Watch' },
    { id: 'alert', label: 'Alert' },
  ],
});

export default function Example() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [ran, setRan] = useState('');
  const q = query.trim().toLowerCase();
  const items = symbols.filter((o) => !q || `${o.symbol} ${o.name}`.toLowerCase().includes(q)).slice(0, 6).map(toItem);
  return (
    <div className="ex-row">
      <Button variant="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog">
        Find a company
      </Button>
      <span role="status" className="doc-muted">
        {ran || 'Nothing run yet'}
      </span>
      {open && (
        <CommandPalette
          labels={labels}
          placeholder="Symbol or name"
          autoCapitalize="characters"
          query={query}
          onQuery={setQuery}
          items={items}
          onRun={(item, action) => {
            setRan(`${action.label}: ${item.title}`);
            setOpen(false);
            setQuery('');
          }}
          onClose={() => {
            setOpen(false);
            setQuery('');
          }}
        />
      )}
    </div>
  );
}
