import { useTheme, type ThemeChoice } from './theme.ts';
import { MonitorIcon, MoonIcon, SunIcon } from './icons.tsx';

const THEMES: { value: ThemeChoice; label: string; Icon: () => React.JSX.Element }[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
];

/** Light, dark or the system setting as three icon buttons (a toggle group); the choice persists. */
export function ThemeSwitch() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="doc-theme" role="group" aria-label="Theme">
      {THEMES.map(({ value, label, Icon }) => (
        <button key={value} type="button" aria-pressed={theme === value} aria-label={label} title={`${label} theme`} onClick={() => setTheme(value)} data-testid={`theme-${value}`}>
          <Icon />
        </button>
      ))}
    </div>
  );
}

