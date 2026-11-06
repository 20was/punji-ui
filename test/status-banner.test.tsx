import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LinkProvider, PunjiLocaleProvider, StatusBanner, type LinkComponent } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(cleanup);

describe('StatusBanner', () => {
  it('is a polite status for info and warn, and an assertive alert for danger', () => {
    const { rerender } = render(<StatusBanner title="Markets are closed">Orders queue until 11:00.</StatusBanner>);
    expect(screen.getByRole('status').textContent).toBe('Markets are closedOrders queue until 11:00.');
    rerender(<StatusBanner tone="warn">Prices are delayed.</StatusBanner>);
    expect(screen.getByRole('status')).toBeTruthy();
    rerender(<StatusBanner tone="danger">Payments are failing.</StatusBanner>);
    expect(screen.getByRole('alert').textContent).toBe('Payments are failing.');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('has an icon for every tone so the tone is never colour alone', () => {
    for (const tone of ['info', 'warn', 'danger'] as const) {
      const { unmount } = render(<StatusBanner tone={tone} testId="b">Notice</StatusBanner>);
      expect(screen.getByTestId('b').querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      unmount();
    }
  });

  it('dismisses uncontrolled by keyboard, and calls onOpenChange', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<StatusBanner dismissible onOpenChange={onOpenChange} testId="b">Maintenance tonight.</StatusBanner>);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Dismiss' }));
    await user.keyboard('{Enter}');
    expect(screen.queryByTestId('b')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('is controlled with `open`: stays until the parent closes it', async () => {
    const user = userEvent.setup();
    function Host() {
      const [open, setOpen] = useState(true);
      return <><StatusBanner dismissible open={open} onOpenChange={setOpen} testId="b">Hello</StatusBanner><button type="button" onClick={() => setOpen(true)}>Reopen</button></>;
    }
    render(<Host />);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByTestId('b')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(screen.getByTestId('b')).toBeTruthy();
    cleanup();
    render(<StatusBanner dismissible open testId="b">Fixed</StatusBanner>);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.getByTestId('b')).toBeTruthy();
  });

  it('can start closed', () => {
    render(<StatusBanner defaultOpen={false} testId="b">Hidden</StatusBanner>);
    expect(screen.queryByTestId('b')).toBeNull();
  });

  it('renders the action as a button or as a link through the LinkProvider', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn<() => void>();
    const { rerender } = render(<StatusBanner action={{ label: 'Retry', onClick }} testId="b">Down.</StatusBanner>);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    const Router: LinkComponent = ({ href, children, ...rest }) => <a {...rest} href={href} data-router="yes">{children}</a>;
    rerender(<LinkProvider component={Router}><StatusBanner action={{ label: 'Status page', href: '/status' }} testId="b">Down.</StatusBanner></LinkProvider>);
    const link = screen.getByRole('link', { name: 'Status page' });
    expect(link.getAttribute('href')).toBe('/status');
    expect(link.getAttribute('data-router')).toBe('yes');
    expect(screen.getByTestId('b-action')).toBe(link);
  });

  it('blocks an unsafe action address', () => {
    render(<StatusBanner action={{ label: 'Go', href: 'javascript:alert(1)' }}>Down.</StatusBanner>);
    expect(screen.getByText('Go').closest('a')?.getAttribute('href')).toBeNull();
  });

  it('adds the sticky class and reads its dismiss label from the locale messages', () => {
    render(
      <PunjiLocaleProvider messages={{ statusBanner: { dismiss: 'Hatau' } }}>
        <StatusBanner sticky dismissible testId="b">Notice</StatusBanner>
      </PunjiLocaleProvider>,
    );
    expect(screen.getByTestId('b').className).toContain('sticky');
    expect(screen.getByRole('button', { name: 'Hatau' })).toBeTruthy();
  });

  it('has no serious axe violations in any tone', async () => {
    const { container } = render(
      <>
        <StatusBanner title="Info" action={{ label: 'Details', href: '/s' }} dismissible>Body</StatusBanner>
        <StatusBanner tone="warn" sticky>Warn</StatusBanner>
        <StatusBanner tone="danger" dismissible>Danger</StatusBanner>
      </>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});
