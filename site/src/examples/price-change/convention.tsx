import { PriceChange } from '@punji/ui/price-change';

// The same moves under the green-up convention (most markets) and red-up (some markets, such as China and Korea).
// Only the colour changes; the arrow, sign and spoken words stay. Labels translate, here into Nepali.
const moves = [
  { label: 'Up 5.5%', current: 10550n, previous: 10000n },
  { label: 'Down 10%', current: 9000n, previous: 10000n },
];

export default function Example() {
  return (
    <div className="ex-cols">
      <div className="ex-panel">
        <p className="ex-panel-title">Green up</p>
        {moves.map((m) => (
          <PriceChange key={m.label} current={m.current} previous={m.previous} currency="USD" locale="en-US" />
        ))}
      </div>
      <div className="ex-panel">
        <p className="ex-panel-title">Red up</p>
        {moves.map((m) => (
          <PriceChange key={m.label} current={m.current} previous={m.previous} currency="USD" locale="en-US" convention="red-up" />
        ))}
      </div>
      <div className="ex-panel">
        <p className="ex-panel-title" lang="ne">
          Spoken in Nepali
        </p>
        <PriceChange current={10550n} previous={10000n} currency="NPR" locale="en-IN" labels={{ up: 'बढ्यो', down: 'घट्यो', flat: 'उस्तै' }} />
        <PriceChange current={9000n} previous={10000n} currency="NPR" locale="en-IN" labels={{ up: 'बढ्यो', down: 'घट्यो', flat: 'उस्तै' }} />
      </div>
    </div>
  );
}
