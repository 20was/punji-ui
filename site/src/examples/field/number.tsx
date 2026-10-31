import { useState } from 'react';
import { NumberField, PriceField } from '@punji/ui/fields';
import { parseMinorUnits } from '@punji/ui/nepal/money';

// NumberField only asks a phone for the number keypad (inputMode); its value stays text, so parsing is yours.
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
  const [price, setPrice] = useState('487.50');
  const paisa = toPaisa(price);
  return (
    <div className="ex-stack ex-narrow">
      <NumberField integer label="Units" value={units} onChange={setUnits} hint="Whole shares only" />
      <PriceField
        label="Limit price"
        value={price}
        onChange={setPrice}
        source="NPR"
        error={paisa === null ? 'Enter a price with at most two decimals' : undefined}
        hint={paisa !== null ? `${paisa.toString()} paisa` : undefined}
      />
    </div>
  );
}
