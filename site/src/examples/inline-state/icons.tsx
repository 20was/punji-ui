import { StateGlyph, type StateIcon } from '@punji/ui/inline-state';
import { Cluster } from '@punji/ui/stack';

const names: StateIcon[] = ['lock', 'error', 'clock', 'offline', 'info', 'star', 'bell', 'chart', 'eyeOff', 'check'];

// The ten state icons, drawn in the current colour. Decorative: always put the meaning in words.
export default function Example() {
  return (
    <Cluster as="ul">
      {names.map((name) => (
        <Cluster as="li" key={name}>
          <StateGlyph name={name} size={20} /> <code>{name}</code>
        </Cluster>
      ))}
    </Cluster>
  );
}
