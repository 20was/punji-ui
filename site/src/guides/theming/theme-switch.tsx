import { useEffect } from 'react';
import { SegmentedControl } from '@punji/ui/controls';
import { useLocalStorage } from '@punji/ui/hooks';

type ThemeChoice = 'system' | 'light' | 'dark';

const isTheme = (value: unknown): value is ThemeChoice => value === 'system' || value === 'light' || value === 'dark';
const options = { defaultValue: 'system' as ThemeChoice, validate: isTheme };

/** A light / dark / system switch. "system" removes the attribute, so prefers-color-scheme decides. */
export function ThemeSwitch() {
  const { value, set } = useLocalStorage<ThemeChoice>('app-theme', options);
  useEffect(() => {
    const root = document.documentElement;
    if (value === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', value);
  }, [value]);
  return (
    <SegmentedControl<ThemeChoice>
      label="Theme"
      prefix="theme"
      size="sm"
      value={value}
      onChange={set}
      options={[
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'Auto' },
      ]}
    />
  );
}
