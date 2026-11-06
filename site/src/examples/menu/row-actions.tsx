import { useState } from 'react';
import { MenuButton } from '@punji/ui/menu';

const holdings = [
  { symbol: 'NABIL', units: 120 },
  { symbol: 'NICA', units: 80 },
  { symbol: 'SBL', units: 45 },
];

// Row actions: one icon-only trigger per row. `label` is required and should name the row, because a screen reader
// user hears the same "..." button on every row otherwise. The destructive item goes last, after a separator.
export default function Example() {
  const [last, setLast] = useState('Nothing chosen yet');
  return (
    <div style={{ display: 'grid', gap: 8, width: 'min(100%, 420px)' }}>
      <table>
        <caption>Holdings</caption>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'start' }}>Symbol</th>
            <th scope="col" style={{ textAlign: 'end' }}>Units</th>
            <th scope="col"><span style={{ position: 'absolute', insetInlineStart: -9999 }}>Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.symbol}>
              <th scope="row" style={{ textAlign: 'start' }}>{h.symbol}</th>
              <td style={{ textAlign: 'end' }}>{h.units}</td>
              <td style={{ textAlign: 'end' }}>
                <MenuButton
                  iconOnly
                  align="end"
                  label={`Actions for ${h.symbol}`}
                  items={[
                    { id: 'view', label: 'View', onSelect: () => setLast(`View ${h.symbol}`) },
                    { id: 'sell', label: 'Sell', onSelect: () => setLast(`Sell ${h.symbol}`) },
                    { id: 'sep', type: 'separator' },
                    { id: 'remove', label: 'Remove from watchlist', tone: 'danger', onSelect: () => setLast(`Remove ${h.symbol}`) },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p role="status">{last}</p>
    </div>
  );
}
