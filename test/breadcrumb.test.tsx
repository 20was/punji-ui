import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Breadcrumb, LinkProvider, PunjiLocaleProvider } from '../src/index.ts';
import type { LinkComponent } from '../src/index.ts';
import { ne } from '../src/locale/ne.ts';
import { seriousViolations } from './axe.ts';

afterEach(() => vi.restoreAllMocks());

const Routed: LinkComponent = ({ href, children, ...rest }) => (
  <a {...rest} href={href} data-routed="yes">
    {children}
  </a>
);

const trail = [
  { label: 'Accounts', href: '/accounts' },
  { label: 'Savings', href: '/accounts/savings' },
  { label: 'Joint', href: '/accounts/savings/joint' },
  { label: 'Statement' },
];

describe('Breadcrumb', () => {
  it('is a named nav with an ordered list and the last item as the current page', () => {
    render(<Breadcrumb items={trail} testId="bc" />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getAllByRole('listitem')).toHaveLength(4);
    expect(nav.querySelector('ol')).not.toBeNull();
    expect(screen.getByText('Statement').getAttribute('aria-current')).toBe('page');
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Accounts' }).hasAttribute('aria-current')).toBe(false);
  });

  it('hides the separators from screen readers', () => {
    const { container } = render(<Breadcrumb items={trail} />);
    const seps = container.querySelectorAll('.pu-breadcrumb-sep');
    expect(seps).toHaveLength(3);
    seps.forEach((s) => expect(s.getAttribute('aria-hidden')).toBe('true'));
  });

  it('can make the current page a link and still marks it current', () => {
    render(<Breadcrumb items={[{ label: 'Accounts', href: '/a' }, { label: 'Savings', href: '/a/s' }]} />);
    expect(screen.getByRole('link', { name: 'Savings' }).getAttribute('aria-current')).toBe('page');
  });

  it('routes links through the LinkProvider and applies safeHref', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <LinkProvider component={Routed}>
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Bad', href: 'javascript:alert(1)' }, { label: 'Here' }]} />
      </LinkProvider>,
    );
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('data-routed')).toBe('yes');
    expect(screen.getByText('Bad').closest('a')!.hasAttribute('href')).toBe(false);
  });

  it('takes its words from labels or the locale pack', () => {
    const { rerender } = render(<Breadcrumb items={trail} labels={{ nav: 'Path' }} />);
    expect(screen.getByRole('navigation', { name: 'Path' })).toBeTruthy();
    rerender(
      <PunjiLocaleProvider locale={ne}>
        <Breadcrumb items={trail} />
      </PunjiLocaleProvider>,
    );
    expect(screen.getByRole('navigation', { name: ne.messages.breadcrumb!.nav! })).toBeTruthy();
  });

  it('collapses the middle levels into a menu of links past maxItems', async () => {
    const user = userEvent.setup();
    render(<Breadcrumb items={trail} maxItems={3} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).queryByRole('link', { name: 'Savings' })).toBeNull();
    expect(within(nav).getByRole('link', { name: 'Accounts' })).toBeTruthy();
    expect(within(nav).getByText('Statement').getAttribute('aria-current')).toBe('page');
    await user.click(screen.getByRole('button', { name: 'Show hidden levels' }));
    expect(screen.getByRole('menuitem', { name: 'Savings' }).getAttribute('href')).toBe('/accounts/savings');
    expect(screen.getByRole('menuitem', { name: 'Joint' })).toBeTruthy();
  });

  it('has no serious axe violations, collapsed or not', async () => {
    const { container, rerender } = render(<Breadcrumb items={trail} />);
    expect(await seriousViolations(container)).toEqual([]);
    rerender(<Breadcrumb items={trail} maxItems={3} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
