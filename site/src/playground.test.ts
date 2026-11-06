import { describe, expect, it } from 'vitest';
import type { ApiEntry } from './app/api.ts';
import { fieldFor, literalUnion, snippetFor } from './app/Playground.tsx';
import { sanitise } from './app/preview.ts';
import { PLAYGROUNDS } from './playground.ts';

const entry: ApiEntry = {
  name: 'Button',
  module: '@punji/ui/button',
  description: '',
  kind: 'component',
  props: [
    { name: 'variant', type: 'ButtonVariant', required: false, description: '' },
    { name: 'block', type: 'boolean', required: false, description: '' },
    { name: 'label', type: 'string', required: false, description: '' },
    { name: 'dp', type: 'number', required: false, description: '' },
    { name: 'level', type: '2 | 3', required: false, description: '' },
    { name: 'onClick', type: '() => void', required: false, description: '' },
  ],
};
const api: Record<string, ApiEntry> = { ButtonVariant: { name: 'ButtonVariant', module: '', description: '', kind: 'type', definition: '"danger" | "ghost" | "primary"' } };

describe('playground controls', () => {
  it('reads literal unions of strings and numbers, and nothing else', () => {
    expect(literalUnion('"a" | "b"')).toEqual(['a', 'b']);
    expect(literalUnion('2 | 3')).toEqual([2, 3]);
    expect(literalUnion('string | number')).toBeUndefined();
  });
  it('picks the control from the API type, resolving a documented alias', () => {
    expect(fieldFor('variant', true, api, entry)).toMatchObject({ kind: 'select', options: ['danger', 'ghost', 'primary'] });
    expect(fieldFor('block', true, api, entry)?.kind).toBe('boolean');
    expect(fieldFor('label', true, api, entry)?.kind).toBe('text');
    expect(fieldFor('dp', true, api, entry)?.kind).toBe('number');
    expect(fieldFor('level', true, api, entry)).toMatchObject({ kind: 'select', options: [2, 3] });
    expect(fieldFor('onClick', true, api, entry)).toBeUndefined();
    expect(fieldFor('missing', true, api, entry)).toBeUndefined();
  });
  it('prints the JSX for the values', () => {
    const def = { component: 'Button', load: () => Promise.resolve({}), children: 'Buy', props: {} };
    const fields = ['variant', 'block'].map((n) => fieldFor(n, true, api, entry)!);
    expect(snippetFor(def, entry, fields, { variant: 'ghost', block: true }, 'Buy')).toBe(
      `import { Button } from '@punji/ui/button';\n\n<Button variant="ghost" block>Buy</Button>\n`,
    );
  });
});

describe('preview preferences', () => {
  it('lets only known values through', () => {
    expect(sanitise({ locale: 'ne-NP', density: 'compact', theme: 'dark-hc' })).toEqual({ locale: 'ne-NP', density: 'compact', theme: 'dark-hc' });
    expect(sanitise({ locale: '<x>', density: 'huge', theme: 'sepia' })).toEqual({ locale: 'en-NP', density: 'comfortable', theme: null });
  });
});

// The generated page data (npm run site:gen); absent on a checkout that has not generated it, so the check is skipped.
const pages = import.meta.glob<{ api: Record<string, ApiEntry> }>('./generated/pages/*.json', { eager: true, import: 'default' });
describe.skipIf(Object.keys(pages).length === 0)('playground configuration', () => {
  it.each(Object.entries(PLAYGROUNDS))('%s: the page documents the component and every exposed prop is a control', (slug, def) => {
    const data = pages[`./generated/pages/${slug}.json`]!;
    const component = data.api[def.component];
    expect(component, `${slug} has no API entry ${def.component}`).toBeDefined();
    for (const [name, control] of Object.entries(def.props)) expect(fieldFor(name, control, data.api, component!), `${slug}.${name}`).toBeDefined();
  });
});
