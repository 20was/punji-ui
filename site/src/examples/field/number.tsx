import { useState } from 'react';
import { NumberField, PriceField } from '@punji/ui/fields';
import { parseMinorUnits } from '@punji/ui/nepal/money';
import { Stack } from '@punji/ui/stack';

// NumberField keeps the text as typed and, through onValueChange, reports it parsed: "१,२०,०००" arrives as "120000".
// For money, parse to exact minor units instead of Number(): parseMinorUnits throws rather than rounding silently.
function toPaisa(text: string): bigint | null {
  try {
    return parseMinorUnits(text, 2);
  } catch {
    return null;
  }
}

export default function Example() {
  const [units, setUnits] = useState('120');
  const [parsed, setParsed] = useState('120');
  const [price, setPrice] = useState('487.50');
  const paisa = toPaisa(price);
  return (
    <Stack style={{ width: 'min(100%, 440px)', marginInline: 'auto' }}>
      <NumberField
        integer
        label="Units"
        value={units}
        onChange={setUnits}
        onValueChange={(r) => setParsed(r.state === 'valid' ? r.value : '')}
        hint={parsed ? `${parsed} shares` : 'Whole shares only'}
      />
      <PriceField
        label="Limit price"
        value={price}
        onChange={setPrice}
        source="NPR"
        error={paisa === null ? 'Enter a price with at most two decimals' : undefined}
        hint={paisa !== null ? `${paisa.toString()} paisa` : undefined}
      />
    </Stack>
  );
}
