import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HeadlineList } from '../src/index.ts';
import { LinkProvider } from '../src/link/Link.tsx';
import { seriousViolations } from './axe.ts';

const ITEMS = [
  { key: 'a', title: 'NABIL announces a 12% cash dividend for FY 2081/82 and a book closure on 18 Oct', line: 'Company filing · 2 days ago', href: 'https://example.com/nabil' },
  { key: 'b', title: 'Board meeting on Sunday', line: 'NEPSE · 3 days ago' },
  { key: 'c', title: 'Unsafe address', href: 'javascript:alert(1)' },
];

describe('HeadlineList', () => {
  it('is a named list, newest first as given, with the source line under each headline', () => {
    render(<HeadlineList items={ITEMS} label="Latest headlines" testId="h" />);
    const list = screen.getByRole('list', { name: 'Latest headlines' });
    expect(list.querySelectorAll('li')).toHaveLength(3);
    expect(screen.getByText('Company filing · 2 days ago')).toBeTruthy();
  });
  it('opens another site in a new tab, said in words after the headline', () => {
    render(<HeadlineList items={ITEMS} label="Latest headlines" newTabLabel="(opens in a new tab)" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com/nabil');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.textContent).toContain('(opens in a new tab)');
    expect(link.textContent).toContain('NABIL announces a 12% cash dividend');
  });
  it('shows a headline with no address, or a non-http one, as plain text (never a link)', () => {
    render(<HeadlineList items={ITEMS} label="Latest headlines" />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('Board meeting on Sunday').closest('a')).toBeNull();
    expect(screen.getByText('Unsafe address').closest('a')).toBeNull();
  });
  it('says the new-tab words in the reader’s language', () => {
    render(<HeadlineList items={[ITEMS[0]!]} label="समाचार" newTabLabel="(नयाँ ट्याबमा खुल्छ)" />);
    expect(screen.getByRole('link').textContent).toContain('(नयाँ ट्याबमा खुल्छ)');
  });
  it('is not routed through a LinkProvider (another site is always a plain link)', () => {
    render(<LinkProvider component={({ href, children, ...rest }) => <a data-routed="" href={href} {...rest}>{children}</a>}><HeadlineList items={[ITEMS[0]!]} label="x" /></LinkProvider>);
    expect(screen.getByRole('link').hasAttribute('data-routed')).toBe(false);
  });
  it('an empty list is an empty named list', () => {
    render(<HeadlineList items={[]} label="Latest headlines" />);
    expect(screen.getByRole('list', { name: 'Latest headlines' }).children).toHaveLength(0);
  });
  it('has no serious axe violations', async () => {
    const { container } = render(<HeadlineList items={ITEMS} label="Latest headlines" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
