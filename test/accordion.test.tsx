import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Accordion } from '../src/index.ts';
import type { AccordionItem } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

const items: AccordionItem[] = [
  { id: 'fees', header: 'Fees', children: <p>No monthly fee.</p> },
  { id: 'limits', header: 'Limits', children: <p>NPR 500,000 a day.</p> },
  { id: 'closing', header: 'Closing', disabled: true, children: <p>Call us.</p> },
];

describe('Accordion', () => {
  it('has header buttons in headings with aria-expanded and aria-controls, and panels as labelled regions', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    const fees = screen.getByRole('button', { name: 'Fees' });
    expect(screen.getByRole('heading', { name: 'Fees', level: 3 }).contains(fees)).toBe(true);
    expect(fees.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('region')).toBeNull();
    await user.click(fees);
    expect(fees.getAttribute('aria-expanded')).toBe('true');
    const region = screen.getByRole('region', { name: 'Fees' });
    expect(fees.getAttribute('aria-controls')).toBe(region.id);
    expect(region.textContent).toContain('No monthly fee.');
  });

  it('toggles with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    screen.getByRole('button', { name: 'Fees' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Fees' }).getAttribute('aria-expanded')).toBe('true');
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Fees' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('single: opening one closes the other; collapsible=false keeps one open', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Accordion items={items} defaultValue={['fees']} />);
    await user.click(screen.getByRole('button', { name: 'Limits' }));
    expect(screen.getByRole('button', { name: 'Fees' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: 'Limits' }).getAttribute('aria-expanded')).toBe('true');
    rerender(<Accordion items={items} collapsible={false} defaultValue={['limits']} />);
    const limits = screen.getByRole('button', { name: 'Limits' });
    expect(limits.getAttribute('aria-disabled')).toBe('true');
    await user.click(limits);
    expect(limits.getAttribute('aria-expanded')).toBe('true');
  });

  it('multiple: several stay open', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} type="multiple" />);
    await user.click(screen.getByRole('button', { name: 'Fees' }));
    await user.click(screen.getByRole('button', { name: 'Limits' }));
    expect(screen.getAllByRole('region')).toHaveLength(2);
  });

  it('moves between headers with arrows, Home and End, skipping disabled ones', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    screen.getByRole('button', { name: 'Fees' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Limits' }));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Fees' }));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Limits' }));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Fees' }));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Limits' }));
  });

  it('does not toggle a disabled header', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    await user.click(screen.getByRole('button', { name: 'Closing' }));
    expect(screen.getByRole('button', { name: 'Closing' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('is controlled by value and reports onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(v: string[]) => void>();
    function Harness() {
      const [value, setValue] = useState<string[]>(['limits']);
      return (
        <Accordion
          items={items}
          value={value}
          onValueChange={(v) => {
            onValueChange(v);
            setValue(v);
          }}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Limits' }).getAttribute('aria-expanded')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Fees' }));
    expect(onValueChange).toHaveBeenCalledWith(['fees']);
    expect(screen.getByRole('button', { name: 'Fees' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('uses the heading level and drops regions past six panels', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ id: `i${i}`, header: `Item ${i}`, children: 'x' }));
    render(<Accordion items={many} headingLevel={2} type="multiple" defaultValue={['i0', 'i1']} />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(7);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<Accordion items={items} defaultValue={['fees']} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
