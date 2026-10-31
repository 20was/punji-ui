import { CodeBlock } from '@punji/ui/code-block';

const order = { id: 'ORD-4021', symbol: 'NABIL', side: 'sell', quantity: 100, limit: '1240.00', status: 'open' };

// Without a visible label, name the block with aria-label.
export default function Example() {
  return <CodeBlock aria-label="Order as JSON">{JSON.stringify(order, null, 2)}</CodeBlock>;
}
