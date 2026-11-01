import { TradeList } from '@punji/ui/order-list';

export default function Example() {
  return (
    <TradeList
      trades={[
        { id: '2081071501234', symbol: 'NABIL', side: 'buy', quantity: 60n, price: 51_220n, time: '11:03:01', counterpartyBroker: '58' },
        { id: '2081071501301', symbol: 'UPPER', side: 'buy', quantity: 200n, price: 21_000n, time: '11:10:02', counterpartyBroker: '34' },
        { id: '2081071501388', symbol: 'NTC', side: 'sell', quantity: 50n, price: 88_000n, time: '11:16:45', counterpartyBroker: '17' },
      ]}
    />
  );
}
