// Run at build time (a script, or a server route), then serve the CSS after @punji/ui/styles.css.
import { createTheme } from '@punji/ui/theme';

const brand = createTheme(
  {
    light: { accent: '#0b5cad', accentFill: '#0b5cad' },
    dark: { accent: '#8bbcff', accentFill: '#8bbcff' },
    radius: { control: '8px', card: '16px' },
    font: { body: '"Inter", system-ui, sans-serif' },
    // Gain and loss stay independent of the brand blue.
    finance: 'green-up',
  },
  { strict: true },
);

// brand.css starts with: @layer punji.tokens { :root, [data-theme='light'] { --pu-color-accent: #0b5cad; ... } }
// brand.issues lists any colour that misses 4.5:1 (or 3:1 for the chart); strict throws instead.
export const brandCss: string = brand.css;
