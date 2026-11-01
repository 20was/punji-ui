import type { ReactNode } from 'react';
import { OrderList, OrderTicket, TradeList, TradingHaltBanner, nepalMoneyConfig, type TradingOrder } from '@punji/ui';

// Trading fixtures: OrderTicket (buy, sell with tax, halted in Devanagari), OrderList, TradeList and TradingHaltBanner. All data is invented.
const noop = () => undefined;
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8, alignContent: 'start' }}><h2 className="vr-h">{title}</h2>{children}</section>;

function OrderTicketFixture() {
  return <div className="vr-grid">
    <Block title="Buy">
      <OrderTicket symbol="NABIL" ltp={51_230n} previousClose={50_800n} bandRate="0.10" lotSize={10n} defaultQuantity={100n} defaultPrice={51_230n} onSubmit={noop} testId="vr-ticket" />
    </Block>
    <Block title="Sell with capital gains tax">
      <OrderTicket symbol="NABIL" defaultSide="sell" ltp={60_000n} lowerLimit={54_000n} upperLimit={66_000n} lotSize={10n} defaultQuantity={100n} defaultPrice={60_000n} costPerUnit={51_407n} holdingDays={100} onSubmit={noop} />
    </Block>
    <Block title="Halted, Devanagari digits">
      <OrderTicket symbol="NTC" ltp={88_000n} previousClose={88_000n} bandRate="0.10" lotSize={10n} defaultQuantity={50n} defaultPrice={88_000n} money={nepalMoneyConfig({ digits: 'deva' })} disabledReason="NEPSE is halted. Orders open again at 13:25." onSubmit={noop} />
    </Block>
  </div>;
}

const ORDERS: TradingOrder[] = [
  { id: 'o1', symbol: 'NABIL', side: 'buy', quantity: 100n, filledQuantity: 60n, price: 51_230n, averagePrice: 51_220n, status: 'partially-filled', time: '11:02:15' },
  { id: 'o2', symbol: 'NTC', side: 'sell', quantity: 50n, price: 88_000n, status: 'open', time: '11:05:40' },
  { id: 'o5', symbol: 'CIT', side: 'buy', quantity: 20n, price: 190_000n, status: 'pending', time: '11:06:12' },
  { id: 'o3', symbol: 'UPPER', side: 'buy', quantity: 200n, filledQuantity: 200n, price: 21_000n, averagePrice: 21_000n, status: 'filled', time: '11:10:02' },
  { id: 'o4', symbol: 'HDL', side: 'buy', quantity: 10n, price: 99_990n, status: 'rejected', reason: 'Above the upper circuit', time: '11:12:30' },
  { id: 'o6', symbol: 'ADBL', side: 'sell', quantity: 30n, price: 30_150n, status: 'cancelled', time: '11:20:44' },
];

function OrderListFixture() {
  return <div style={{ display: 'grid', gap: 24 }}>
    <Block title="Orders"><OrderList orders={ORDERS} pendingIds={['o5']} onCancel={noop} onModify={noop} testId="vr-orders" /></Block>
    <Block title="Trades">
      <TradeList trades={[
        { id: 't1', symbol: 'NABIL', side: 'buy', quantity: 60n, price: 51_220n, time: '11:03:01', counterpartyBroker: '58' },
        { id: 't2', symbol: 'UPPER', side: 'buy', quantity: 200n, price: 21_000n, time: '11:10:02', counterpartyBroker: '34' },
        { id: 't3', symbol: 'NTC', side: 'sell', quantity: 50n, price: 88_000n, time: '11:16:45', counterpartyBroker: '17' },
      ]} />
    </Block>
  </div>;
}

function TradingHaltFixture() {
  return <div style={{ display: 'grid', gap: 12 }}>
    <TradingHaltBanner kind="circuit-breaker" changePercent={-4.12} resumesAt="13:25" />
    <TradingHaltBanner kind="circuit-breaker" changePercent={6.05} digits="deva" />
    <TradingHaltBanner kind="halt" detail="Notice: system maintenance. Open orders stay in the book." onDismiss={noop} />
    <TradingHaltBanner kind="resumed" />
  </div>;
}

export const tradingRegistry: Record<string, () => ReactNode> = {
  'order-ticket': OrderTicketFixture,
  'order-list': OrderListFixture,
  'trading-halt': TradingHaltFixture,
};
