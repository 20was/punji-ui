import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button, buttonClass } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

describe('Button', () => {
  it('is a real button that clicks', async () => {
    const onClick = vi.fn<() => void>();
    render(<Button onClick={onClick}>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn.getAttribute('type')).toBe('button');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is busy and not clickable while loading', async () => {
    const onClick = vi.fn<() => void>();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('names an icon-only button by its label', () => {
    render(<Button iconOnly label="Close" icon={<svg />} />);
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('icon');
  });

  it('renders a link when given href', () => {
    render(<Button href="/docs">Docs</Button>);
    expect(screen.getByRole('link', { name: 'Docs' }).getAttribute('href')).toBe('/docs');
  });

  it('builds its classes from variant and size', () => {
    expect(buttonClass()).toBe('kit-btn primary');
    expect(buttonClass({ variant: 'danger', size: 'lg', block: true })).toBe('kit-btn danger lg block');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <div>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button iconOnly label="Settings" icon={<svg />} />
        <Button href="/x" variant="ghost">
          Link
        </Button>
      </div>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});
