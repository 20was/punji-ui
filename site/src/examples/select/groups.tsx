import { useState } from 'react';
import { Select, type SelectOption } from '@punji/ui/select';
import { Cluster } from '@punji/ui/stack';

const options: SelectOption[] = [
  { value: 'nabil', label: 'NABIL · Nabil Bank', group: 'Banks' },
  { value: 'nica', label: 'NICA · NIC Asia Bank', group: 'Banks' },
  { value: 'upper', label: 'UPPER · Upper Tamakoshi', group: 'Hydropower' },
  { value: 'chcl', label: 'CHCL · Chilime', group: 'Hydropower', disabled: true },
];

// Consecutive options with the same group share one <optgroup>. A disabled option is listed but not choosable.
export default function Example() {
  const [value, setValue] = useState('nabil');
  return (
    <Cluster>
      <Select label="Company" labelPlacement="above" value={value} onChange={setValue} options={options} />
      <Select label="Loading" labelPlacement="above" loading value={value} onChange={setValue} options={options} />
      <Select label="Disabled" labelPlacement="above" disabled value={value} onChange={setValue} options={options} />
      <Select label="Native picker" labelPlacement="above" native value={value} onChange={setValue} options={options} />
    </Cluster>
  );
}
