import { allocation } from '@punji/ui/calculations';

export default function Example() {
  // Three equal holdings: 33.33 + 33.33 + 33.33 would be 99.99. Largest remainder fixes it.
  const slices = allocation([
    { id: 'NABIL', value: 3n },
    { id: 'NTC', value: 3n },
    { id: 'HDL', value: 3n },
  ]);
  const total = slices.reduce((sum, s) => sum + (s.displayPercent ?? 0), 0);
  return (
    <div className="ex-stack">
      <dl className="ex-grid">
        {slices.map((s) => (
          <div key={s.id}><dt>{s.id}</dt><dd>{s.displayPercent?.toFixed(2)}%</dd></div>
        ))}
      </dl>
      <p className="doc-muted">Display shares add up to exactly <strong>{total.toFixed(2)}%</strong>.</p>
    </div>
  );
}
