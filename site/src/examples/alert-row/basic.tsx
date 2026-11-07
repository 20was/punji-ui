import { AlertListEmpty, AlertRow, AlertRowList, AlertRowSkeleton, type AlertRowProps } from '@punji/ui/alert-row';
import { alertDistance, type AlertDirection } from '@punji/ui/alert-distance';
import { alertTarget } from '@punji/ui/alert-target';
import { Card } from '@punji/ui/card';

// Prices and targets are bigint paisa. alertDistance gives the exact gap, the percent and the bar fill.
interface Alert { symbol: string; name: string; direction: AlertDirection; target: bigint; price: bigint; paused?: boolean }
const alerts: Alert[] = [
  { symbol: 'HRL', name: 'Himalayan Reinsurance', direction: 'above', target: 50000n, price: 49380n },
  { symbol: 'NABIL', name: 'Nabil Bank', direction: 'above', target: 50000n, price: 51230n },
  { symbol: 'NICA', name: 'NIC Asia Bank', direction: 'below', target: 33000n, price: 34810n, paused: true },
];

function rowOf(a: Alert): AlertRowProps {
  const d = alertDistance(a.direction, a.target, a.price)!;
  return {
    symbol: a.symbol,
    name: a.name,
    mark: a.direction,
    status: a.paused ? 'paused' : d.crossed ? 'crossed' : 'waiting',
    condition: `${a.direction === 'above' ? 'Above' : 'Below'} ${alertTarget(a.target)}`,
    repeat: 'Once',
    price: alertTarget(a.price),
    distance: d.crossed ? 'Past the target · fires on the next check' : `${Math.abs(d.pct).toFixed(2)}% to go`,
    closeness: d.closeness,
    onOpen: () => {},
  };
}

export default function Example() {
  return (
    <Card title="Price alerts" headingLevel={3}>
      <AlertRowList label="Price alerts" head={['Alert', 'When', 'Price', 'Distance']}>
        {alerts.map((a) => <AlertRow key={a.symbol} {...rowOf(a)} />)}
        <AlertRowSkeleton />
      </AlertRowList>
      <AlertListEmpty title="No fired alerts" body="Alerts that fire show up here." />
    </Card>
  );
}
