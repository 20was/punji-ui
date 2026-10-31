const steps = [1, 2, 3, 4, 16] as const;

export default function Example() {
  return (
    <div className="ex-stack">
      {steps.map((step) => (
        <div key={step} className="ex-row">
          <code style={{ width: '9rem' }}>--pu-space-{step}</code>
          <span style={{ display: 'block', height: '1rem', width: `var(--pu-space-${step})`, background: 'var(--pu-color-accent)', borderRadius: 2 }} />
        </div>
      ))}
    </div>
  );
}
