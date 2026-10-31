import tokens from '@punji/ui/tokens.css?raw';

// Read from the shipped tokens.css, so this list cannot drift from the package.
const decls = (selector: string): Map<string, string> => {
  const start = tokens.indexOf(`${selector}{`);
  const body = tokens.slice(start + selector.length + 1, tokens.indexOf('}', start));
  return new Map([...body.matchAll(/(--pu-color-[\w-]+):([^;]+)/g)].map((m) => [m[1]!, m[2]!.trim()]));
};

const light = decls(':root,[data-theme=light]');
const dark = decls('[data-theme=dark]');

// Grouped by what the colour is for; each swatch shows its light value on the left and its dark value on the right.
const groups: { title: string; names: string[] }[] = [
  { title: 'Surfaces', names: ['bg', 'surface', 'surface-tint', 'surface-subtle'] },
  { title: 'Text', names: ['text', 'text-muted', 'text-tertiary', 'link'] },
  { title: 'Accent', names: ['accent-fill', 'accent-fill-hover'] },
  { title: 'Gain, loss and warning', names: ['gain', 'gain-soft', 'loss', 'loss-soft', 'warn', 'warn-accent'] },
  { title: 'Chart series', names: ['series-3', 'series-4', 'series-5'] },
];

export default function Example() {
  return (
    <div className="ex-token-groups">
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <p className="ex-label">{group.title}</p>
          <div className="ex-swatches">
            {group.names
              .map((short) => `--pu-color-${short}`)
              .filter((name) => light.has(name))
              .map((name) => {
                const l = light.get(name)!;
                const d = dark.get(name) ?? l;
                return (
                  <div key={name} className="ex-swatch">
                    <i style={{ background: `linear-gradient(135deg, ${l} 50%, ${d} 50%)` }} />
                    <b>
                      <code>{name}</code>
                    </b>
                    <span>
                      {l} · {d}
                    </span>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
