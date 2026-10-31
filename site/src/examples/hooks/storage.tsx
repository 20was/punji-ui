import { Button } from '@punji/ui/button';
import { useLocalStorage } from '@punji/ui/hooks';
import { Cluster } from '@punji/ui/stack';

type Currency = 'NPR' | 'USD';
const isCurrency = (value: unknown): value is Currency => value === 'NPR' || value === 'USD';
// Stable references: the validator is required because stored data is untrusted.
const options = { defaultValue: 'NPR' as Currency, validate: isCurrency };

export default function Example() {
  const { value, set, remove, error } = useLocalStorage<Currency>('docs-example-currency', options);
  return (
    <Cluster>
      <span>Preferred currency: <strong>{value}</strong></span>
      <Button size="sm" variant="secondary" onClick={() => set(value === 'NPR' ? 'USD' : 'NPR')}>Switch</Button>
      <Button size="sm" variant="ghost" onClick={remove}>Reset</Button>
      {error && <span role="alert">Storage problem: {error}</span>}
    </Cluster>
  );
}
