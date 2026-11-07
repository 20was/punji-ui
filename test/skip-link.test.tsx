import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SkipLink } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const Page = ({ id = 'main' }: { id?: string }) => (
  <>
    <SkipLink testId="s" />
    <button>Menu</button>
    <main id={id}>
      <h1>Markets</h1>
      <a href="/x">First link</a>
    </main>
  </>
);

describe('SkipLink', () => {
  it('is the first thing Tab reaches, and reads "Skip to content"', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Skip to content' }));
    expect(document.activeElement?.className).toBe('pu-skip-link');
  });

  it('Enter moves focus into the target, so the next Tab starts in the content', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.tab();
    await user.keyboard('{Enter}');
    const main = document.getElementById('main')!;
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute('tabindex')).toBe('-1');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'First link' }));
  });

  it('takes its own target, words and class; a missing target does nothing and does not throw', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink href="#content" label="मुख्य सामग्रीमा जानुहोस्" className="extra" testId="s" />
        <div id="content" />
      </>,
    );
    const link = screen.getByTestId('s');
    expect(link.getAttribute('href')).toBe('#content');
    expect(link.textContent).toBe('मुख्य सामग्रीमा जानुहोस्');
    expect(link.className).toBe('pu-skip-link extra');
    await user.click(link);
    expect(document.activeElement).toBe(document.getElementById('content'));
    render(<SkipLink href="#nowhere" testId="t" />);
    await user.click(screen.getByTestId('t'));
  });

  it('renders on the server', () => {
    expect(renderToString(<SkipLink />)).toContain('href="#main"');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<Page />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
