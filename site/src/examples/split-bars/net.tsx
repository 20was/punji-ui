import { NetBar, NetBarHead } from '@punji/ui/bars';

// Net buying by broker (synthetic). The tip is read on pointer hover and always spoken after the figure.
const rows = [
  { broker: 'Broker 17', bought: 48.2, sold: 33.75 },
  { broker: 'Broker 34', bought: 12.1, sold: 58.59 },
  { broker: 'Broker 58', bought: 20, sold: 20 },
];
const max = Math.max(...rows.map((r) => Math.abs(r.bought - r.sold)));
const fmt = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}`;

export default function Example() {
  return (
    <div className="ex-stack">
      <NetBarHead left="Net sold" right="Net bought" />
      {rows.map((r) => {
        const net = r.bought - r.sold;
        return (
          <div key={r.broker} className="ex-stack">
            <strong>{r.broker}</strong>
            <NetBar
              value={net}
              max={max}
              text={fmt(net)}
              tip={{
                title: r.broker,
                rows: [
                  { label: 'Bought', value: r.bought.toFixed(2), tone: 'gain' },
                  { label: 'Sold', value: r.sold.toFixed(2), tone: 'loss' },
                  { label: 'Net', value: fmt(net) },
                ],
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
