import { useState } from 'react';
import { MenuButton } from '@punji/ui/menu';

// Checkbox and radio items for view options. You keep the state; the menu closes after each choice.
export default function Example() {
  const [zero, setZero] = useState(false);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  return (
    <MenuButton
      label="View options"
      items={[
        { id: 'zero', type: 'checkbox', label: 'Show zero balances', checked: zero, onCheckedChange: setZero },
        { id: 'sep', type: 'separator' },
        { id: 'compact', type: 'radio', label: 'Compact', checked: density === 'compact', onSelect: () => setDensity('compact') },
        { id: 'comfortable', type: 'radio', label: 'Comfortable', checked: density === 'comfortable', onSelect: () => setDensity('comfortable') },
      ]}
    />
  );
}
