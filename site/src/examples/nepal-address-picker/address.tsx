import { useState } from 'react';
import { NepalAddressPicker, emptyNepalAddress, type NepalAddress } from '@punji/ui/nepal-address-picker';

// The list of 753 local levels loads on first use, from its own subpath, so it never weighs on the root import.
export default function Example() {
  const [address, setAddress] = useState<NepalAddress>(emptyNepalAddress);
  return (
    <div className="ex-narrow">
      <NepalAddressPicker value={address} onChange={setAddress} labels={{ legend: 'Permanent address' }} />
      <p className="doc-muted"><code>{JSON.stringify(address)}</code></p>
    </div>
  );
}
