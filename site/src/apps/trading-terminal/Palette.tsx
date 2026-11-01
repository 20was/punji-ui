import { useMemo, useState } from 'react';
import { CommandPalette, type CommandItem, type CommandPaletteLabels } from '@punji/ui/command-palette';
import { formatMoney } from '@punji/ui/money';
import { formatHotkey } from '@punji/ui/use-hotkeys';
import { npr, useTerminal, type Screen } from './store.ts';

const labels: CommandPaletteLabels = {
  dialog: 'Terminal commands',
  close: 'Close commands',
  move: 'Move',
  choose: 'Choose',
  open: 'Run',
  closeKey: 'Close',
  chosen: (label) => `${label} chosen`,
  chosenMark: 'chosen',
  actionsHint: 'Left and right arrows choose an action',
};

const quoteMoney = { ...npr, display: 'none' as const };

const SCREENS: { id: Screen; title: string }[] = [
  { id: 'watch', title: 'Market watch' },
  { id: 'symbol', title: 'Chart and ticket' },
  { id: 'orders', title: 'Orders' },
  { id: 'positions', title: 'Positions' },
  { id: 'trades', title: 'Trades' },
];

/** Every terminal action in one keyboard-first list: screens, scrips (open, buy, sell, watch), the feed and the demo scenarios. */
export default function Palette({ onClose }: { onClose: () => void }) {
  const { state, derived, dispatch, go } = useTerminal();
  const [query, setQuery] = useState('');

  const all = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = SCREENS.map((s, i) => ({
      id: `screen:${s.id}`,
      group: 'screens',
      groupLabel: 'Go to',
      title: s.title,
      hint: formatHotkey(String(i + 1)),
      actions: [{ id: 'open', label: 'Open' }],
    }));
    for (const q of derived.quotes) {
      items.push({
        id: `scrip:${q.symbol}`,
        group: 'scrips',
        groupLabel: 'Scrips',
        title: q.symbol,
        sub: q.name,
        meta: formatMoney(q.ltp, quoteMoney),
        tags: [q.sector],
        kind: 'entity',
        actions: [
          { id: 'open', label: 'Chart' },
          { id: 'buy', label: 'Buy' },
          { id: 'sell', label: 'Sell' },
          { id: 'watch', label: state.watchlist.includes(q.symbol) ? 'Unwatch' : 'Watch' },
        ],
      });
    }
    items.push(
      { id: 'feed:run', group: 'feed', groupLabel: 'Live data', title: state.running ? 'Pause live prices' : 'Resume live prices', hint: 'P', actions: [{ id: 'run', label: 'Run' }] },
      { id: 'feed:down', group: 'feed', groupLabel: 'Live data', title: state.feedDown ? 'Restore the price feed' : 'Simulate a feed outage', sub: 'Shows the error state of the quote table', actions: [{ id: 'run', label: 'Run' }] },
      derived.halted
        ? { id: 'demo:resume', group: 'demo', groupLabel: 'Scenarios', title: 'Resume trading now', sub: 'Lift the circuit-breaker halt early', actions: [{ id: 'run', label: 'Run' }] }
        : { id: 'demo:shock', group: 'demo', groupLabel: 'Scenarios', title: 'Trip the index circuit breaker', sub: 'Marks every scrip down about 4.3%; trading pauses 15 minutes', actions: [{ id: 'run', label: 'Run' }] },
    );
    return items;
  }, [derived.quotes, derived.halted, state.running, state.feedDown, state.watchlist]);

  const items = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return all;
    return all.filter((item) => {
      const text = [item.title, item.sub, item.groupLabel, ...(item.tags ?? [])].join(' ').toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [all, query]);

  return (
    <CommandPalette
      labels={labels}
      placeholder="Type a scrip, a screen or a command"
      query={query}
      onQuery={setQuery}
      items={items}
      autoCapitalize="off"
      testIdPrefix="tt-cmd"
      empty={items.length ? undefined : <span>Nothing matches “{query.trim()}”. Try a symbol such as NABIL, or “orders”.</span>}
      onRun={(item, action) => {
        onClose();
        const [kind, key] = item.id.split(':') as [string, string];
        if (kind === 'screen') go(key as Screen);
        else if (kind === 'scrip') {
          if (action.id === 'watch') dispatch({ type: 'watch', symbol: key });
          else if (action.id === 'buy' || action.id === 'sell') {
            dispatch({ type: 'ticket', side: action.id, symbol: key });
            go('symbol');
          } else {
            dispatch({ type: 'select', symbol: key });
            go('symbol');
          }
        } else if (item.id === 'feed:run') dispatch({ type: 'run', running: !state.running });
        else if (item.id === 'feed:down') dispatch({ type: 'feed', down: !state.feedDown });
        else if (item.id === 'demo:shock') dispatch({ type: 'shock' });
        else if (item.id === 'demo:resume') dispatch({ type: 'resume' });
      }}
      onClose={onClose}
    />
  );
}
