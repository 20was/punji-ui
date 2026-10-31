import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Delta, Figure } from '@punji/ui/figures';
import { GroupedCell, RowList, Tile, ValueRow } from '@punji/ui/rows';
import { StatusPill } from '@punji/ui/status-pill';
import { Stack } from '@punji/ui/stack';

// GroupedCell is the one card; rows never carry their own. ValueRow is a link (href), a button (onClick) or plain.
export default function Example() {
  const [last, setLast] = useState('');
  return (
    <Stack>
      <GroupedCell label="Holdings">
        <RowList label="Holdings">
          <ValueRow lead={<Tile text="NABIL" />} symbol="NABIL" name="Nabil Bank Limited" line="120 shares" figure={<Figure value={58500} kind="rs" />} note={<Delta value={1.25} />} href="#nabil" chevron />
          <ValueRow lead={<Tile text="NTC" />} symbol="NTC" name="Nepal Telecom" line="40 shares" pill={<StatusPill size="sm" tone="highlight">Bonus</StatusPill>} figure={<Figure value={33680} kind="rs" />} note={<Delta value={-0.47} />} onClick={() => setLast('NTC')} chevron />
          <ValueRow
            lead={<Tile text="HDL" />}
            symbol="HDL"
            name="Himalayan Distillery Limited"
            line="25 shares"
            figure={<Figure value={53750} kind="rs" />}
            note={<Delta value={2.31} />}
            action={
              <Button variant="ghost" size="sm" iconOnly label="Remove HDL" onClick={() => setLast('remove HDL')}>
                ×
              </Button>
            }
          />
        </RowList>
      </GroupedCell>
      <p role="status" className="doc-muted">
        {last ? `Pressed: ${last}` : 'Rows with a link or a button are focusable; the last row only shows data.'}
      </p>
    </Stack>
  );
}
