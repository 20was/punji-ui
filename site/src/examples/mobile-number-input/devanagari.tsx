import { useState } from 'react';
import { MobileNumberInput } from '@punji/ui/mobile-number-input';
import { NEPAL_MOBILE_OPERATORS, type MobileOperator } from '@punji/ui/nepal/mobile';

// A new range is data, not a release. The 990 operator is invented for this example.
const operators: MobileOperator[] = [...NEPAL_MOBILE_OPERATORS, { id: 'example', name: 'Example Mobile', shortName: 'Example', prefixes: ['990'] }];

export default function Example() {
  const [value, setValue] = useState('9881234567');
  return (
    <div className="ex-narrow">
      <MobileNumberInput
        label="मोबाइल नम्बर"
        digits="deva"
        operators={operators}
        value={value}
        onValueChange={(r) => setValue(r.national)}
        operatorAnnouncement={(o) => `अपरेटर: ${o.name}`}
        invalidMessage={() => '९ बाट सुरु हुने १० अङ्कको नम्बर लेख्नुहोस्।'}
        hint="९९० पनि स्वीकार्य छ (उदाहरण)"
      />
    </div>
  );
}
