import { useRef, useState } from 'react';
import { Button } from '@punji/ui/button';
import { FilterMenu, FilterMenuGroup, FilterMenuItem } from '@punji/ui/filter-menu';
import { FilterPopover } from '@punji/ui/range-editor';
import { Stack } from '@punji/ui/stack';

// The list behind "+ Add filter". Groups go down two columns on a wide popover and stack on a phone. A group says
// in one line why its items are off; a screen reader hears the note on each disabled item.
export default function Example() {
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(true);
  const [chosen, setChosen] = useState('Nothing chosen yet.');
  const [breakout, setBreakout] = useState(false);
  const pick = (name: string) => () => setChosen(`${name} opens its editor.`);
  return (
    <Stack>
      {/* The popover is placed against the screen, below the button when it fits. The stage keeps the room it needs, so it opens under the button instead of flipping up over the page. */}
      <div style={{ minHeight: 400 }}>
        <Button ref={opener} variant="secondary" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          Add filter
        </Button>
        <FilterPopover open={open} title="Add filter" anchor={opener} wide onClose={() => setOpen(false)}>
          <FilterMenu label="Add filter">
            <FilterMenuGroup title="Valuation">
              <FilterMenuItem on onLabel="set" onClick={pick('P/E')}>
                P/E
              </FilterMenuItem>
              <FilterMenuItem onClick={pick('P/B')}>P/B</FilterMenuItem>
              <FilterMenuItem aside="12" onClick={pick('Market cap')}>
                Market cap
              </FilterMenuItem>
            </FilterMenuGroup>
            <FilterMenuGroup title="Bank health" column={2} note="Choose only banks under Sector first.">
              <FilterMenuItem disabled onClick={pick('NPL')}>
                NPL
              </FilterMenuItem>
              <FilterMenuItem disabled onClick={pick('CAR')}>
                CAR
              </FilterMenuItem>
            </FilterMenuGroup>
            <FilterMenuGroup title="Flags" column={2}>
              <FilterMenuItem toggle on={breakout} onClick={() => setBreakout((b) => !b)}>
                Breakout
              </FilterMenuItem>
            </FilterMenuGroup>
          </FilterMenu>
        </FilterPopover>
      </div>
      <p style={{ margin: 0, fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }} role="status">
        {chosen} Breakout is {breakout ? 'on' : 'off'}.
      </p>
    </Stack>
  );
}
