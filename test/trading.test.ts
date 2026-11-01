import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  brokerCommission, capitalGainsTaxRate, circuitBreakerStage, commissionSlabFor, estimateNepseTrade, isOnTick, nepseCircuitTiers, nepseFeeSchedule,
  sebonFee, snapToTick, validateOrder, type NepseFeeSchedule,
} from '../src/index.ts';
import { NUM_RUNS } from './fc.ts';

const bad = (slabs: NepseFeeSchedule['commission']['slabs']) => ({ ...nepseFeeSchedule, commission: { ...nepseFeeSchedule.commission, slabs } });

describe('NEPSE fees', () => {
  it('applies one band rate to the whole amount, with the minimum', () => {
    expect(brokerCommission(5_123_000n)).toBe(16_906n); // Rs 51,230 at 0.33%, 16,905.9 paisa rounded half-up
    expect(brokerCommission(5_000_000n)).toBe(18_000n); // exactly Rs 50,000 is still the 0.36% band
    expect(brokerCommission(5_000_001n)).toBe(16_500n);
    expect(brokerCommission(100_000n)).toBe(1_000n); // Rs 1,000 at 0.36% is Rs 3.60, below the Rs 10 minimum
    expect(brokerCommission(0n)).toBe(0n);
    expect(brokerCommission(2_000_000_000n)).toBe(4_800_000n); // Rs 2 crore at 0.24%
    expect(commissionSlabFor(200_000_000n).rate).toBe('0.0031');
  });

  it('supports marginal bands and a custom rounding mode', () => {
    const marginal: NepseFeeSchedule = { ...nepseFeeSchedule, commission: { ...nepseFeeSchedule.commission, method: 'marginal' } };
    expect(brokerCommission(6_000_000n, marginal)).toBe(21_300n); // 18,000 + 3,300
    expect(brokerCommission(3_000_000n, marginal)).toBe(10_800n);
    expect(brokerCommission(5_123_000n, { ...nepseFeeSchedule, rounding: 'floor' })).toBe(16_905n);
  });

  it('rejects malformed schedules and amounts', () => {
    expect(() => brokerCommission(1n, bad([]))).toThrow(RangeError);
    expect(() => brokerCommission(1n, bad([{ upTo: 10n, rate: '0.01' }]))).toThrow(/last/);
    expect(() => brokerCommission(1n, bad([{ upTo: 10n, rate: '0.01' }, { upTo: 5n, rate: '0.01' }, { upTo: null, rate: '0.01' }]))).toThrow(/ascend/);
    expect(() => brokerCommission(-1n)).toThrow(RangeError);
    expect(() => brokerCommission(1n, { ...nepseFeeSchedule, commission: { ...nepseFeeSchedule.commission, method: 'flat' as 'whole' } })).toThrow(TypeError);
  });

  it('computes the SEBON fee and the CGT rate by holding period and investor', () => {
    expect(sebonFee(5_123_000n)).toBe(768n);
    expect(capitalGainsTaxRate(100)).toBe('0.075');
    expect(capitalGainsTaxRate(365)).toBe('0.075');
    expect(capitalGainsTaxRate(366)).toBe('0.05');
    expect(capitalGainsTaxRate(10, 'institution')).toBe('0.10');
    expect(() => capitalGainsTaxRate(1.5)).toThrow(RangeError);
  });

  it('estimates a buy: amount, fees, payable and per-unit cost', () => {
    const buy = estimateNepseTrade({ side: 'buy', quantity: 100n, price: 51_230n });
    expect(buy).toMatchObject({ amount: 5_123_000n, commission: 16_906n, commissionRate: '0.0033', sebonFee: 768n, dpCharge: 0n, fees: 17_674n, capitalGain: null, capitalGainsTax: 0n, total: 5_140_674n, perUnit: 51_407n });
    expect(estimateNepseTrade({ side: 'buy', quantity: 100n, price: 51_230n }, { ...nepseFeeSchedule, dpChargeOn: 'both' }).dpCharge).toBe(2_500n);
  });

  it('estimates a sell with capital gains tax', () => {
    const base = { side: 'sell' as const, quantity: 100n, price: 60_000n, costBasis: 5_140_674n };
    const short = estimateNepseTrade({ ...base, holdingDays: 100 });
    expect(short).toMatchObject({ commission: 19_800n, sebonFee: 900n, dpCharge: 2_500n, fees: 23_200n, capitalGain: 836_126n, capitalGainsTaxRate: '0.075', capitalGainsTax: 62_709n, total: 5_914_091n });
    expect(estimateNepseTrade({ ...base, holdingDays: 400 }).capitalGainsTax).toBe(41_806n);
    expect(estimateNepseTrade({ ...base, investor: 'institution' }).capitalGainsTax).toBe(83_613n);
    // A gain is known without a holding period, but no tax is guessed.
    expect(estimateNepseTrade(base)).toMatchObject({ capitalGain: 836_126n, capitalGainsTaxRate: null, capitalGainsTax: 0n });
    // A loss owes nothing.
    expect(estimateNepseTrade({ ...base, price: 40_000n, holdingDays: 10 }).capitalGainsTax).toBe(0n);
    expect(estimateNepseTrade({ ...base, dpScrips: 0, holdingDays: 10 }).dpCharge).toBe(0n);
  });

  it('validates trade input', () => {
    expect(() => estimateNepseTrade({ side: 'buy', quantity: 0n, price: 1n })).toThrow(RangeError);
    expect(() => estimateNepseTrade({ side: 'buy', quantity: 1n, price: -1n })).toThrow(RangeError);
    expect(() => estimateNepseTrade({ side: 'hold' as 'buy', quantity: 1n, price: 1n })).toThrow(TypeError);
    expect(() => estimateNepseTrade({ side: 'sell', quantity: 1n, price: 1n, dpScrips: -1 })).toThrow(RangeError);
  });

  it('property: the buy total is amount plus fees and the sell total never exceeds the amount', () => {
    fc.assert(fc.property(fc.bigInt({ min: 1n, max: 100_000n }), fc.bigInt({ min: 10n, max: 1_000_000n }), (quantity, price) => {
      const buy = estimateNepseTrade({ side: 'buy', quantity, price });
      const sell = estimateNepseTrade({ side: 'sell', quantity, price });
      expect(buy.total).toBe(buy.amount + buy.commission + buy.sebonFee + buy.dpCharge);
      expect(buy.commission >= nepseFeeSchedule.commission.minimum).toBe(true);
      expect(sell.total <= sell.amount).toBe(true);
    }), { numRuns: NUM_RUNS });
  });
});

