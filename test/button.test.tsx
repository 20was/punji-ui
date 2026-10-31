import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button, buttonClass } from '../src/index.ts';
import type { LinkComponent } from '../src/internal/link.tsx';
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
    expect(btn.querySelector('.kit-spin')).not.toBeNull();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('names an icon-only button by its label and hides the icon', () => {
    render(<Button iconOnly label="Close" icon={<svg />} />);
    const btn = screen.getByRole('button', { name: 'Close' });
    expect(btn.className).toContain('icon');
    expect(btn.querySelector('.kit-btn-ico')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a plain link when given href and no link component', () => {
    render(<Button href="/docs">Docs</Button>);
    const a = screen.getByRole('link', { name: 'Docs' });
    expect(a.getAttribute('href')).toBe('/docs');
    expect(a.className).toBe('kit-btn primary');
  });

  it('renders an in-app href through the link component, and an absolute URL as a plain <a>', () => {
    const seen: string[] = [];
    const RouterLink: LinkComponent = ({ href, children, ...rest }) => {
      seen.push(href);
      return (
        <a data-router="yes" href={href} {...rest}>
          {children}
        </a>
      );
    };
    render(
      <>
        <Button href="/settings" linkComponent={RouterLink}>
          Settings
        </Button>
        <Button href="https://example.com" linkComponent={RouterLink}>
          Away
        </Button>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('data-router')).toBe('yes');
    expect(screen.getByRole('link', { name: 'Away (opens in a new tab)' }).getAttribute('data-router')).toBeNull();
    expect(seen).toEqual(['/settings']);
  });

  it('builds its classes from variant and size', () => {
    expect(buttonClass()).toBe('kit-btn primary');
    expect(buttonClass({ variant: 'danger', size: 'lg', block: true })).toBe('kit-btn danger lg block');
    expect(buttonClass({ variant: 'ghost', size: 'sm', iconOnly: true })).toBe('kit-btn ghost sm icon');
    expect(buttonClass({ variant: 'secondary', stacked: true })).toBe('kit-btn secondary stacked');
    expect(buttonClass({ iconOnly: true, stacked: true })).toBe('kit-btn primary icon');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(
      <div>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger" loading>
          Remove
        </Button>
        <Button iconOnly label="Settings" icon={<svg />} />
        <Button href="/x" variant="ghost">
          Link
        </Button>
      </div>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});
