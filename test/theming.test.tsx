import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DENSITIES, MeterBar, Pagination, THEMES, contrastRatio, createTheme, financePalette, themeAttributes } from '../src/index.ts';

const css = (name: string) => readFileSync(`src/styles/${name}`, 'utf8');

describe('themeAttributes', () => {
  it('leaves the attributes off for the system theme and the default density', () => {
    expect(themeAttributes()).toEqual({});
    expect(themeAttributes({ theme: 'system', density: 'comfortable' })).toEqual({});
  });

  it('picks the high-contrast pair and the density', () => {
    expect(themeAttributes({ theme: 'dark', contrast: 'more', density: 'compact' })).toEqual({ 'data-theme': 'dark-hc', 'data-pu-density': 'compact' });
    expect(themeAttributes({ theme: 'light-hc' })).toEqual({ 'data-theme': 'light-hc' });
    expect(themeAttributes({ theme: 'light', density: 'spacious' })).toEqual({ 'data-theme': 'light', 'data-pu-density': 'spacious' });
  });

  it('rejects unknown values', () => {
    expect(() => themeAttributes({ theme: 'sepia' as never })).toThrow(TypeError);
    expect(() => themeAttributes({ density: 'tiny' as never })).toThrow(TypeError);
  });

  it('lists the themes and densities the CSS defines', () => {
    const all = css('tokens.css') + css('contrast.css');
    for (const theme of THEMES) expect(all).toContain(`[data-theme='${theme}']`);
    for (const density of DENSITIES) expect(all).toContain(`[data-pu-density='${density}']`);
  });
});

describe('contrastRatio', () => {
  it('matches WCAG for known pairs', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#fff', '#fff')).toBe(1);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('red', '#ffffff')).toBeNull();
  });
});

describe('createTheme', () => {
  const brand = { light: { accent: '#0b5cad' }, dark: { accent: '#8bbcff' } };

  it('writes brand tokens into the tokens layer for both themes, with no issues for good colours', () => {
    const theme = createTheme({ ...brand, radius: { control: '8px' }, font: { body: '"Inter", system-ui, sans-serif' } });
    expect(theme.issues).toEqual([]);
    expect(theme.css).toMatch(/^\/\*[^]*\*\/\n@layer punji\.tokens \{/);
    expect(theme.css).toContain("[data-theme='dark'] {");
    expect(theme.css).toContain('(prefers-color-scheme: dark) and (not (prefers-contrast: more))');
    expect(theme.vars.light['--pu-color-accent']).toBe('#0b5cad');
    expect(theme.vars.light['--pu-color-on-accent-fill']).toBe('#ffffff');
    expect(theme.vars.dark['--pu-color-on-accent-fill']).toBe('#000000');
    expect(theme.vars.light['--pu-radius-control']).toBe('8px');
    // Finance semantics are not brand colours.
    expect(theme.vars.light['--pu-color-gain']).toBeUndefined();
  });

  it('reports colours that miss their contrast target, and throws when strict', () => {
    const lime = { light: { accent: '#c8f23d' } };
    const { issues } = createTheme(lime);
    expect(issues.some((i) => i.theme === 'light' && i.token === '--pu-color-accent' && i.against === '--pu-color-surface' && i.min === 4.5)).toBe(true);
    expect(() => createTheme(lime, { strict: true })).toThrow(RangeError);
  });

  it('keeps a scoped brand out of high-contrast sections and away from prefers-contrast', () => {
    const { css: out } = createTheme(brand, { selector: "[data-brand='acme']" });
    expect(out).toContain("[data-brand='acme']:not([data-theme$='-hc'], [data-theme$='-hc'] *)");
    expect(out).toContain('@media not (prefers-contrast: more)');
  });

  it('rejects values that could break out of a declaration', () => {
    expect(() => createTheme({ light: { accent: 'red; } body { display: none' } })).toThrow(TypeError);
    expect(() => createTheme({ light: { accent: '#fff' }, radius: { card: '8px; color: red' } })).toThrow(TypeError);
    expect(() => createTheme({ light: { accent: '#fff' }, font: { body: 'Inter; } *{' } })).toThrow(TypeError);
    expect(() => createTheme(brand, { selector: '.a { } .b' })).toThrow(TypeError);
    expect(() => createTheme(brand, { selector: '.a /* x */' })).toThrow(TypeError);
  });

  it('ships finance palettes that pass 4.5:1 on every surface, and only through `finance`', () => {
    const surfaces = { light: ['#e4e7de', '#f7f8f3', '#eceee7'], dark: ['#0d0e10', '#17191c', '#1f2226'] } as const;
    for (const name of ['red-up', 'blue-orange'] as const) {
      const palette = financePalette(name)!;
      for (const theme of ['light', 'dark'] as const) {
        for (const back of surfaces[theme]) {
          expect(contrastRatio(palette[theme].gain, back)!).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(palette[theme].loss, back)!).toBeGreaterThanOrEqual(4.5);
        }
      }
      const theme = createTheme({ ...brand, finance: name });
      expect(theme.issues).toEqual([]);
      expect(theme.vars.dark['--pu-color-gain']).toBe(palette.dark.gain);
    }
    expect(financePalette('green-up')).toBeNull();
  });
});

describe('density and contrast CSS', () => {
  it('keeps hit areas at 24px or more in compact, and comfortable heights on coarse pointers', () => {
    const tokens = css('tokens.css');
    const compact = /\[data-pu-density='compact'\] \{([^}]*)\}/.exec(tokens)![1]!;
    for (const m of compact.matchAll(/--pu-control-\w+: (\d+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(24);
    expect(tokens).toMatch(/@media \(pointer: coarse\) \{\s*\[data-pu-density='compact'\] \{\s*--pu-control-lg: 44px;/);
    expect(tokens).toContain('--pu-tap-min: 44px');
  });

  it('redraws selected states, focus and chart marks in forced colours', () => {
    const contrast = css('contrast.css');
    const forced = contrast.slice(contrast.indexOf('@media (forced-colors: active)'));
    expect(forced).toContain(':focus-visible { outline: 2px solid Highlight');
    expect(forced).toContain("[aria-selected='true']");
    expect(forced).toContain('background: Highlight; color: HighlightText');
    expect(forced).toMatch(/kit-bar-loss[^{]*\{[^}]*repeating-linear-gradient/);
    expect(forced).toContain('.kit-ct-c.gain rect:not(.kit-ct-vol)');
    expect(forced).toContain('stroke-dasharray');
  });
});

describe('right to left', () => {
  it('marks directional chevrons to mirror', () => {
    render(
      <div dir="rtl">
        <Pagination page={2} total={30} pageSize={10} onPageChange={() => undefined} label="Pages" />
      </div>,
    );
    const prev = screen.getByRole('button', { name: 'Previous page' });
    expect(prev.querySelector('svg')!.getAttribute('class')).toBe('pu-flip');
    expect(css('base.css')).toContain("[dir='rtl'] .pu-flip { transform: scaleX(-1) }");
  });

  it('places meter markers from the inline start, so the bar mirrors with the text', () => {
    const { container } = render(<MeterBar parts={[{ value: 40, tone: 'gain' }]} max={100} marker={25} />);
    const marker = container.querySelector('b') as HTMLElement;
    expect(marker.style.insetInlineStart).toBe('25%');
    expect(marker.style.left).toBe('');
  });

  it('keeps amounts as an isolated left-to-right run', () => {
    expect(css('base.css')).toContain("[dir='rtl'] :is(.pu-money, .pu-change, .kit-fig, .kit-figchip) { direction: ltr; unicode-bidi: isolate }");
  });
});
