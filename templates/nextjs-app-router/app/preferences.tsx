'use client';

import { useEffect, useState } from 'react';
import { SegmentedControl } from '@punji/ui/controls';

type Theme = 'light' | 'dark';
type Density = 'compact' | 'comfortable' | 'spacious';

/** Theme and density switches: attributes on <html> that every Punji component reads through CSS variables. */
export function Preferences() {
  const [theme, setTheme] = useState<Theme>('light');
  const [density, setDensity] = useState<Density>('comfortable');
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
    document.documentElement.dataset['puDensity'] = density;
  }, [theme, density]);
  return (
    <div className="dash-prefs">
      <SegmentedControl<Theme> label="Theme" prefix="theme" size="sm" value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      <SegmentedControl<Density>
        label="Density"
        prefix="density"
        size="sm"
        value={density}
        onChange={setDensity}
        options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'spacious', label: 'Spacious' }]}
      />
    </div>
  );
}
