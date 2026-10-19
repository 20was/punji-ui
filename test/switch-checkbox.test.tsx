import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox, Switch } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

function Harness() {
  const [on, setOn] = useState(false);
  return (
    <>
      <span id="t">Price alerts</span>
      <Switch checked={on} onChange={setOn} labelledBy="t" testId="sw" />
      <Switch checked onChange={() => {}} label="Share" busy />
    </>
  );
}

function CheckHarness() {
  const [on, setOn] = useState(false);
  return (
    <Checkbox checked={on} onChange={setOn} end={7} lead={<i aria-hidden="true" />} testId="cb" rowTestId="row">
      Banks
    </Checkbox>
  );
}

describe('Switch', () => {
  it('is a switch that flips on click and on Space, named by label or labelledBy', async () => {
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Price alerts' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    await userEvent.click(sw);
    expect(sw.getAttribute('aria-checked')).toBe('true');
    sw.focus();
    await userEvent.keyboard(' ');
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('switch', { name: 'Share' }).getAttribute('aria-busy')).toBe('true');
  });

  it('does nothing while disabled', async () => {
    const onChange = vi.fn<(v: boolean) => void>();
    render(<Switch checked={false} onChange={onChange} label="Off" disabled />);
    await userEvent.click(screen.getByRole('switch', { name: 'Off' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<Switch checked={false} onChange={() => {}} label="Alerts" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('Checkbox', () => {
  it('is a real checkbox inside its label: the whole row toggles it', async () => {
    render(<CheckHarness />);
    const cb = screen.getByRole('checkbox', { name: /Banks/ }) as HTMLInputElement;
    expect(cb.checked).toBe(false);
    await userEvent.click(screen.getByText('Banks'));
    expect(cb.checked).toBe(true);
    expect(screen.getByTestId('row').querySelector('.kit-check-end')?.textContent).toBe('7');
  });

  it('a disabled row says so and does not change', async () => {
    const onChange = vi.fn<(v: boolean) => void>();
    render(
      <Checkbox checked={false} onChange={onChange} disabled rowTestId="row">
        Hydro
      </Checkbox>,
    );
    expect(screen.getByTestId('row').className).toBe('kit-check off');
    await userEvent.click(screen.getByText('Hydro'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <Checkbox checked onChange={() => {}}>
        Banks
      </Checkbox>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});
