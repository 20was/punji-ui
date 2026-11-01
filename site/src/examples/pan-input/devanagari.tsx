import { useState } from 'react';
import { PanInput } from '@punji/ui/pan-input';

// digits="deva" shows the number in Devanagari; the value you store stays ASCII. Messages are translated with `labels`.
export default function Example() {
  const [pan, setPan] = useState('301234567');
  return (
    <div className="ex-stack ex-narrow">
      <PanInput
        label="स्थायी लेखा नम्बर"
        hint="९ अङ्क"
        digits="deva"
        value={pan}
        onValueChange={(check) => setPan(check.value)}
        labels={{ short: 'सबै ९ अङ्क लेख्नुहोस्।', characters: 'अङ्क मात्र लेख्नुहोस्।', long: 'नम्बरमा ९ अङ्क हुन्छन्।', complete: '९ अङ्क पूरा' }}
      />
      <p className="doc-muted">Stored value: <code>{pan}</code></p>
    </div>
  );
}
