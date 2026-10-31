import { KeyStats } from '@punji/ui/key-stats';

// A value that is not known (null) says so in words, never a dash or a zero.
export default function Example() {
  return (
    <div className="ex-stack">
      <KeyStats
        label="NABIL fundamentals"
        empty="Not published"
        items={[
          { label: 'EPS', value: '38.20', sub: 'Q1 2082/83' },
          { label: 'P/E', value: '12.8' },
          { label: 'Book value', value: 'Rs 214.10' },
          { label: 'Dividend yield', value: null },
          { label: 'Net position', value: '+Rs 4,200', tone: 'up' },
          { label: 'Net change', value: '-Rs 1,150', tone: 'down' },
        ]}
      />
      <KeyStats
        cols={3}
        label="Three columns"
        empty="Not published"
        items={[
          { label: 'Open', value: 'Rs 480.00' },
          { label: 'High', value: 'Rs 489.30' },
          { label: 'Low', value: 'Rs 478.20' },
        ]}
      />
    </div>
  );
}
