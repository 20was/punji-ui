import { useState } from 'react';
import { NepalAddressPicker, type NepalAddress } from '@punji/ui/nepal-address-picker';

// Province and district names in Nepali and the ward in Devanagari digits. The value stays English names and ASCII digits.
export default function Example() {
  const [address, setAddress] = useState<NepalAddress>({ province: 'Gandaki', district: 'Kaski', localLevel: 'Pokhara', ward: '8' });
  return (
    <div className="ex-narrow">
      <NepalAddressPicker
        value={address}
        onChange={setAddress}
        language="ne"
        digits="deva"
        labels={{ legend: 'स्थायी ठेगाना', province: 'प्रदेश', district: 'जिल्ला', localLevel: 'गाउँपालिका / नगरपालिका', ward: 'वडा नं.', choose: 'छान्नुहोस्' }}
      />
    </div>
  );
}
