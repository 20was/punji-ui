import { SkipLink } from '@punji/ui/skip-link';

// Place it first in the page. It is off screen until it takes keyboard focus; Enter moves focus into the target.
// Here the target is a region inside the preview; on a real page it is your <main id="main">.
export default function Example() {
  return (
    <div style={{ position: 'relative', display: 'grid', gap: 12 }}>
      <SkipLink href="#skip-demo-main" label="Skip to content" />
      <nav aria-label="Demo navigation" style={{ display: 'flex', gap: 12 }}>
        <a href="#skip-demo-main">Markets</a>
        <a href="#skip-demo-main">Portfolio</a>
        <a href="#skip-demo-main">Alerts</a>
      </nav>
      <div id="skip-demo-main" role="region" aria-label="Demo content">
        <p>Press Tab in this preview to reveal the link, then Enter: focus lands here, past the three navigation links.</p>
      </div>
    </div>
  );
}
