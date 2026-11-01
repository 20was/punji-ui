import { useState } from 'react';
import { SplitPane } from '@punji/ui/split-pane';

export default function Example() {
  const [size, setSize] = useState(40);
  return (
    <div style={{ height: 320 }}>
      <SplitPane
        label="Resize the list and the detail"
        orientation="vertical"
        size={size}
        onSizeChange={setSize}
        start={<p style={{ margin: 0, padding: 12 }}>Orders list · {Math.round(size)}% of the height</p>}
        end={<p style={{ margin: 0, padding: 12 }}>Order detail · {Math.round(100 - size)}%</p>}
      />
    </div>
  );
}
