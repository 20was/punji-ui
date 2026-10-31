import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi, afterEach } from 'vitest';

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

function FormHarness({change}:{change:(value:string)=>void}) {
  const [value,setValue]=useState('');
  return <form><Select label="Account" name="account" value={value} required onChange={next=>{change(next);setValue(next);}} options={OPTS}/></form>;
}

afterEach(()=>vi.unstubAllGlobals());

describe('Select', () => {
  it('renders a real <select> with the kit chevron, md by default', () => {
    const html = renderToString(<Select label="Broker" value="" onChange={noop} options={OPTS} testId="pick" />);
    expect(html).toMatch(/<span class="kit-sel md"><select[^>]*data-testid="pick"/);
    expect(html).toContain('class="kit-sel-ico"');
    expect(html).toContain('45 Imperial Securities');
    expect(html).not.toContain('<button');
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

  it('keeps native form values, validation and event targets',async()=>{
    const change=vi.fn<(value:string)=>void>();
    const {container}=render(<FormHarness change={change}/>);
    const select=screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.checkValidity()).toBe(false);
    await userEvent.selectOptions(select,'45');expect(change).toHaveBeenCalledWith('45');
    expect(new FormData(container.querySelector('form')!).get('account')).toBe('45');
    expect(select).toBeInstanceOf(HTMLSelectElement);
  });
  it('supports explicit platform fallback without changing option groups',()=>{
    render(<Select native label="Currency" value="npr" onChange={noop} options={[{value:'npr',label:'NPR',group:'Nepal'},{value:'usd',label:'USD',group:'Other',disabled:true}]}/>);
    const select=screen.getByRole('combobox');
    expect(select.getAttribute('data-native')).toBe('true');
    expect(screen.getByRole('group',{name:'Nepal'}).tagName).toBe('OPTGROUP');
    expect((screen.getByRole('option',{name:'USD'}) as HTMLOptionElement).disabled).toBe(true);
  });
  it('upgrades only the native display button and removes it on platform opt-out',()=>{
    vi.stubGlobal('CSS',{supports:()=>true});
    vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:()=>{},removeEventListener:()=>{}}));
    const {rerender}=render(<Select label="Broker" value="45" onChange={noop} options={OPTS}/>);
    const select=screen.getByRole('combobox');
    expect(select.firstElementChild?.tagName).toBe('BUTTON');
    expect(select.querySelector('selectedcontent')).not.toBeNull();
    rerender(<Select native label="Broker" value="45" onChange={noop} options={OPTS}/>);
    expect(select.querySelector('button')).toBeNull();
    expect(select.querySelectorAll('option').length).toBe(3);
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
