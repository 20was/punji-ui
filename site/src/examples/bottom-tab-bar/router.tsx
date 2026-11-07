import { createContext, useContext, useState } from 'react';
import { BottomTabBar } from '@punji/ui/bottom-tab-bar';
import { LinkProvider, type LinkComponent } from '@punji/ui/link';

// A stand-in for your router's link: it "navigates" by telling the page, without leaving it.
const Navigate = createContext<(path: string) => void>(() => {});
const Link: LinkComponent = ({ href, onClick, children, ...rest }) => {
  const go = useContext(Navigate);
  return (
    <a
      {...rest}
      href={href}
      onClick={(e) => {
        e.preventDefault();
        go(href);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
};

const dot = <span style={{ inlineSize: 20, blockSize: 20, borderRadius: '50%', border: '2px solid currentColor', display: 'inline-block' }} />;
const tabs = [
  { id: 'home', label: 'Home', href: '/', icon: dot },
  { id: 'portfolio', label: 'Portfolio', href: '/portfolio', icon: dot },
  { id: 'alerts', label: 'Alerts', href: '/alerts', icon: dot },
];

// The bar never reads the URL and never imports a router. LinkProvider supplies your router's link for in-app paths;
// you pass `current` from your router's location.
export default function Example() {
  const [path, setPath] = useState('/portfolio');
  return (
    <Navigate value={setPath}>
      <LinkProvider component={Link}>
        <div style={{ inlineSize: 'min(24rem, 100%)', border: '1px solid var(--pu-color-card-border)', borderRadius: 'var(--pu-radius-lg)', overflow: 'hidden' }}>
          <p style={{ margin: 0, padding: 'var(--pu-space-6) var(--pu-space-4)', fontSize: 'var(--pu-text-sm)' }}>Router location: {path}</p>
          <BottomTabBar label="Example: router" placement="inline" tabs={tabs} current={tabs.find((t) => t.href === path)?.id ?? null} />
        </div>
      </LinkProvider>
    </Navigate>
  );
}
