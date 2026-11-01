import { useState } from 'react';
import { CheckList, CheckRow, StatusDisc } from '@punji/ui/check-row';
import { StateGlyph } from '@punji/ui/inline-state';
import { Stack } from '@punji/ui/stack';

const checks = [
  { id: 'concentration', title: 'Concentration', line: 'Banking is 46% of holdings', status: 'Watch', tone: 'warn' as const },
  { id: 'cash', title: 'Cash buffer', line: 'Below your minimum', status: 'Below minimum', tone: 'loss' as const },
  { id: 'income', title: 'Dividend income', line: 'On track', status: 'OK', tone: 'gain' as const },
];

// role="tablist": a vertical tab list beside its panel. Arrow Up/Down, Home and End move focus between the tabs.
export default function Example() {
  const [current, setCurrent] = useState('concentration');
  const detail = checks.find((c) => c.id === current)!;
  return (
    <div style={{ display: 'grid', gap: '16px 20px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))' }}>
      <CheckList role="tablist" label="Checks">
        {checks.map((c) => (
          <CheckRow
            key={c.id}
            icon={<StateGlyph name="info" size={18} />}
            tone={c.tone}
            title={c.title}
            line={c.line}
            status={{ label: c.status, tone: c.tone }}
            onClick={() => setCurrent(c.id)}
            tab={{ selected: current === c.id, controls: 'check-panel', id: `tab-${c.id}`, tabIndex: current === c.id ? 0 : -1 }}
          />
        ))}
      </CheckList>
      <Stack id="check-panel" role="tabpanel" aria-labelledby={`tab-${current}`}>
        <StatusDisc tone={detail.tone} size="lg">
          <StateGlyph name="info" size={22} />
        </StatusDisc>
        <strong>{detail.title}</strong>
        <span>{detail.line}</span>
      </Stack>
    </div>
  );
}
