import { StateGlyph, type StateIcon } from '@punji/ui/inline-state';

const names: StateIcon[] = ['lock', 'error', 'clock', 'offline', 'info', 'star', 'bell', 'chart', 'eyeOff', 'check'];

// The ten state icons, drawn in the current colour. Decorative: always put the meaning in words.
export default function Example() {
  return (
    <ul className="ex-row" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {names.map((name) => (
        <li key={name} className="ex-row">
          <StateGlyph name={name} size={20} /> <code>{name}</code>
        </li>
      ))}
    </ul>
  );
}
