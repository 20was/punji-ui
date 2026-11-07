import { useRef } from 'react';
import { Card } from '@punji/ui/card';
import { Button } from '@punji/ui/button';
import { ThemeProvider, useTheme, type ThemeChoice } from '@punji/ui/theme-provider';

const CHOICES: readonly { id: ThemeChoice; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'light-hc', label: 'Light, high contrast' },
  { id: 'dark-hc', label: 'Dark, high contrast' },
];

function Picker() {
  const { theme, resolvedTheme, setTheme, toggle } = useTheme();
  return (
    <Card title="Theme" description={`Choice: ${theme}. Showing: ${resolvedTheme}.`}>
      <div role="group" aria-label="Theme" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CHOICES.map((c) => (
          <Button key={c.id} size="sm" variant={theme === c.id ? 'primary' : 'secondary'} aria-pressed={theme === c.id} onClick={() => setTheme(c.id)}>
            {c.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={toggle}>Flip light and dark</Button>
      </div>
    </Card>
  );
}

// An app puts ThemeProvider at its root and themeInitScript in the head. Here `target` themes just this region, with
// its own storage key, so the docs page keeps its own theme.
export default function Example() {
  const region = useRef<HTMLDivElement>(null);
  return (
    <ThemeProvider storageKey="punji-docs-example-theme" target={() => region.current}>
      <div ref={region} style={{ padding: 16, borderRadius: 12, background: 'var(--pu-color-bg)', color: 'var(--pu-color-text)' }}>
        <Picker />
      </div>
    </ThemeProvider>
  );
}
