import { useState } from 'react';
import { Avatar } from '@punji/ui/avatar';
import { Button } from '@punji/ui/button';
import { CompanySearch } from '@punji/ui/company-search';
import { Drawer } from '@punji/ui/drawer';
import { StateGlyph } from '@punji/ui/inline-state';
import { MarketIndices } from '@punji/ui/market-indices';
import { MarketStatus, getMarketSession, nepseSchedule } from '@punji/ui/market-status';
import { CountBadge, StatusPill } from '@punji/ui/status-pill';
import { marketIndices, sampleNow, symbols } from '../../sample.ts';
import './screen.css';

// An account's top bar: brand, sections, company search, the market mark, the inbox and the account, then the
// index strip and the page's title row. Every control is a package export; the bar's layout is screen.css.
const SECTIONS = ['Overview', 'Portfolio', 'Markets', 'Watchlist', 'Research'] as const;
type Section = (typeof SECTIONS)[number];

export default function Example() {
  const session = getMarketSession(sampleNow, nepseSchedule);
  const [section, setSection] = useState<Section>('Portfolio');
  const [menu, setMenu] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const go = (next: Section) => {
    setSection(next);
    setMenu(false);
  };
  const links = (
    <ul className="sc-hdr-links">
      {SECTIONS.map((name) => (
        <li key={name}>
          <Button variant="ghost" size="sm" aria-current={name === section ? 'page' : undefined} onClick={() => go(name)}>
            {name}
          </Button>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="sc-hdr">
      <header className="sc-hdr-bar">
        <div className="sc-hdr-start">
          <span className="sc-hdr-menu">
            <Button variant="ghost" size="sm" aria-haspopup="dialog" onClick={() => setMenu(true)}>
              Menu
            </Button>
          </span>
          <span className="sc-hdr-brand">
            punji<span aria-hidden="true">.</span>
          </span>
          <nav className="sc-hdr-nav" aria-label="Account sections">
            {links}
          </nav>
        </div>
        <div className="sc-hdr-search">
          <CompanySearch
            options={symbols}
            label="Search companies"
            hideLabel
            placeholder="Search a symbol or company"
            size="sm"
            shortcut={null}
            onOpen={setOpened}
            sub={(o) => o.name}
            none={(q) => `No company matches “${q}”.`}
            testId="hdr-search"
            optionTestId="hdr-search-option"
          />
        </div>
        <div className="sc-hdr-end">
          <span className="sc-hdr-mark">
            <MarketStatus session={session} market="NEPSE" size="sm" />
          </span>
          <span className="sc-hdr-bell">
            <Button variant="ghost" size="sm" iconOnly label="Inbox, 3 unread" icon={<StateGlyph name="bell" size={18} />} />
            <CountBadge count={3} label="unread" />
          </span>
          <Avatar name="Sita Sharma" tone="accent" label="Sita Sharma" />
        </div>
      </header>

      <div className="sc-hdr-strip">
        <MarketIndices indices={marketIndices.slice(0, 3)} label="NEPSE indices" variant="strip" asOf="As of 10:45, Sun 16 Nov" showTrend={false} />
      </div>

      <div className="sc-hdr-title">
        <div className="sc-hdr-heading">
          <h3>{section}</h3>
          <StatusPill tone="info" size="sm">
            Prices from the 14 Nov close
          </StatusPill>
        </div>
        <div className="sc-hdr-actions">
          <Button variant="secondary" size="sm">
            Export
          </Button>
          <Button size="sm">Add transaction</Button>
        </div>
      </div>
      <p className="sc-hdr-note" aria-live="polite">
        {opened
          ? `Opened ${opened}. In your app the search navigates to the company page.`
          : 'The sections, search and inbox are live. Below 760 px the sections move into a drawer behind Menu.'}
      </p>

      <Drawer open={menu} label="Account sections" onClose={() => setMenu(false)}>
        <nav className="sc-hdr-drawer" aria-label="Account sections">
          {links}
        </nav>
      </Drawer>
    </div>
  );
}
