import tokens from '@punji/ui/tokens.css?raw';

// Read from the shipped tokens.css, so this list cannot drift from the package.
const decls = (selector: string): Map<string, string> => {
  const start = tokens.indexOf(`${selector}{`);
  const body = tokens.slice(start + selector.length + 1, tokens.indexOf('}', start));
  return new Map([...body.matchAll(/(--pu-color-[\w-]+):([^;]+)/g)].map((m) => [m[1]!, m[2]!.trim()]));
};

const light = decls(':root,[data-theme=light]');
const dark = decls('[data-theme=dark]');
const names = [...light.keys()].filter((name) => /color-(bg|surface|text|accent-fill|gain|loss|warn|link|series-[3-5])/.test(name) && !name.includes('inverse'));

export default function Example() {
  return (
    <div className="ex-swatches">
      {names.map((name) => (
        <div key={name} className="ex-swatch">
          <i style={{ background: `var(${name})` }} />
          <b>{name.replace('--pu-', '')}</b>
          <span>light {light.get(name)}</span>
          <span>dark {dark.get(name) ?? light.get(name)}</span>
        </div>
      ))}
    </div>
  );
}
