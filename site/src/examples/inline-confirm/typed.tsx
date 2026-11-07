import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { InlineConfirm } from '@punji/ui/inline-confirm';

// strength="caution": something the reader can start again (primary button).
// match: for something that cannot be undone, the reader types a word first. The field takes focus; Enter confirms.
export default function Example() {
  const [step, setStep] = useState<'none' | 'caution' | 'match'>('none');
  const done = () => setStep('none');
  return (
    <div style={{ display: 'grid', gap: 12, width: 'min(100%, 440px)', marginInline: 'auto' }}>
      {step === 'caution' && (
        <InlineConfirm strength="caution" title="Sign out everywhere?" body="You can sign in again on any device." confirm="Sign out everywhere" cancel="Stay signed in" onCancel={done} onConfirm={done} />
      )}
      {step === 'match' && (
        <InlineConfirm title="Delete this watchlist?" body="Its 12 symbols and alerts are removed for good." confirm="Delete watchlist" cancel="Keep it" match="DELETE" matchLabel="Type DELETE to confirm" onCancel={done} onConfirm={done} />
      )}
      {step === 'none' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => setStep('caution')}>Sign out everywhere</Button>
          <Button variant="ghost" size="sm" onClick={() => setStep('match')}>Delete watchlist</Button>
        </div>
      )}
    </div>
  );
}
