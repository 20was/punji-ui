import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Checklist, ProgressPill } from '@punji/ui/checklist';

const glyph = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// Open steps first. The caller keeps which are done and whether the guide is folded; ProgressPill brings it back.
export default function Example() {
  const [done, setDone] = useState<readonly string[]>(['account']);
  const [folded, setFolded] = useState(false);
  const steps = [
    { id: 'account', title: 'Create your account', body: 'Email and a PIN.', icon: glyph('M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0') },
    { id: 'holding', title: 'Add a holding', body: 'Import a statement or add one by hand.', icon: glyph('M4 8h16v11H4zM9 8V5h6v3') },
    { id: 'alert', title: 'Set a price alert', body: 'Hear when a price crosses your level.', icon: glyph('M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0') },
  ]
    .map((s) => ({ ...s, done: done.includes(s.id) }))
    .toSorted((a, b) => Number(a.done) - Number(b.done))
    .map((s) => ({
      ...s,
      action: (
        <Button size="sm" variant="secondary" onClick={() => setDone((d) => [...d, s.id])}>
          {s.id === 'holding' ? 'Add' : 'Set up'}
        </Button>
      ),
    }));
  const progress = `${done.length} of ${steps.length} done`;
  return folded ? (
    <ProgressPill done={done.length} total={steps.length} onClick={() => setFolded(false)}>
      Setup guide · {progress}
    </ProgressPill>
  ) : (
    <div style={{ display: 'grid', gap: 'var(--pu-space-3)', inlineSize: 'min(30rem, 100%)' }}>
      <Checklist items={steps} progress={progress} doneLabel="Done" label="Setup guide" />
      <Button variant="ghost" size="sm" onClick={() => setFolded(true)}>
        Hide guide
      </Button>
    </div>
  );
}
