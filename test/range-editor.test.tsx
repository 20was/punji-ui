import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FilterPopover, RangeEditor, type RangeEditorProps } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

function Editor(props: Partial<RangeEditorProps> & { start?: [string, string] }) {
  const [from, setFrom] = useState(props.start?.[0] ?? '');
  const [to, setTo] = useState(props.start?.[1] ?? '');
  const { start: _start, ...rest } = props;
  return <RangeEditor from={from} to={to} onFrom={setFrom} onTo={setTo} onClear={() => (setFrom(''), setTo(''))} applyLabel="Show 3 stocks" onApply={() => {}} testIdPrefix="re" {...rest} />;
}

describe('RangeEditor', () => {
  it('has From and To fields, Clear and the result as the action', async () => {
    const onApply = vi.fn<() => void>();
    render(<Editor onApply={onApply} why="Price to book value." />);
    await userEvent.type(screen.getByLabelText('From'), '0.5');
    await userEvent.type(screen.getByLabelText('To'), '1.2');
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('0.5');
    await userEvent.click(screen.getByRole('button', { name: 'Show 3 stocks' }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Show 3 stocks' })).toHaveAccessibleDescription('Price to book value.');
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('');
  });

  it('says why a range cannot work under To and turns the action off', () => {
    render(<Editor start={['5', '2']} error="To must be at least From." />);
    expect(screen.getByRole('alert').textContent).toBe('To must be at least From.');
    expect(screen.getByRole('button', { name: 'Show 3 stocks' })).toBeDisabled();
  });

  it('turns the action off for another reason with applyOff', () => {
    render(<Editor applyOff />);
    expect(screen.getByRole('button', { name: 'Show 3 stocks' })).toBeDisabled();
  });

  it('presets fill both ends and show which one is pressed', async () => {
    const presets = [
      { id: 'cheap', label: 'Under 12', from: '', to: '12' },
      { id: 'mid', label: '12 to 25', from: '12', to: '25' },
    ];
    render(<Editor presets={presets} />);
    const cheap = screen.getByRole('button', { name: 'Under 12' });
    expect(cheap).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(cheap);
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('12');
    expect(cheap).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByTestId('re-preset-mid'));
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('12');
    expect(cheap).toHaveAttribute('aria-pressed', 'false');
  });

  describe('slider', () => {
    const track = { min: '0', max: '1', step: '0.1' };
    it('writes the ends back as exact decimals, not floats', async () => {
      render(<Editor track={track} />);
      const lo = screen.getByLabelText('From (slider)');
      // A native range input: the browser moves it by keyboard; jsdom only reports the change.
      fireEvent.change(lo, { target: { value: '3' } });
      // 3 steps of 0.1 is 0.3 exactly (0.1 * 3 in floats is 0.30000000000000004).
      expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('0.3');
      const hi = screen.getByLabelText('To (slider)');
      fireEvent.change(hi, { target: { value: '9' } });
      expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('0.9');
    });

    it('follows the typed ends, says "No limit" at the track ends and uses the unit formatter', async () => {
      render(<Editor track={{ min: '0', max: '100', step: '5' }} formatTrackValue={(v) => `${v}%`} start={['20', '']} />);
      const lo = screen.getByLabelText('From (slider)');
      const hi = screen.getByLabelText('To (slider)');
      expect(lo).toHaveValue('4');
      expect(lo).toHaveAttribute('aria-valuetext', '20%');
      expect(hi).toHaveAttribute('aria-valuetext', 'No limit');
      await userEvent.type(screen.getByLabelText('To'), '60');
      expect(hi).toHaveValue('12');
      expect(hi).toHaveAttribute('aria-valuetext', '60%');
    });

    it('sets an end back to "no limit" when a thumb reaches the end of the track', async () => {
      render(<Editor track={track} start={['', '0.9']} />);
      const hi = screen.getByLabelText('To (slider)');
      fireEvent.change(hi, { target: { value: '10' } });
      expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('');
    });

    it('draws no slider for a track that is not whole steps', () => {
      render(<Editor track={{ min: '0', max: '1', step: '0.3' }} />);
      expect(screen.queryByLabelText('From (slider)')).toBeNull();
    });

    it('handles negative tracks', async () => {
      render(<Editor track={{ min: '-20', max: '45', step: '5' }} start={['-20', '']} />);
      const lo = screen.getByLabelText('From (slider)');
      fireEvent.change(lo, { target: { value: '1' } });
      expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('-15');
    });
  });

  it('renders the chart the page hands in under its title', () => {
    render(<Editor chartTitle="Where the market sits" chart={<figure aria-label="histogram" />} />);
    expect(screen.getByText('Where the market sits')).toBeTruthy();
    expect(screen.getByRole('figure', { name: 'histogram' })).toBeTruthy();
  });

  it('has no serious axe violations, with every part', async () => {
    const { container } = render(<Editor why="Why." chartTitle="Chart" chart={<figure aria-label="c" />} presets={[{ id: 'a', label: 'A', from: '1', to: '2' }]} track={{ min: '0', max: '10', step: '1' }} error="Bad." />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

function Pop({ onClose }: { onClose: (refocus?: boolean) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button ref={ref} onClick={() => setOpen((o) => !o)}>
        Opener
      </button>
      <FilterPopover open={open} title="P/B" anchor={ref} onClose={(r) => (onClose(r), setOpen(false))} testId="pop">
        <Editor />
      </FilterPopover>
      <button>Elsewhere</button>
    </div>
  );
}

describe('FilterPopover', () => {
  it('is a named dialog with a heading and a close button, and starts in the first field', () => {
    render(<Pop onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'P/B' });
    expect(dialog).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'P/B' })).toBeTruthy();
    expect(screen.getByLabelText('From')).toHaveFocus();
  });

  it('Esc closes it and returns focus to the opener', async () => {
    const onClose = vi.fn<(refocus?: boolean) => void>();
    render(<Pop onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Opener' })).toHaveFocus();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the close button closes it with focus back', async () => {
    const onClose = vi.fn<(refocus?: boolean) => void>();
    render(<Pop onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('a click outside closes it without taking focus back', async () => {
    const onClose = vi.fn<(refocus?: boolean) => void>();
    render(<Pop onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(onClose).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
  });

  it('takes an element as its anchor too, and a custom close label', () => {
    const el = document.createElement('button');
    document.body.append(el);
    render(
      <FilterPopover title="Add filter" anchor={el} closeLabel="Shut" onClose={() => {}}>
        <p>Body</p>
      </FilterPopover>,
    );
    expect(screen.getByRole('button', { name: 'Shut' })).toBeTruthy();
    el.remove();
  });

  it('has no serious axe violations', async () => {
    render(<Pop onClose={() => {}} />);
    expect(await seriousViolations(screen.getByRole('dialog'))).toEqual([]);
  });
});
