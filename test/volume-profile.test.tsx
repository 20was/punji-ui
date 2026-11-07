import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProfileRail, VolumeProfile, volumeProfile, type ProfileBar } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const widthOf = (px: number) => vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(px);
const bar = (low: string, high: string, volume: bigint, buyVolume?: bigint): ProfileBar => ({ low, high, volume, buyVolume });
const BARS = [bar('100', '104', 4000n, 2500n), bar('102', '106', 9000n, 3000n), bar('104', '108', 5000n, 4000n), bar('106', '110', 2000n, 500n), bar('101', '101', 123456789012345678901n, 100000000000000000000n)];
const live = (c: HTMLElement) => c.querySelector('[role="status"]')!.textContent!.replaceAll(' ', ' ');

describe('VolumeProfile', () => {
  it('draws one bar per band, marks the Point of Control and the value area lines in words', () => {
    widthOf(520);
    const { container } = render(<VolumeProfile bars={BARS} rows={10} label="Volume at price" />);
    expect(container.querySelectorAll('.pu-vp-bar').length).toBe(10);
    expect(container.querySelectorAll('.pu-vp-bar.in').length).toBeGreaterThan(0);
    expect(container.querySelector('.pu-vp-poc-line')).not.toBeNull();
    const tags = [...container.querySelectorAll('.pu-vp-tags text')].map((t) => t.textContent);
    expect(tags).toEqual(['VAH', 'VAL', 'POC']);
    expect(container.querySelectorAll('.pu-vp-sell').length).toBe(10);
  });

  it('keeps bigint volumes exact in the table and the spoken summary', () => {
    widthOf(520);
    const { container } = render(<VolumeProfile bars={BARS} rows={10} label="Volume at price" locale="en-US" />);
    const total = BARS.reduce((s, b) => s + (b.volume as bigint), 0n);
    expect(total.toLocaleString('en-US')).toBe('123,456,789,012,345,698,901');
    const sum = [...container.querySelectorAll('tbody tr')].reduce((s, tr) => s + BigInt(tr.children[1]!.textContent!.replaceAll(',', '')), 0n);
    expect(sum).toBe(total);
    expect(container.textContent).toContain(`total volume ${total.toLocaleString('en-US')}`);
  });

  it('draws buy and sell as two parts only when asked and available', () => {
    widthOf(520);
    const { container, rerender } = render(<VolumeProfile bars={BARS} rows={6} label="p" split={false} />);
    expect(container.querySelectorAll('.pu-vp-sell').length).toBe(0);
    expect(container.querySelectorAll('.pu-vp-total').length).toBe(6);
    rerender(<VolumeProfile bars={[bar('1', '2', 5n)]} rows={4} label="p" />);
    expect(container.querySelectorAll('.pu-vp-sell').length).toBe(0);
  });

  it('steps price bands with Up and Down, jumps with Home and End, and speaks each band', async () => {
    widthOf(520);
    const user = userEvent.setup();
    const { container } = render(<VolumeProfile bars={BARS} rows={5} label="Volume at price" />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Volume at price' }));
    expect(live(container)).toMatch(/^108 to 110/);
    await user.keyboard('{ArrowDown}');
    expect(live(container)).toMatch(/^106 to 108/);
    await user.keyboard('{Home}');
    expect(live(container)).toMatch(/^100 to 102/);
    await user.keyboard('{ArrowUp}');
    expect(live(container)).toMatch(/^102 to 104/);
    await user.keyboard('{End}');
    expect(live(container)).toMatch(/^108 to 110/);
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('');
  });

  it('lists bands from the highest price down with their role', () => {
    widthOf(520);
    const { container } = render(<VolumeProfile bars={BARS} rows={5} label="p" />);
    const rows = [...container.querySelectorAll('tbody tr')].map((r) => r.children[0]!.textContent);
    expect(rows[0]).toMatch(/^108/);
    const roles = [...container.querySelectorAll('tbody tr')].map((r) => r.lastElementChild!.textContent);
    expect(roles).toContain('Point of Control');
    expect(roles.filter((r) => r === 'Outside the value area').length + roles.filter((r) => r !== 'Outside the value area').length).toBe(5);
  });

  it('accepts a built profile, and says so when there is nothing to show', () => {
    widthOf(520);
    const profile = volumeProfile(BARS, { rows: 4, valueArea: '0.5' });
    const { container } = render(<VolumeProfile profile={profile} label="p" />);
    expect(container.querySelectorAll('.pu-vp-bar').length).toBe(4);
    cleanup();
    render(<VolumeProfile bars={[]} label="empty" />);
    expect(screen.getByRole('status').textContent).toBe('No volume to show.');
  });

  it('has no serious axe violations', async () => {
    widthOf(520);
    const { container } = render(<VolumeProfile bars={BARS} rows={8} label="Volume at price" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('ProfileRail', () => {
  it('cuts its bands from the price domain so a band sits level with the same price', () => {
    widthOf(110);
    const { container } = render(<ProfileRail bars={BARS} priceDomain={{ min: '96', max: '112' }} rows={8} height={320} paddingTop={10} paddingBottom={30} label="Rail" />);
    const bands = [...container.querySelectorAll('tbody tr')].map((r) => r.children[0]!.textContent);
    expect(bands[0]).toBe('110 to 112');
    expect(bands.at(-1)).toBe('96 to 98');
    const rects = [...container.querySelectorAll('.pu-vp-bar rect.pu-vp-buy')];
    const ys = rects.map((r) => Number(r.getAttribute('y')));
    // Top edge at paddingTop, 8 bands in (320 - 10 - 30) px.
    expect(Math.min(...ys)).toBeCloseTo(10, 5);
    expect(ys.toSorted((a, b) => a - b)[1]! - ys.toSorted((a, b) => a - b)[0]!).toBeCloseTo(35, 5);
  });

  it('anchors to the right by default and drops its tags when too narrow', () => {
    widthOf(80);
    const { container } = render(<ProfileRail bars={BARS} priceDomain={{ min: '96', max: '112' }} rows={6} label="Rail" split={false} />);
    expect(container.querySelector('.pu-vp-tags')).toBeNull();
    const rect = container.querySelector('rect.pu-vp-total.in, rect.pu-vp-total')!;
    expect(Number(rect.getAttribute('x')) + Number(rect.getAttribute('width'))).toBeCloseTo(80, 5);
  });

  it('has no serious axe violations', async () => {
    widthOf(120);
    const { container } = render(<ProfileRail bars={BARS} priceDomain={{ min: '96', max: '112' }} label="Rail" />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
