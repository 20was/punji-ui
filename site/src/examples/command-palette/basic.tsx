import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { CommandPalette, type CommandItem, type CommandPaletteLabels } from '@punji/ui/command-palette';

const labels: CommandPaletteLabels = {
  dialog: 'Search the app',
  close: 'Close',
  move: 'Move',
  choose: 'Choose action',
  open: 'Open',
  closeKey: 'Close',
  chosen: (label) => `${label} chosen`,
  chosenMark: 'chosen',
  actionsHint: 'Left and right arrows choose an action',
};

const all: CommandItem[] = [
  { id: 'page-portfolio', group: 'pages', groupLabel: 'Pages', title: 'Portfolio', hint: 'Account', actions: [{ id: 'open', label: 'Open' }] },
  { id: 'page-alerts', group: 'pages', groupLabel: 'Pages', title: 'Alerts', hint: 'Account', actions: [{ id: 'open', label: 'Open' }] },
  { id: 'page-export', group: 'pages', groupLabel: 'Pages', title: 'Export holdings', hint: 'Tools', actions: [{ id: 'run', label: 'Run' }] },
  { id: 'docs', group: 'help', groupLabel: 'Help', title: 'Documentation', kind: 'external', actions: [{ id: 'open', label: 'Open' }] },
];

// You mount it when it is open and unmount it when it closes; it focuses the field and gives focus back.
// You filter the items: the palette only draws and navigates them.
export default function Example() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [ran, setRan] = useState('');
  const items = all.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="ex-stack">
      <div className="ex-row">
        <Button variant="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog">
          Search…
        </Button>
        <span role="status" className="doc-muted">
          {ran ? `Ran: ${ran}` : 'Nothing run yet'}
        </span>
      </div>
      {open && (
        <CommandPalette
          labels={labels}
          placeholder="Search pages and actions"
          query={query}
          onQuery={setQuery}
          items={items}
          empty={<>Nothing matches “{query}”. Try a page name.</>}
          onRun={(item, action) => {
            setRan(`${action.label} ${item.title}`);
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
