import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import * as icons from '../src/icons/Icons.tsx';
import { Icon, IconBell, ICON_ALIASES, NavIcon, SettingIcon, iconNames, resolveIconName } from '../src/icons/Icons.tsx';
import type { IconName } from '../src/icons/Icons.tsx';
import { seriousViolations } from './axe.ts';

const width = (el: ReactElement) => render(el).container.querySelector('svg')?.getAttribute('width');
const viewBox = (name: IconName) => render(<Icon name={name} />).container.querySelector('svg')?.getAttribute('viewBox');

describe('icons', () => {
  const names = iconNames();

  it('draws every name, decorative by default, as a currentColor stroke svg', () => {
    expect(names.length).toBeGreaterThan(150);
    const problems: string[] = [];
    for (const name of names) {
      const { container, unmount } = render(<Icon name={name} />);
      const svg = container.querySelector('svg');
      if (!svg) problems.push(`${name}: no svg`);
      else {
        if (svg.getAttribute('aria-hidden') !== 'true') problems.push(`${name}: not aria-hidden`);
        if (svg.hasAttribute('role')) problems.push(`${name}: has a role`);
        if (svg.getAttribute('stroke') !== 'currentColor') problems.push(`${name}: not currentColor`);
        if (!svg.querySelector('path,circle,rect,line,polyline,ellipse')) problems.push(`${name}: draws nothing`);
      }
      unmount();
    }
    expect(problems).toEqual([]);
  });

  it('exports one component per glyph, each drawing', () => {
    const components = Object.entries(icons).filter(([key]) => /^(Icon[A-Z]|Lucide)/.test(key));
    expect(components.length).toBe(names.length - Object.keys(ICON_ALIASES).length);
    const empty: string[] = [];
    for (const [key, C] of components) {
      const { container, unmount } = render((C as (p: object) => ReactElement)({}));
      if (!container.querySelector('svg path,svg circle,svg rect,svg line,svg polyline,svg ellipse')) empty.push(key);
      unmount();
    }
    expect(empty).toEqual([]);
  });

  it('is an image with a name when labelled, and hidden when not', async () => {
    const { container } = render(
      <div>
        <Icon name="alerts" label="Alerts" />
        <button type="button" aria-label="Close">
          <Icon name="close" />
        </button>
      </div>,
    );
    expect(screen.getByRole('img', { name: 'Alerts' })).toBeTruthy();
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('sizes on the sm/md/lg scale and accepts a px number from web', () => {
    expect(width(<Icon name="home" size="sm" />)).toBe('16');
    expect(width(<Icon name="home" />)).toBe('20');
    expect(width(<Icon name="home" size="lg" />)).toBe('24');
    expect(width(<IconBell size={14} />)).toBe('14');
  });

  it('keeps the 24 grid for stroke icons and the native grid for legacy glyphs', () => {
    expect(viewBox('markets')).toBe('0 0 24 24');
    expect(viewBox('lucide-x')).toBe('0 0 24 24');
    expect(viewBox('bell')).toBe('0 0 20 20');
    expect(viewBox('setting-mail')).toBe('0 0 20 20');
  });

  it('resolves aliases to the glyph they share', () => {
    expect(resolveIconName('inbox-bell')).toBe('alerts');
    expect(resolveIconName('star')).toBe('watchlist');
    expect(resolveIconName('home')).toBe('home');
    expect(render(<Icon name="star" />).container.innerHTML).toBe(render(<Icon name="watchlist" />).container.innerHTML);
  });

  it("NavIcon and SettingIcon keep web's output", () => {
    const nav = render(<NavIcon name="chevDown" className="x" />).container.querySelector('svg');
    expect(nav?.getAttribute('class')).toBe('app-ico app-ico-chevDown x');
    expect(nav?.getAttribute('width')).toBe('18');
    expect(render(<NavIcon name="more" />).container.querySelector('svg')?.getAttribute('stroke-width')).toBe('3');
    const set = render(<SettingIcon name="eyeOff" />).container.querySelector('svg');
    expect(set?.getAttribute('viewBox')).toBe('0 0 20 20');
    expect(set?.getAttribute('width')).toBe('18');
  });
});
