import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AlertRowCompact, AlertSummary, AlertSummaryNote, AlertSummarySection } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

describe('AlertSummary', () => {
  it('names the card by its figure, with the label and the line under it', () => {
    render(<AlertSummary label="Price alerts" value="4 active" sub="1 paused · 1 triggered" headingId="as" testId="s" />);
    const card = screen.getByRole('region', { name: '4 active' });
    expect(card).toBe(screen.getByTestId('s'));
    expect(card.textContent).toContain('Price alerts');
    expect(card.textContent).toContain('1 paused · 1 triggered');
    expect(screen.getByRole('heading', { level: 2 }).id).toBe('as');
  });
  it('with no count it draws no figure and is named by its label', () => {
    render(<AlertSummary label="Price alerts" value="" sub="Prices could not load" />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByRole('region', { name: 'Price alerts' })).toBeTruthy();
  });
  it('holds the figures’ shapes while loading, with the label kept', () => {
    const { container } = render(<AlertSummary label="Price alerts" value="4 active" loading headingId="as" testId="s" />);
    expect(screen.getByTestId('s').getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Price alerts')).toBeTruthy();
    expect(container.querySelectorAll('.kit-skel')).toHaveLength(2);
    expect(screen.queryByText('4 active')).toBeNull();
  });
  it('is on the inverse surface and holds sections of compact rows or a quiet note', () => {
    render(
      <AlertSummary label="Price alerts" value="2 active">
        <AlertSummarySection title="Closest to firing" testId="sec">
          <AlertRowCompact title={<><b>HRL</b> above Rs 500</>} aside="1.26% to go" status="waiting" closeness={0.87} />
        </AlertSummarySection>
        <AlertSummarySection title="Fired lately"><AlertSummaryNote>Fills in when prices load</AlertSummaryNote></AlertSummarySection>
      </AlertSummary>,
    );
    expect(screen.getByRole('region').className).toContain('kit-inv');
    expect(screen.getByRole('heading', { level: 3, name: 'Closest to firing' })).toBeTruthy();
    expect(screen.getByText('Fills in when prices load')).toBeTruthy();
  });
  it('never renders an empty heading, in any state, and axe finds no empty-heading', async () => {
    const states = [
      <AlertSummary key="a" label="Price alerts" value="" loading />,
      <AlertSummary key="b" label="Price alerts" value="4 active" loading />,
      <AlertSummary key="c" label="Price alerts" value="" sub="Prices could not load" />,
      <AlertSummary key="d" label="Price alerts" value="4 active" />,
    ];
    for (const state of states) {
      const { container, unmount } = render(state);
      for (const h of container.querySelectorAll('h1,h2,h3,h4,h5,h6')) expect((h.textContent ?? '').trim()).not.toBe('');
      const axe = (await import('axe-core')).default;
      const result = await axe.run(container, { runOnly: ['empty-heading'] });
      expect(result.violations).toEqual([]);
      unmount();
    }
  });
  it('has no serious axe violations', async () => {
    const { container } = render(
      <AlertSummary label="Price alerts" value="2 active" sub="none paused">
        <AlertSummarySection title="Closest to firing"><AlertRowCompact title="HRL" aside="1.26% to go" status="waiting" closeness={0.87} href="/a" /></AlertSummarySection>
      </AlertSummary>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});
