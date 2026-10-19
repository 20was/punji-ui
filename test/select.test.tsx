import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Select } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const noop = () => {};
const OPTS = [
  { value: '', label: 'Choose a broker' },
  { value: '45', label: '45 Imperial Securities' },
  { value: '58', label: '58 Naasa Securities', disabled: true },
];

function Harness() {
  const [v, setV] = useState('');
  return <Select label="Broker" value={v} onChange={setV} options={OPTS} />;
}

describe('Select', () => {
  it('renders a real <select> with the kit chevron, md by default', () => {
    const html = renderToString(<Select label="Broker" value="" onChange={noop} options={OPTS} testId="pick" />);
    expect(html).toMatch(/<span class="kit-sel md"><select[^>]*data-testid="pick"/);
    expect(html).toContain('class="kit-sel-ico"');
    expect(html).toContain('45 Imperial Securities');
  });

  it.each(['sm', 'md', 'lg'] as const)('carries the %s size on its box', (size) => {
    expect(renderToString(<Select label="x" size={size} value="" onChange={noop} options={OPTS} />)).toContain(`class="kit-sel ${size}"`);
  });

  it('names the select through a label tied to its id, hidden by default, visible above or inline on request', () => {
    const hidden = renderToString(<Select id="s1" label="Sector" value="" onChange={noop} options={OPTS} />);
    expect(hidden).toMatch(/<label for="s1" class="kit-sr">Sector<\/label>/);
    expect(renderToString(<Select id="s2" label="Sector" labelPlacement="above" value="" onChange={noop} options={OPTS} />)).toMatch(/<label for="s2" class="kit-sel-l">/);
    expect(renderToString(<Select id="s3" label="Sort" labelPlacement="inline" value="" onChange={noop} options={OPTS} />)).toContain('kit-sel-f inline');
  });

  it('loading disables it, marks it busy and swaps the chevron for a spinner', () => {
    const html = renderToString(<Select label="x" loading value="" onChange={noop} options={OPTS} />);
    expect(html).toMatch(/<select[^>]*disabled=""/);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('kit-spin kit-sel-ico');
    expect(html).not.toContain('<svg class="kit-sel-ico"');
  });

  it('bare drops the box for a field that draws its own', () => {
    expect(renderToString(<Select bare value="" onChange={noop} options={OPTS} />)).toContain('class="kit-sel md bare"');
  });

  it('changes value through the native control; a disabled option stays disabled', async () => {
    render(<Harness />);
    const sel = screen.getByRole('combobox', { name: 'Broker' }) as HTMLSelectElement;
    await userEvent.selectOptions(sel, '45');
    expect(sel.value).toBe('45');
    expect((screen.getByRole('option', { name: '58 Naasa Securities' }) as HTMLOptionElement).disabled).toBe(true);
  });

  it('has no serious axe violations in every label placement', async () => {
    const { container } = render(
      <div>
        <Select label="A" value="" onChange={noop} options={OPTS} />
        <Select label="B" labelPlacement="above" value="" onChange={noop} options={OPTS} />
        <Select label="C" labelPlacement="inline" size="sm" value="" onChange={noop} options={OPTS} />
        <Select label="D" loading value="" onChange={noop} options={OPTS} />
      </div>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});
