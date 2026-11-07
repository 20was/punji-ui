import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider, themeInitScript, useTheme } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

function Probe() {
  const { theme, resolvedTheme, setTheme, toggle } = useTheme();
  return (
    <div>
      <output data-testid="out">{`${theme}|${resolvedTheme}`}</output>
      <button onClick={toggle}>toggle</button>
      <button onClick={() => setTheme('system')}>system</button>
      <button onClick={() => setTheme('dark-hc')}>hc</button>
    </div>
  );
}

let dark = false;
const listeners = new Set<() => void>();

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = '';
  dark = false;
  listeners.clear();
  window.matchMedia = ((q: string) => ({
    matches: q.includes('dark') ? dark : false,
    media: q,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove()));

describe('ThemeProvider', () => {
  it('follows the system by default: no data-theme, and it tracks the device live', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('out').textContent).toBe('system|light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    dark = true;
    act(() => listeners.forEach((l) => l()));
    expect(screen.getByTestId('out').textContent).toBe('system|dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('uses defaultTheme until the reader chooses, then remembers the choice and applies it', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider defaultTheme="dark"><Probe /></ThemeProvider>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    await user.click(screen.getByText('toggle'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('punji-theme')).toBe('light');
    await user.click(screen.getByText('hc'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark-hc');
    await user.click(screen.getByText('toggle'));
    expect(screen.getByTestId('out').textContent).toBe('light-hc|light-hc');
  });

  it('reads a stored choice, ignores junk, and drops data-theme for system', async () => {
    window.localStorage.setItem('punji-theme', 'light');
    const user = userEvent.setup();
    const { unmount } = render(<ThemeProvider defaultTheme="dark"><Probe /></ThemeProvider>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    await user.click(screen.getByText('system'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    unmount();
    window.localStorage.setItem('punji-theme', 'banana');
    render(<ThemeProvider defaultTheme="dark"><Probe /></ThemeProvider>);
    expect(screen.getByTestId('out').textContent).toBe('dark|dark');
  });

  it('stays in step with another tab and honours a custom storage key', () => {
    render(<ThemeProvider storageKey="my-theme"><Probe /></ThemeProvider>);
    window.localStorage.setItem('my-theme', 'dark');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'my-theme', newValue: 'dark' }));
    });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('sets the theme-color meta from themeColors, and survives blocked storage', async () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const user = userEvent.setup();
    render(<ThemeProvider defaultTheme="dark" themeColors={{ dark: '#0a0c10', light: '#f2f2ef' }}><Probe /></ThemeProvider>);
    expect(meta.getAttribute('content')).toBe('#0a0c10');
    await user.click(screen.getByText('toggle'));
    expect(meta.getAttribute('content')).toBe('#f2f2ef');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    spy.mockRestore();
  });

  it('target themes one region and leaves the page and the meta alone', async () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#123456';
    document.head.append(meta);
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultTheme="light" target={() => document.getElementById('region')}>
        <div id="region" />
        <Probe />
      </ThemeProvider>,
    );
    expect(document.getElementById('region')?.getAttribute('data-theme')).toBe('light');
    await user.click(screen.getByText('hc'));
    expect(document.getElementById('region')?.getAttribute('data-theme')).toBe('dark-hc');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(meta.getAttribute('content')).toBe('#123456');
  });

  it('useTheme outside a provider throws a clear error', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ThemeProvider/);
    quiet.mockRestore();
  });

  it('renders on the server with the default and touches no browser API', () => {
    const html = renderToString(<ThemeProvider defaultTheme="dark"><Probe /></ThemeProvider>);
    expect(html).toContain('dark|dark');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

// Runs the script as a browser would, against this document and storage (an indirect eval: global scope).
function run(script: string): void {
  // eslint-disable-next-line no-eval -- the script is a string by design; this is the only way to execute it in the test
  (0, eval)(script);
}

describe('themeInitScript', () => {
  it('applies the stored theme before React, and the default when nothing is stored', () => {
    window.localStorage.setItem('punji-theme', 'light');
    run(themeInitScript({ defaultTheme: 'dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    window.localStorage.clear();
    run(themeInitScript({ defaultTheme: 'dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('removes data-theme for system, ignores a junk value and sets the meta colour when given', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    document.documentElement.setAttribute('data-theme', 'dark');
    window.localStorage.setItem('punji-theme', 'system');
    run(themeInitScript({ themeColors: { light: '#fff' } }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(meta.getAttribute('content')).toBe('#fff');
    window.localStorage.setItem('punji-theme', '"><script>');
    run(themeInitScript({ defaultTheme: 'light-hc' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light-hc');
  });

  it('is safe to inline: a hostile key cannot close the script, bad input is refused', () => {
    expect(themeInitScript({ storageKey: '</script><b>' })).not.toContain('</script');
    expect(() => themeInitScript({ defaultTheme: 'neon' as never })).toThrow(TypeError);
    expect(() => themeInitScript({ themeColors: { dark: 'red;}' } })).toThrow(TypeError);
  });

  it('does not throw when storage is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => run(themeInitScript({ defaultTheme: 'dark' }))).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    spy.mockRestore();
  });
});
