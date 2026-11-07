import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BottomTabBar,
  Checklist,
  InboxGroup,
  InboxList,
  InboxRow,
  InboxSkeleton,
  InboxState,
  LinkProvider,
  LockedCell,
  LockedHead,
  LockedPreview,
  LockedRow,
  LockedTile,
  MenuItemRow,
  MenuList,
  NotificationBell,
  ProgressPill,
  ReorderList,
  badgeText,
  moveKey,
} from '../src/index.ts';
import type { LinkComponent } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

afterEach(() => vi.restoreAllMocks());

const Routed: LinkComponent = ({ href, children, ...rest }) => (
  <a {...rest} href={href} data-routed="yes">
    {children}
  </a>
);

describe('NotificationBell', () => {
  it('caps the badge at 99+ but keeps the real count in the name', () => {
    expect(badgeText(null)).toBeNull();
    expect(badgeText(0)).toBeNull();
    expect(badgeText(7)).toBe('7');
    expect(badgeText(99)).toBe('99');
    expect(badgeText(100)).toBe('99+');
    render(<NotificationBell count={128} label="Notifications, 128 unread" expanded={false} onClick={() => {}} testId="bell" />);
    const bell = screen.getByRole('button', { name: 'Notifications, 128 unread' });
    expect(bell.getAttribute('aria-haspopup')).toBe('dialog');
    expect(bell.getAttribute('aria-expanded')).toBe('false');
    const badge = screen.getByTestId('bell-count');
    expect(badge.getAttribute('data-n')).toBe('99+');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(badge.textContent).toBe('');
  });

  it('draws no badge while loading or when nothing is unread, and presses with the keyboard', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn<() => void>();
    const { rerender, container } = render(<NotificationBell count={null} label="Notifications" expanded controls="inbox" onClick={onClick} />);
    expect(container.querySelector('.pu-bell-n')).toBeNull();
    rerender(<NotificationBell count={0} label="Notifications" expanded onClick={onClick} />);
    expect(container.querySelector('.pu-bell-n')).toBeNull();
    const bell = screen.getByRole('button', { name: 'Notifications' });
    await user.tab();
    expect(document.activeElement).toBe(bell);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('InboxList', () => {
  it('groups rows, marks unread for assistive technology, and opens a link or a button', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn<(e: { preventDefault: () => void }) => void>((e) => e.preventDefault());
    const onAction = vi.fn<() => void>();
    const onBack = vi.fn<() => void>();
    const { container } = render(
      <LinkProvider component={Routed}>
        <InboxList title="Notifications" meta="1 unread" action={{ label: 'Mark all read', onClick: onAction }} onBack={onBack} backLabel="Back" footer={{ label: 'Older', onClick: () => {} }} testId="inbox">
          <InboxGroup label="Today">
            <InboxRow icon="percent" tone="gain" title="Dividend declared" kind="Dividend" time="11:05" unread unreadLabel="Unread" href="/stocks/NABIL" onOpen={onOpen} />
            <InboxRow icon="info" title="Market wrap" kind="News" time="09:00" unread={false} unreadLabel="Unread" onOpen={onOpen} />
            <InboxRow icon="bell" title="Hidden launch" kind="Launch" time="08:00" unread={false} unreadLabel="Unread" staffLabel="Staff only" onOpen={onOpen} />
          </InboxGroup>
        </InboxList>
      </LinkProvider>,
    );
    expect(screen.getByRole('region', { name: 'Today' })).toBeTruthy();
    const link = screen.getByRole('link', { name: /Dividend declared/ });
    expect(link.getAttribute('href')).toBe('/stocks/NABIL');
    expect(link.getAttribute('data-routed')).toBe('yes');
    expect(link.textContent).toContain('Unread');
    expect(screen.getByRole('button', { name: /Market wrap/ }).textContent).not.toContain('Unread');
    expect(screen.getByRole('button', { name: /Hidden launch/ }).textContent).toContain('Staff only');
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('1 unread');
    await user.click(link);
    await user.click(screen.getByRole('button', { name: /Market wrap/ }));
    expect(onOpen).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Mark all read' }));
    await user.click(screen.getByTestId('inbox-back'));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('shows a labelled skeleton and a state instead of rows', async () => {
    const { container, rerender } = render(
      <InboxList title="Notifications">
        <InboxSkeleton label="Loading notifications" rows={2} />
      </InboxList>,
    );
    expect(screen.getByRole('status', { name: 'Loading notifications' })).toBeTruthy();
    rerender(
      <InboxList title="Notifications" footer={{ label: 'Older', onClick: () => {}, busy: true }}>
        <InboxState>All caught up</InboxState>
      </InboxList>,
    );
    expect(screen.getByText('All caught up')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Older' }).getAttribute('aria-busy')).toBe('true');
    expect(await seriousViolations(container)).toEqual([]);
  });
});

const renderMore = (close: () => void) => (
  <MenuList label="More" onClose={close}>
    <MenuItemRow onSelect={() => {}}>Sign out</MenuItemRow>
  </MenuList>
);

describe('BottomTabBar', () => {
  const tabs = [
    { id: 'markets', label: 'Markets', icon: <i />, href: '/markets', testId: 't-markets' },
    { id: 'portfolio', label: 'Portfolio', icon: <i />, href: '/portfolio' },
  ];

  it('is a labelled nav of links with the current page marked, through the link adapter', async () => {
    const { container } = render(
      <LinkProvider component={Routed}>
        <BottomTabBar label="Main" placement="inline" tabs={tabs} current="portfolio" />
      </LinkProvider>,
    );
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy();
    const current = screen.getByRole('link', { name: 'Portfolio' });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Markets' }).hasAttribute('aria-current')).toBe(false);
    expect(screen.getByTestId('t-markets').getAttribute('data-routed')).toBe('yes');
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('opens More as a modal sheet, traps focus, and returns focus to More on Escape', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">page</button>
        <BottomTabBar label="Main" placement="inline" tabs={tabs} current="more" more={<a href="/settings">Settings</a>} moreTitle="More" testId="bar" />
      </>,
    );
    const more = screen.getByRole('button', { name: 'More' });
    expect(more.getAttribute('aria-haspopup')).toBe('dialog');
    expect(more.getAttribute('aria-current')).toBe('page');
    await user.click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(more.hasAttribute('aria-current')).toBe(false);
    const sheet = screen.getByRole('dialog', { name: 'More' });
    expect(sheet.getAttribute('aria-modal')).toBe('true');
    expect(await seriousViolations(document.body)).toEqual([]);
    await user.tab();
    await user.tab();
    await user.tab();
    expect(sheet.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(more);
  });

  it('supports controlled open and a close function for the sheet content', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    function TabHost() {
      const [open, setOpen] = useState(false);
      return (
        <BottomTabBar
          label="Main"
          placement="inline"
          tabs={tabs}
          open={open}
          onOpenChange={(v) => {
            onOpenChange(v);
            setOpen(v);
          }}
          more={renderMore}
        />
      );
    }
    render(<TabHost />);
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More' }));
  });

  it('hides the fixed bar while a text field has focus and returns it after', async () => {
    render(
      <>
        <input aria-label="search" />
        <BottomTabBar label="Main" tabs={tabs} current="markets" />
      </>,
    );
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(nav.className).toContain('pu-tabbar-fixed');
    expect(nav.hasAttribute('data-hidden')).toBe(false);
    fireEvent.focusIn(screen.getByLabelText('search'));
    screen.getByLabelText('search').focus();
    await waitFor(() => expect(nav.hasAttribute('data-hidden')).toBe(true));
    screen.getByLabelText('search').blur();
    await waitFor(() => expect(nav.hasAttribute('data-hidden')).toBe(false));
  });
});

const base = [
  { key: 'A', title: 'AAA', sub: 'First' },
  { key: 'B', title: 'BBB' },
  { key: 'C', title: 'CCC' },
];

function Host({ mode }: { mode?: 'drag' | 'buttons' }) {
  const [keys, setKeys] = useState(base.map((i) => i.key));
  return <ReorderList mode={mode} items={keys.map((k) => base.find((i) => i.key === k)!)} onChange={setKeys} label="Reorder" />;
}
const order = () => screen.getAllByRole('listitem').map((li) => li.querySelector('b')?.textContent);

describe('ReorderList', () => {
  it('moveKey clamps and reuses the watchlist move', () => {
    expect(moveKey(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveKey(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b']);
    expect(moveKey(['a', 'b', 'c'], 9, 0)).toEqual(['a', 'b', 'c']);
  });

  it('picks up with Space, moves with arrows, drops, announces each step and keeps focus', async () => {
    const user = userEvent.setup();
    const { container } = render(<Host />);
    const handle = screen.getByRole('button', { name: /Move AAA/ });
    handle.focus();
    await user.keyboard(' ');
    expect(handle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('picked up from position 1 of 3');
    await user.keyboard('{ArrowDown}');
    expect(order()).toEqual(['BBB', 'AAA', 'CCC']);
    expect(screen.getByRole('status').textContent).toBe('AAA, moved to position 2 of 3');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Move AAA/ }));
    await user.keyboard('{ArrowDown}');
    expect(order()).toEqual(['BBB', 'CCC', 'AAA']);
    await user.keyboard(' ');
    expect(screen.getByRole('status').textContent).toBe('AAA, dropped at position 3 of 3');
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('puts the row back on Escape, and arrows do nothing unless picked up', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const handle = screen.getByRole('button', { name: /Move AAA/ });
    handle.focus();
    await user.keyboard('{ArrowDown}');
    expect(order()).toEqual(['AAA', 'BBB', 'CCC']);
    await user.keyboard(' {ArrowDown}{Escape}');
    expect(order()).toEqual(['AAA', 'BBB', 'CCC']);
    expect(screen.getByRole('status').textContent).toBe('AAA, move cancelled');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Move AAA/ }));
  });

  it('buttons mode moves with Up and Down, disables the ends, and keeps focus on the control', async () => {
    const user = userEvent.setup();
    render(<Host mode="buttons" />);
    expect((screen.getByRole('button', { name: 'Move AAA up' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Move CCC down' }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Move AAA down' }));
    expect(order()).toEqual(['BBB', 'AAA', 'CCC']);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move AAA down' }));
    expect(screen.getByRole('status').textContent).toBe('AAA, moved to position 2 of 3');
  });

  it('replaces words with labels', async () => {
    const user = userEvent.setup();
    render(<ReorderList mode="buttons" items={base} onChange={() => {}} label="Reorder" labels={{ down: (t) => `Niche ${t}` }} />);
    await user.click(screen.getByRole('button', { name: 'Niche AAA' }));
    expect(screen.getByRole('status').textContent).toContain('moved to position');
  });
});

describe('Checklist and ProgressPill', () => {
  it('is an ordered list with a progress text, a Done word on finished rows and an action on open ones', async () => {
    const user = userEvent.setup();
    const act = vi.fn<() => void>();
    const { container } = render(
      <Checklist
        label="Setup guide"
        progress="1 of 2 done"
        doneLabel="Done"
        items={[
          { id: 'a', icon: <i />, title: 'Open an account', done: true, action: <button type="button">Unused</button> },
          { id: 'b', icon: <i />, title: 'Add a holding', body: 'By hand', done: false, action: <button type="button" onClick={act}>Add</button> },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Setup guide' });
    expect(list.tagName).toBe('OL');
    expect(screen.getByText('1 of 2 done')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Unused' })).toBeNull();
    expect(container.querySelectorAll('.pu-checklist-seg i[data-on]').length).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(act).toHaveBeenCalledOnce();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('ProgressPill is a button named by its words, with a ring that follows the count', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn<() => void>();
    const { container } = render(
      <ProgressPill done={1} total={4} onClick={onClick}>
        Setup guide · 1 of 4 done
      </ProgressPill>,
    );
    const pill = screen.getByRole('button', { name: 'Setup guide · 1 of 4 done' });
    const ring = container.querySelector('.pu-progress-ring') as HTMLElement;
    expect(ring.getAttribute('data-done')).toBe('1');
    expect(ring.getAttribute('style')).toContain('90deg');
    await user.click(pill);
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

describe('Locked cell and preview', () => {
  it('LockedHead and LockedCell say the lock in words and hold no value', async () => {
    const { container } = render(
      <table>
        <caption>Brokers</caption>
        <thead>
          <tr>
            <th>
              <LockedHead>Net</LockedHead>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <LockedCell column="Net" wide hideUnder={1024} testId="cell" />
          </tr>
        </tbody>
      </table>,
    );
    expect(screen.getByRole('columnheader').textContent).toBe('Net, Not included on this account');
    const cell = screen.getByTestId('cell');
    expect(cell.textContent).toBe('Not included on this account');
    expect(cell.className).toBe('num wide hide-1024');
    expect(cell.getAttribute('data-label')).toBe('Net');
    expect(cell.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('LockedPreview hides its example from assistive technology and offers one action', async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn<() => void>();
    const { container } = render(
      <LockedPreview title="Active brokers" stamp="Preview" lockTitle="Sign in to see it" lockText="Members only." action={<button type="button" onClick={onSignIn}>Sign in</button>} foot="Free" testId="lp">
        <LockedTile />
        <LockedRow index={1} />
        <LockedRow index={2} badge={false} bar={false} />
      </LockedPreview>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Active brokers' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Sign in to see it' })).toBeTruthy();
    const ghost = container.querySelector('.pu-locked-ghost')!;
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    expect(ghost.hasAttribute('inert')).toBe(true);
    expect(ghost.textContent).toBe('');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sign in' }));
    await user.keyboard('{Enter}');
    expect(onSignIn).toHaveBeenCalledOnce();
    expect(await seriousViolations(container)).toEqual([]);
  });
});
