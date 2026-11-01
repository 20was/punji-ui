/**
 * Themes, density and brand theming. Pure: no React, no DOM.
 *
 * The library ships four colour themes (light, dark and their high-contrast
 * pairs) and three densities, chosen with two attributes on any element:
 * `data-theme` and `data-pu-density`. `themeAttributes` builds them.
 *
 * `createTheme` turns a bank's or broker's brand (accent, link, chart colour,
 * radii, fonts) into CSS for the `punji.tokens` layer and checks the contrast
 * of every brand colour against the surfaces it sits on. Finance semantics
 * stay out of the brand: gain, loss, debit and credit come only from the
 * vetted `finance` palettes, never from brand colours, and the high-contrast
 * themes ignore the brand so they keep their AAA ratios.
 *
 * Every value is validated before it is written into CSS (hex colours,
 * lengths, font names, a plain selector), so untrusted input cannot break
 * out of a declaration.
 */

/** The colour themes: `data-theme` values. No attribute follows the system. */
export const THEMES = ['light', 'dark', 'light-hc', 'dark-hc'] as const;
export type ThemeName = (typeof THEMES)[number];

/** The densities: `data-pu-density` values. `comfortable` is the default. */
export const DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
export type Density = (typeof DENSITIES)[number];

/** Attributes to spread on an element (`<html {...themeAttributes(...)}>`). Absent keys mean "follow the system" or the default. */
export interface ThemeAttributes {
  'data-theme'?: ThemeName;
  'data-pu-density'?: Density;
}

/**
 * The attributes for a theme and density. `theme: 'system'` (or undefined) leaves `data-theme` off, so
 * `prefers-color-scheme` and `prefers-contrast` decide; `contrast: 'more'` picks the high-contrast pair of `theme`.
 */
