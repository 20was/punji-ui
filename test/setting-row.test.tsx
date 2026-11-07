import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { LinkProvider, SettingList, SettingRow, type LinkProps } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

function Toggle({ onChange }: { onChange?: (v: boolean) => void }) {
  const [on, setOn] = useState(false);
  return <SettingRow title="Daily summary" line="One summary after the close" toggle={{ checked: on, onChange: (v) => { setOn(v); onChange?.(v); } }} />;
}

function Router({ href, children, ...rest }: LinkProps) {
  return <a href={href} data-router="yes" {...rest}>{children}</a>;
}

describe('SettingRow toggle', () => {
  it('names the switch by the title, describes it by the line, and a tap on the words flips it', async () => {
    const user = userEvent.setup();
    const seen = vi.fn<() => void>();
    render(<Toggle onChange={seen} />);
    const sw = screen.getByRole('switch', { name: 'Daily summary' });
    expect(sw.getAttribute('aria-describedby')).toBeTruthy();
    expect(document.getElementById(sw.getAttribute('aria-describedby')!)?.textContent).toBe('One summary after the close');
    await user.click(screen.getByText('Daily summary'));
    expect(sw.getAttribute('aria-checked')).toBe('true');
    sw.focus();
    await user.keyboard(' ');
    expect(seen).toHaveBeenLastCalledWith(false);
  });

  it('a disabled toggle cannot be flipped', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<() => void>();
    render(<SettingRow title="Alerts" toggle={{ checked: false, onChange, disabled: true }} />);
    await user.click(screen.getByText('Alerts'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('SettingRow link and button rows', () => {
  it('an in-app href uses the LinkProvider; the note and testId parts are added', () => {
    render(
      <LinkProvider component={Router}>
        <SettingRow title="Profile" line="Name and email" href="/me/profile" note="Shown to your broker" testId="p" />
      </LinkProvider>,
    );
    const link = screen.getByRole('link', { name: /Profile/ });
    expect(link.getAttribute('data-router')).toBe('yes');
    expect(link.getAttribute('href')).toBe('/me/profile');
    expect(screen.getByTestId('p-note').textContent).toBe('Shown to your broker');
  });

  it('a new-tab row says so, opens safely, and the deprecated externalLabel still works', () => {
    const { rerender } = render(<SettingRow title="Terms" href="https://example.com/t" newTab />);
    let link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.textContent).toContain('(opens in a new tab)');
    rerender(<SettingRow title="Terms" href="https://example.com/t" newTab externalLabel="se abre en otra pestaña" />);
    link = screen.getByRole('link');
    expect(link.textContent).toContain('se abre en otra pestaña');
  });

  it('a blocked address cannot navigate', () => {
    render(<SettingRow title="Bad" href="javascript:alert(1)" />);
    expect(screen.getByText('Bad').closest('a')?.hasAttribute('href')).toBe(false);
  });

  it('a button row presses with Enter, reports expanded, and is held while busy', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn<() => void>();
    const { rerender } = render(<SettingRow title="Sessions" onClick={onClick} trail="expand" expanded controls="panel" />);
    const btn = screen.getByRole('button', { name: /Sessions/ });
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.getAttribute('aria-controls')).toBe('panel');
    btn.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<SettingRow title="Sessions" onClick={onClick} busy />);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
  });

  it('danger, lg and a control end render their hooks', () => {
    render(<SettingRow title="Delete account" danger size="lg" icon={<i />} control={<span>End</span>} testId="d" />);
    expect(screen.getByTestId('d').className).toBe('pu-set has-icon danger lg');
    expect(screen.getByText('End')).toBeTruthy();
  });
});

describe('SettingList', () => {
  it('holds rows and marks itself busy', () => {
    render(
      <SettingList busy testId="l">
        <SettingRow title="One" control={<span>a</span>} />
        <SettingRow title="Two" control={<span>b</span>} />
      </SettingList>,
    );
    expect(screen.getByTestId('l').getAttribute('aria-busy')).toBe('true');
  });

  it('renders on the server and has no serious axe violations', async () => {
    const ui = (
      <SettingList>
        <Toggle />
        <SettingRow title="Profile" href="/p" icon={<svg />} />
        <SettingRow title="Out" onClick={() => {}} trail="leave" />
      </SettingList>
    );
    expect(renderToString(ui)).toContain('pu-set-list');
    const { container } = render(ui);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
