import { Card } from '@punji/ui/card';
import { DataRow, DataRows } from '@punji/ui/rows';
import { Stack } from '@punji/ui/stack';
import { CARDS, GUARANTEES } from '../../money-lab/conformance.ts';

// One shared list drives these cards and test/money-conformance.test.tsx. A guarantee appears here as "Met" only
// if a vitest test proves it; what a component does not promise is listed too, with the reason.
export default function Example() {
  return (
    <Stack>
      {CARDS.map((card) => (
        <Card key={card.key} title={card.key} description={`${card.summary} Every "Met" line is proved by a vitest test.`} headingLevel={3} testId={`card-${card.key}`}>
          <DataRows label={`${card.key} guarantees`}>
            {card.claims.map((c) => (
              <DataRow key={c.id} label={GUARANTEES[c.id].label} value="Met" note={c.claim} />
            ))}
            {card.notClaimed.map((c) => (
              <DataRow key={c.id} label={GUARANTEES[c.id].label} value="Not claimed" note={c.reason} />
            ))}
          </DataRows>
        </Card>
      ))}
    </Stack>
  );
}