export function themeAttributes(choice: { theme?: 'system' | 'light' | 'dark' | ThemeName; contrast?: 'normal' | 'more'; density?: Density } = {}): ThemeAttributes {
  const out: ThemeAttributes = {};
  const { theme, contrast, density } = choice;
  if (theme && theme !== 'system') {
    if (!(THEMES as readonly string[]).includes(theme)) throw new TypeError(`themeAttributes: unknown theme ${String(theme)}`);
    const base = theme.replace('-hc', '') as 'light' | 'dark';
    out['data-theme'] = contrast === 'more' || theme.endsWith('-hc') ? `${base}-hc` : base;
  }
  if (density && density !== 'comfortable') {
    if (!(DENSITIES as readonly string[]).includes(density)) throw new TypeError(`themeAttributes: unknown density ${String(density)}`);
    out['data-pu-density'] = density;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Contrast

type Rgb = readonly [number, number, number];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function rgb(hex: string): Rgb {
  const h = hex.length === 4 ? hex.slice(1).split('').map((c) => c + c).join('') : hex.slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const toHex = (c: Rgb) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

function luminance(c: Rgb): number {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.2 contrast ratio of two `#rgb` or `#rrggbb` colours (1 to 21), or null when either is not a hex colour. */
export function contrastRatio(a: string, b: string): number | null {
  if (!HEX.test(a) || !HEX.test(b)) return null;
  const [hi, lo] = [luminance(rgb(a)), luminance(rgb(b))].toSorted((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** `a` mixed toward `b` by `amount` (0 to 1), as hex. */
const mix = (a: string, b: string, amount: number) => {
  const x = rgb(a);
  const y = rgb(b);
  return toHex([0, 1, 2].map((i) => x[i]! + (y[i]! - x[i]!) * amount) as unknown as Rgb);
};

const bestOn = (fill: string) => ((contrastRatio('#000000', fill) ?? 0) >= (contrastRatio('#ffffff', fill) ?? 0) ? '#000000' : '#ffffff');

// ---------------------------------------------------------------------------------------------------------------
// Brand theming

/** Brand colours for one theme. Hex only (`#rgb` or `#rrggbb`). */
export interface BrandColors {
  /** Accent text, icons and focus rings. Needs 4.5:1 on the surfaces. */
  accent: string;
  /** Primary button and selected fills. Default: `accent`. */
  accentFill?: string;
  /** Hover of the fill. Default: the fill moved 10% toward black (light) or white (dark). */
  accentFillHover?: string;
  /** Text on the fill. Default: black or white, whichever contrasts more. */
  onAccentFill?: string;
  /** Links. Default: `accent`. */
  link?: string;
  /** The single-series chart colour. Needs 3:1 on the surface. Default: `accent`. */
  chart?: string;
}

/**
 * Gain and loss palettes, chosen for contrast and colour vision, never taken from the brand.
 * `green-up` is the library default; `red-up` swaps the two for markets that show a rise in red;
 * `blue-orange` stays distinct for red-green colour blindness. Components still add signs, arrows and words.
 */
export type FinancePalette = 'green-up' | 'red-up' | 'blue-orange';

export interface BrandTheme {
  /** Light theme colours (required). */
  light: BrandColors;
  /** Dark theme colours. Default: the light ones, which usually fail on dark surfaces; set them. */
  dark?: BrandColors;
  /** Corner radii as lengths (`8px`, `0.5rem`). */
  radius?: { control?: string; card?: string };
  /** Font family lists, for example `"Inter", system-ui, sans-serif`. */
  font?: { body?: string; display?: string };
  /** Gain and loss colours. Default `green-up` (no override). */
  finance?: FinancePalette;
}

export interface CreateThemeOptions {
  /**
   * Where the theme applies. Default `:root` (the whole page). A plain selector such as `[data-brand='acme']`
   * or `.acme` scopes it to a section. Braces, semicolons, comments and angle brackets are rejected.
   */
  selector?: string;
  /** Throw instead of returning issues when a colour misses its contrast target. Default false. */
  strict?: boolean;
}

/** A brand colour that misses its WCAG 2.2 target on a library surface. */
export interface ThemeIssue {
  theme: 'light' | 'dark';
  /** The token that fails, for example `--pu-color-accent`. */
  token: string;
  /** The token it was measured against, for example `--pu-color-surface`. */
  against: string;
  ratio: number;
  min: number;
}

export interface CreatedTheme {
  /** CSS for the `punji.tokens` layer. Load it after `@punji/ui/styles.css` (or `tokens.css`). */
  css: string;
  /** The custom properties written, per theme. */
  vars: { light: Record<string, string>; dark: Record<string, string> };
  /** Contrast misses. Empty when every brand colour meets its target. */
  issues: ThemeIssue[];
}

/** The library surfaces brand colours are checked against (tokens.css). */
const SURFACES = {
  light: { '--pu-color-bg': '#e4e7de', '--pu-color-surface': '#f7f8f3', '--pu-color-surface-tint': '#eceee7' },
  dark: { '--pu-color-bg': '#0d0e10', '--pu-color-surface': '#17191c', '--pu-color-surface-tint': '#1f2226' },
} as const;

/** Vetted finance palettes. Each passes 4.5:1 on every surface above (tested). */
const FINANCE: Record<Exclude<FinancePalette, 'green-up'>, Record<'light' | 'dark', { gain: string; loss: string; gainSoft: string; lossSoft: string }>> = {
  'red-up': {
    light: { gain: '#a3321f', loss: '#3f6a00', gainSoft: 'rgba(163, 50, 31, 0.1)', lossSoft: 'rgba(63, 106, 0, 0.1)' },
    dark: { gain: '#ff8a78', loss: '#c8f23d', gainSoft: 'rgba(255, 122, 102, 0.14)', lossSoft: 'rgba(200, 242, 61, 0.12)' },
  },
  'blue-orange': {
    light: { gain: '#0b5394', loss: '#9a3d00', gainSoft: 'rgba(11, 83, 148, 0.1)', lossSoft: 'rgba(154, 61, 0, 0.1)' },
    dark: { gain: '#8cc4ff', loss: '#ffab70', gainSoft: 'rgba(140, 196, 255, 0.14)', lossSoft: 'rgba(255, 171, 112, 0.14)' },
  },
};

/** The finance palette colours, for documentation and tests. */
export function financePalette(name: FinancePalette): Record<'light' | 'dark', { gain: string; loss: string }> | null {
  return name === 'green-up' ? null : FINANCE[name];
}

const LENGTH = /^(?:0|\d{1,4}(?:\.\d{1,3})?(?:px|rem|em))$/;
const FONT = /^[\w\s"',.-]{1,200}$/;
const SELECTOR = /^[\w\s#.:()[\]='"*>+~-]{1,200}$/;

function colour(value: string | undefined, where: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !HEX.test(value)) throw new TypeError(`createTheme: ${where} must be a hex colour (#rgb or #rrggbb), got ${JSON.stringify(value)}`);
  return value.toLowerCase();
}

function resolveColors(input: BrandColors, theme: 'light' | 'dark'): Record<string, string> {
  const accent = colour(input.accent, `${theme}.accent`);
  if (!accent) throw new TypeError(`createTheme: ${theme}.accent is required`);
  const fill = colour(input.accentFill, `${theme}.accentFill`) ?? accent;
  return {
    '--pu-color-accent': accent,
    '--pu-color-accent-fill': fill,
    '--pu-color-accent-fill-hover': colour(input.accentFillHover, `${theme}.accentFillHover`) ?? mix(fill, theme === 'light' ? '#000000' : '#ffffff', 0.1),
    '--pu-color-on-accent-fill': colour(input.onAccentFill, `${theme}.onAccentFill`) ?? bestOn(fill),
    '--pu-color-link': colour(input.link, `${theme}.link`) ?? accent,
    '--pu-color-chart': colour(input.chart, `${theme}.chart`) ?? accent,
  };
}

function check(vars: Record<string, string>, theme: 'light' | 'dark'): ThemeIssue[] {
  const issues: ThemeIssue[] = [];
  const measure = (token: string, against: string, back: string, min: number) => {
    const ratio = contrastRatio(vars[token]!, back) ?? 0;
    if (ratio < min) issues.push({ theme, token, against, ratio: Math.round(ratio * 100) / 100, min });
  };
  for (const [against, back] of Object.entries(SURFACES[theme])) {
    for (const token of ['--pu-color-accent', '--pu-color-link']) measure(token, against, back, 4.5);
    for (const token of ['--pu-color-gain', '--pu-color-loss']) if (vars[token]) measure(token, against, back, 4.5);
  }
  measure('--pu-color-chart', '--pu-color-surface', SURFACES[theme]['--pu-color-surface'], 3);
  measure('--pu-color-on-accent-fill', '--pu-color-accent-fill', vars['--pu-color-accent-fill']!, 4.5);
  measure('--pu-color-on-accent-fill', '--pu-color-accent-fill-hover', vars['--pu-color-accent-fill-hover']!, 4.5);
  return issues;
}

const block = (selectors: readonly string[], vars: Record<string, string>, indent = '  ') =>
  `${indent}${selectors.join(`,\n${indent}`)} {\n${Object.entries(vars).map(([k, v]) => `${indent}  ${k}: ${v};`).join('\n')}\n${indent}}`;

/**
 * Build a brand theme: CSS custom properties for the `punji.tokens` layer, with each brand colour checked against
 * the library surfaces (4.5:1 for accent, link and the text on the fill; 3:1 for the chart colour).
 * Throws a TypeError for a value that is not a hex colour, length, font list or plain selector.
 */
export function createTheme(brand: BrandTheme, options: CreateThemeOptions = {}): CreatedTheme {
  const selector = (options.selector ?? ':root').trim();
  if (!SELECTOR.test(selector) || selector.includes('/*')) throw new TypeError(`createTheme: selector ${JSON.stringify(selector)} is not a plain selector`);
  const light = resolveColors(brand.light, 'light');
  const dark = resolveColors(brand.dark ?? brand.light, 'dark');
  const shared: Record<string, string> = {};
  for (const [key, token] of [['control', '--pu-radius-control'], ['card', '--pu-radius-card']] as const) {
    const value = brand.radius?.[key];
    if (value === undefined) continue;
    if (!LENGTH.test(value)) throw new TypeError(`createTheme: radius.${key} must be a length such as 8px or 0.5rem`);
    shared[token] = value;
  }
  for (const [key, token] of [['body', '--pu-font-body'], ['display', '--pu-font-display']] as const) {
    const value = brand.font?.[key];
    if (value === undefined) continue;
    if (!FONT.test(value)) throw new TypeError(`createTheme: font.${key} may hold only font names, quotes, commas and hyphens`);
    shared[token] = value;
  }
  const finance = brand.finance ?? 'green-up';
  if (finance !== 'green-up') {
    const palette = FINANCE[finance];
    if (!palette) throw new TypeError(`createTheme: unknown finance palette ${String(finance)}`);
    for (const [theme, vars] of [['light', light], ['dark', dark]] as const) {
      const p = palette[theme];
      Object.assign(vars, { '--pu-color-gain': p.gain, '--pu-color-gain-soft': p.gainSoft, '--pu-color-loss': p.loss, '--pu-color-loss-soft': p.lossSoft });
    }
  }
  const issues = [...check(light, 'light'), ...check(dark, 'dark')];
  if (options.strict && issues.length) {
    throw new RangeError(`createTheme: ${issues.map((i) => `${i.theme} ${i.token} on ${i.against} is ${i.ratio}:1, needs ${i.min}:1`).join('; ')}`);
  }

  // Same selector shapes as tokens.css, so a later stylesheet wins in the shared layer. The brand never reaches the
  // high-contrast themes: at :root they win on specificity (:root[data-theme=...-hc]) and the system query is
  // excluded; a scoped brand skips any section inside a -hc theme and steps aside when the system asks for more contrast.
  const root = selector === ':root';
  const s = root ? selector : `${selector}:not([data-theme$='-hc'], [data-theme$='-hc'] *)`;
  const lightSel = root ? [':root', "[data-theme='light']"] : [s];
  const darkSel = root ? [":root[data-theme='dark']", "[data-theme='dark']"] : [`[data-theme='dark'] ${s}`, `${s}[data-theme='dark']`];
  const explicitLight = root ? [] : [`[data-theme='light'] ${s}`, `${s}[data-theme='light']`];
  const systemDark = root ? ':root:not([data-theme])' : `:root:not([data-theme]) ${s}`;
  const indent = root ? '  ' : '    ';
  const parts = [
    block(lightSel, { ...shared, ...light }, indent),
    `${indent}@media (prefers-color-scheme: dark) and (not (prefers-contrast: more)) {\n${block([systemDark], dark, `${indent}  `)}\n${indent}}`,
    block(darkSel, dark, indent),
    ...(explicitLight.length ? [block(explicitLight, light, indent)] : []),
  ];
  const body = root ? parts.join('\n\n') : `  @media not (prefers-contrast: more) {\n${parts.join('\n\n')}\n  }`;
  return {
    css: `/* Brand theme generated by createTheme (@punji/ui/theme). */\n@layer punji.tokens {\n${body}\n}\n`,
    vars: { light: { ...shared, ...light }, dark },
    issues,
  };
}
