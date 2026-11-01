import { useState } from 'react';
import { LineItemEditor, type LineItemDraft } from '@punji/ui/line-item-editor';

// Type a quantity (Devanagari digits work) or a rate and the totals update exactly. Untick VAT for an exempt item.
// Add line focuses the new description; removing a line moves focus to the next one. Both are announced.
export default function Example() {
  const [lines, setLines] = useState<LineItemDraft[]>([
    { id: 'a', description: 'Consulting, October', quantity: '12', rate: '2500', taxable: true },
    { id: 'b', description: 'Printed manuals', quantity: '30', rate: '150', taxable: true },
    { id: 'c', description: 'Rice for the canteen (kg)', quantity: '25.5', rate: '180', taxable: false },
  ]);
  return <LineItemEditor lines={lines} onChange={setLines} maxLines={20} />;
}