describe('order checks', () => {
  it('snaps a price to the tick grid', () => {
    expect(snapToTick(51_234n, 10n)).toBe(51_230n);
    expect(snapToTick(51_235n, 10n)).toBe(51_240n);
    expect(snapToTick(51_239n, 10n, 'floor')).toBe(51_230n);
    expect(snapToTick(51_231n, 10n, 'ceil')).toBe(51_240n);
    expect(isOnTick(51_230n, 10n)).toBe(true);
    expect(isOnTick(51_231n, 10n)).toBe(false);
    expect(() => snapToTick(1n, 0n)).toThrow(RangeError);
  });

  it('property: a snapped price is on the tick and within half a tick', () => {
    fc.assert(fc.property(fc.bigInt({ min: 0n, max: 10_000_000n }), fc.bigInt({ min: 1n, max: 1_000n }), (price, tick) => {
      const snapped = snapToTick(price, tick);
      expect(isOnTick(snapped, tick)).toBe(true);
      const gap = snapped > price ? snapped - price : price - snapped;
      expect(gap * 2n <= tick).toBe(true);
    }), { numRuns: NUM_RUNS });
  });

  it('lists issues in field order', () => {
    const rules = { tickSize: 10n, lotSize: 10n, lowerLimit: 46_107n, upperLimit: 56_353n, maxQuantity: 1_000n };
    expect(validateOrder({ quantity: 100n, price: 51_230n }, rules)).toEqual([]);
    expect(validateOrder({ quantity: null, price: null }, rules)).toEqual(['quantity-missing', 'price-missing']);
    expect(validateOrder({ quantity: 105n, price: 51_231n }, rules)).toEqual(['quantity-lot', 'price-tick']);
    expect(validateOrder({ quantity: 5n, price: 60_000n }, rules)).toEqual(['quantity-min', 'price-above-upper']);
    expect(validateOrder({ quantity: 2_000n, price: 40_000n }, rules)).toEqual(['quantity-max', 'price-below-lower']);
    expect(() => validateOrder({ quantity: 1n, price: 1n }, { tickSize: 1n, lotSize: 0n })).toThrow(RangeError);
  });
});

describe('circuitBreakerStage', () => {
  it('picks the highest tier the index move reaches, either direction', () => {
    expect(circuitBreakerStage(3.99)).toBeNull();
    expect(circuitBreakerStage(-4.12)?.haltMinutes).toBe(15);
    expect(circuitBreakerStage(5)?.haltMinutes).toBe(40);
    expect(circuitBreakerStage(-6.5)?.haltMinutes).toBeNull();
    expect(circuitBreakerStage(-6.5)?.movePercent).toBe(6);
    expect(circuitBreakerStage(Number.NaN)).toBeNull();
    expect(circuitBreakerStage(7, nepseCircuitTiers.toReversed())?.movePercent).toBe(6);
  });
});
