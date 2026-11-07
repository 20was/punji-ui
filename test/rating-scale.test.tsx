import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RatingChangeHead, RatingChangeList, RatingChangeRow, RatingChip, RatingScale, scaleBucket } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

describe('scaleBucket', () => {
  it('spreads any scale over the five tints, lowest to highest', () => {
    expect([0, 1, 2, 3, 4].map((s) => scaleBucket(s))).toEqual([0, 1, 2, 3, 4]);
    expect([0, 1, 2].map((s) => scaleBucket(s, 3))).toEqual([0, 2, 4]);
    expect([0, 1].map((s) => scaleBucket(s, 2))).toEqual([0, 4]);
    expect([0, 3, 6].map((s) => scaleBucket(s, 7))).toEqual([0, 2, 4]);
  });
  it('clamps a step outside the scale and treats a one-step scale as the middle', () => {
    expect(scaleBucket(-3, 5)).toBe(0);
    expect(scaleBucket(9, 5)).toBe(4);
    expect(scaleBucket(0, 1)).toBe(2);
  });
});

describe('RatingChip', () => {
  it('prints its word and the step’s tint bucket', () => {
    render(<RatingChip step={4} testId="c">Strongly agree</RatingChip>);
    const chip = screen.getByTestId('c');
    expect(chip.textContent).toBe('Strongly agree');
    expect(chip.getAttribute('data-bucket')).toBe('4');
    expect(chip.getAttribute('data-step')).toBe('4');
  });
  it('is the quiet outline with no step', () => {
    render(<RatingChip step={null} testId="c">Not rated</RatingChip>);
    expect(screen.getByTestId('c').hasAttribute('data-quiet')).toBe(true);
    expect(screen.getByTestId('c').hasAttribute('data-bucket')).toBe(false);
  });
  it('follows a three-step scale and a small size', () => {
    render(<RatingChip step={2} steps={3} size="sm" testId="c">High</RatingChip>);
    expect(screen.getByTestId('c').getAttribute('data-bucket')).toBe('4');
    expect(screen.getByTestId('c').getAttribute('data-size')).toBe('sm');
  });
});

describe('RatingScale', () => {
  it('fills the step it is on and outlines the step it came from', () => {
    render(<RatingScale value={3} from={1} testId="s" />);
    const segments = [...screen.getByTestId('s').querySelectorAll('i')];
    expect(segments).toHaveLength(5);
    expect(segments.map((i) => i.getAttribute('data-state'))).toEqual([null, 'was', null, 'on', null]);
  });
  it('is decorative unless it has a label, then an image with that name', () => {
    const { rerender } = render(<RatingScale value={2} testId="s" />);
    expect(screen.getByTestId('s').getAttribute('aria-hidden')).toBe('true');
    rerender(<RatingScale value={2} label="Rated 3 of 5" testId="s" />);
    expect(screen.getByRole('img', { name: 'Rated 3 of 5' })).toBeTruthy();
  });
  it('draws N steps, from steps or the legend', () => {
    const { rerender } = render(<RatingScale value={1} steps={3} testId="s" />);
    expect(screen.getByTestId('s').querySelectorAll('i')).toHaveLength(3);
    rerender(<RatingScale legend={['Low', 'Medium', 'High', 'Very high']} label="Risk" testId="s" />);
    expect(screen.getByRole('group', { name: 'Risk' }).querySelectorAll('i')).toHaveLength(4);
  });
  it('with a legend every step is filled and named under the bar, in order', () => {
    render(<RatingScale legend={['A', 'B', 'C', 'D', 'E']} label="Scale" />);
    const segments = [...screen.getByRole('group', { name: 'Scale' }).querySelectorAll('i')];
    expect(segments.every((i) => i.getAttribute('data-state') === 'on')).toBe(true);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
  it('is never green or red: the tints are the amber, grey and blue buckets, not gain or loss', () => {
    render(<RatingScale value={0} testId="s" />);
    expect(screen.getByTestId('s').innerHTML).not.toMatch(/gain|loss/);
  });
});

describe('RatingChangeRow', () => {
  const from = { step: 2, label: 'Neutral' };
  const to = { step: 3, label: 'Mildly bullish' };
  it('shows the move as two chips and a scale, the figure and the words under it', () => {
    render(<ul><RatingChangeRow title="NABIL" line="Nabil Bank" from={from} to={to} figure="Rs 512.30" figureSub="Getting stronger" testId="r" /></ul>);
    expect(screen.getByText('Neutral')).toBeTruthy();
    expect(screen.getByText('Mildly bullish')).toBeTruthy();
    expect(screen.getByTestId('r-value').textContent).toBe('Rs 512.30');
    expect(screen.getByText('Getting stronger')).toBeTruthy();
    expect(screen.getByTestId('r').querySelector('.pu-rating-scale i[data-state="was"]')).toBeTruthy();
  });
  it('reads the move as one phrase in the chips’ place when moveLabel is given', () => {
    render(<ul><RatingChangeRow title="NABIL" from={from} to={to} moveLabel="Neutral to Mildly bullish" testId="r" /></ul>);
    expect(screen.getByText('Neutral to Mildly bullish').className).toBe('kit-sr');
    expect(screen.getByText('Neutral').closest('[aria-hidden="true"]')).toBeTruthy();
  });
  it('is a link with href, a button with onClick, and plain otherwise', () => {
    const onClick = vi.fn<() => void>();
    const { rerender } = render(<ul><RatingChangeRow title="NABIL" to={to} href="/stocks/nabil" testId="r" /></ul>);
    expect(screen.getByTestId('r').tagName).toBe('A');
    expect(screen.getByTestId('r').getAttribute('href')).toBe('/stocks/nabil');
    rerender(<ul><RatingChangeRow title="NABIL" to={to} onClick={onClick} testId="r" /></ul>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<ul><RatingChangeRow title="NABIL" to={to} testId="r" /></ul>);
    expect(screen.getByTestId('r').tagName).toBe('DIV');
  });
  it('a held row draws one chip and no scale', () => {
    render(<ul><RatingChangeRow variant="held" title="NABIL" line="Nabil Bank" to={to} testId="r" /></ul>);
    expect(screen.getByTestId('r').querySelector('.pu-rating-scale')).toBeNull();
    expect(screen.getAllByText('Mildly bullish')).toHaveLength(1);
  });
  it('a list names itself by its title or its label, with a head that is hidden from assistive technology', () => {
    const { container } = render(
      <>
        <RatingChangeHead item="Stock" move="Rating" scale="Scale" figure="Price" testId="head" />
        <RatingChangeList title="Moved up" count={2} headingLevel={2}><RatingChangeRow title="NABIL" to={to} /></RatingChangeList>
        <RatingChangeList label="Held"><RatingChangeRow variant="held" title="NICA" to={to} /></RatingChangeList>
      </>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Moved up' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Held' })).toBeTruthy();
    expect(screen.getByTestId('head').getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });
  it('has no serious axe violations', async () => {
    const { container } = render(
      <RatingChangeList title="Moved up" icon={<svg />} count={1}>
        <RatingChangeRow icon={<svg />} title="NABIL" line="Nabil Bank" from={from} to={to} moveLabel="Neutral to Mildly bullish" figure="Rs 512.30" href="/x" />
      </RatingChangeList>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});
