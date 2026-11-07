import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LinkProvider, LinkRow, LinkRowList, type LinkProps } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const List = () => (
  <LinkRowList label="Watchlist" testId="list">
    <LinkRow href="/stocks/NABIL" symbol="NABIL" name="Nabil Bank Limited" pill={<span>Banks</span>} line="Rs 1,250.00 · +1.2%" value="Rs 1,250" caption="Today" testId="r1" />
    <LinkRow href="https://example.com/x" title="Annual report" tone="warn" value="−56.82%" testId="r2" />
  </LinkRowList>
);

function Router({ href, children, ...rest }: LinkProps) {
  return <a href={href} data-router="yes" {...rest}>{children}</a>;
}

describe('LinkRow', () => {
  it('is a list of whole-row links, named by the list label', () => {
    render(<List />);
    expect(screen.getByRole('list', { name: 'Watchlist' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const row = screen.getByRole('link', { name: /NABIL/ });
    expect(row.getAttribute('href')).toBe('/stocks/NABIL');
    expect(row.textContent).toContain('Nabil Bank Limited');
    expect(row.textContent).toContain('Today');
  });

  it('the symbol never shrinks and the name may truncate (their classes), the value is a figure', () => {
    render(<List />);
    const row = screen.getByTestId('r1');
    expect(row.querySelector('b.sym')?.textContent).toBe('NABIL');
    expect(row.querySelector('.name')?.textContent).toBe('Nabil Bank Limited');
    expect(screen.getByTestId('r2').querySelector('.pu-linkrow-s b')?.className).toBe('warn');
  });

  it('uses the LinkProvider for in-app paths, a plain anchor for another site', () => {
    render(<LinkProvider component={Router}><List /></LinkProvider>);
    expect(screen.getByTestId('r1').getAttribute('data-router')).toBe('yes');
    expect(screen.getByTestId('r2').getAttribute('data-router')).toBeNull();
  });

  it('blocks an unsafe address', () => {
    render(<LinkRow href="javascript:alert(1)" title="Bad" testId="bad" />);
    expect(screen.getByTestId('bad').hasAttribute('href')).toBe(false);
    expect(screen.getByTestId('bad').getAttribute('aria-disabled')).toBe('true');
  });

  it('keyboard: Tab reaches each row and Enter follows it', async () => {
    const user = userEvent.setup();
    let clicked = '';
    render(<List />);
    for (const a of screen.getAllByRole('link')) a.addEventListener('click', (e) => { e.preventDefault(); clicked = a.getAttribute('href')!; });
    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId('r1'));
    await user.keyboard('{Enter}');
    expect(clicked).toBe('/stocks/NABIL');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId('r2'));
  });

  it('variants: tile, dense, lead, columns, ariaLabel; the deprecated muted tone equals neutral', () => {
    render(
      <LinkRowList columns={4} testId="c">
        <LinkRow href="/a" title="A" tile dense lead={<i data-testid="lead" />} ariaLabel="Open A" testId="a" value="x" tone="muted" />
        <LinkRow href="/b" title="B" value="x" tone="neutral" testId="b" />
      </LinkRowList>,
    );
    expect(screen.getByTestId('c').className).toBe('pu-linkrows cols');
    expect(screen.getByTestId('a').className).toBe('pu-linkrow tile has-lead dense');
    expect(screen.getByRole('link', { name: 'Open A' })).toBeTruthy();
    expect(screen.getByTestId('a').querySelector('.pu-linkrow-s b')?.className).toBe('muted');
    expect(screen.getByTestId('b').querySelector('.pu-linkrow-s b')?.className).toBe('muted');
  });

  it('renders on the server and has no serious axe violations', async () => {
    expect(renderToString(<List />)).toContain('pu-linkrow');
    const { container } = render(<List />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
