// Regenerates the docs site's brand files in site/public from the committed brand art in
// .github/assets (the p mark and wordmark paths are reused, not redrawn):
//   favicon.svg  the p mark in the page colour on the brand green (follows no theme: a tab icon is a fixed image)
//   og.svg       the 1200x630 card source
//   og.png       the card rasterised with the installed Playwright Chromium (no new dependency)
// The outputs are committed, so a normal build needs no browser. Run `npm run site:brand` after changing the art.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const FOREST = '#054431';
const PAGE = '#e4e7de';
const INK = '#121314';
const wordmark = readFileSync('.github/assets/punji-wordmark-light.svg', 'utf8');
const inner = wordmark.slice(wordmark.indexOf('>') + 1, wordmark.lastIndexOf('</svg>'));
const mark = /<path[^>]*\/>/.exec(inner)?.[0];
if (!mark) throw new Error('site-brand: the p mark path was not found in punji-wordmark-light.svg');

mkdirSync('site/public', { recursive: true });

// The p is 42 wide by 58.5 tall; scale it into the middle of a 64 box.
const scale = 0.72;
const markX = (64 - 42 * scale) / 2;
const markY = (64 - 58.5 * scale) / 2;
writeFileSync(
  'site/public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${FOREST}"/><g transform="translate(${markX.toFixed(2)} ${markY.toFixed(2)}) scale(${scale})">${mark.replace(FOREST, PAGE)}</g></svg>\n`,
);

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAGE}"/>
  <rect x="0" y="618" width="1200" height="12" fill="${FOREST}"/>
  <g transform="translate(80 120) scale(1.5)">${inner}</g>
  <g font-family="Geist, Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" fill="${INK}">
    <text x="80" y="360" font-size="68" font-weight="600">Finance-first React</text>
    <text x="80" y="438" font-size="68" font-weight="600">components</text>
    <text x="80" y="510" font-size="30" fill="#3d443f">Money, markets and accounting. Accessible, themed, Devanagari-ready.</text>
    <text x="80" y="566" font-size="26" font-weight="600" fill="${FOREST}">design.punji.app</text>
  </g>
</svg>
`;
writeFileSync('site/public/og.svg', og);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(`<!doctype html><body style="margin:0">${og}</body>`);
  await page.screenshot({ path: 'site/public/og.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
} finally {
  await browser.close();
}
console.log('site-brand: wrote site/public/favicon.svg, og.svg, og.png');
