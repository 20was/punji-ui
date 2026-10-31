import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodeBlock, Cluster, Stack } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const setClipboard = (value: unknown) => Object.defineProperty(navigator, 'clipboard', { configurable: true, value });
afterEach(() => Reflect.deleteProperty(navigator, 'clipboard'));

describe('Stack and Cluster', () => {
  it('render a div with the default gap and no alignment attributes', () => {
    render(<><Stack testId="s">a</Stack><Cluster testId="c">b</Cluster></>);
    const s = screen.getByTestId('s');
    expect(s.tagName).toBe('DIV');
    expect(s.className).toBe('pu-stack');
    expect(s.getAttribute('data-gap')).toBe('3');
    expect(s.hasAttribute('data-align')).toBe(false);
    const c = screen.getByTestId('c');
    expect(c.className).toBe('pu-cluster');
    expect(c.hasAttribute('data-justify')).toBe(false);
    expect(c.hasAttribute('data-align')).toBe(false);
  });
  it('pass gap, align and justify through as data attributes', () => {
    render(<><Stack gap={16} align="end" testId="s">a</Stack><Cluster gap={1} justify="between" align="baseline" testId="c">b</Cluster></>);
    expect(screen.getByTestId('s').dataset).toMatchObject({ gap: '16', align: 'end' });
    expect(screen.getByTestId('c').dataset).toMatchObject({ gap: '1', justify: 'between', align: 'baseline' });
  });
  it('render as the element asked for, keep native attributes and merge className', () => {
    render(
      <>
        <Stack as="ul" aria-label="Steps" className="mine" testId="ul"><li>one</li></Stack>
        <Cluster as="nav" aria-label="Pages"><a href="/a">A</a></Cluster>
        <Stack as="fieldset"><legend>Lines</legend>x</Stack>
      </>,
    );
    expect(screen.getByTestId('ul').tagName).toBe('UL');
    expect(screen.getByTestId('ul').className).toBe('pu-stack mine');
    expect(screen.getByRole('list', { name: 'Steps' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Pages' }).className).toBe('pu-cluster');
    expect(screen.getByRole('group', { name: 'Lines' }).tagName).toBe('FIELDSET');
  });
  it('have no serious axe violations', async () => {
    const { container } = render(<Stack as="section" aria-label="Group"><Cluster as="ul" aria-label="Tags"><li>one</li><li>two</li></Cluster></Stack>);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('CodeBlock', () => {
  it('shows the text exactly, with the label naming the figure', () => {
    render(<CodeBlock label="transactions.csv" testId="cb">{'date,amount\n2082-01-02,100.00'}</CodeBlock>);
    expect(screen.getByRole('figure', { name: 'transactions.csv' })).toBe(screen.getByTestId('cb'));
    expect(screen.getByTestId('cb').querySelector('pre code')?.textContent).toBe('date,amount\n2082-01-02,100.00');
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('takes a name from aria-label when there is no label', () => {
    render(<CodeBlock aria-label="Raw CSV">a,b</CodeBlock>);
    expect(screen.getByRole('figure', { name: 'Raw CSV' })).toBeTruthy();
  });
  it('copies the text only when Copy is pressed, and announces it', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const { container } = render(<CodeBlock copy label="Export">{'a,b\n1,2'}</CodeBlock>);
    await user.hover(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledExactlyOnceWith('a,b\n1,2');
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Copied');
  });
  it('reports a refused copy and uses the given words', async () => {
    const user = userEvent.setup();
    setClipboard({ writeText: vi.fn<(text: string) => Promise<void>>().mockRejectedValue(new Error('no')) });
    const { container } = render(<CodeBlock copy labels={{ copy: 'प्रतिलिपि', copyFailed: 'असफल' }}>x</CodeBlock>);
    await user.click(screen.getByRole('button', { name: 'प्रतिलिपि' }));
    expect(container.querySelector('[role="status"]')?.textContent).toBe('असफल');
  });
  it('disables Copy where the browser has no clipboard', () => {
    render(<CodeBlock copy>x</CodeBlock>);
    expect((screen.getByRole('button', { name: 'Copy' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('has no serious axe violations', async () => {
    const { container } = render(<CodeBlock copy label="Export">{'a,b'}</CodeBlock>);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
