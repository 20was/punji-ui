// The docs' one door to shared mock data. It lives in fixtures/ (not src/) and is
// never published; the visual-regression fixture app reads the same file.
export * from '../../fixtures/market-data.ts';
export * from '../../fixtures/accounting-data.ts';
export * from '../../fixtures/banking-data.ts';
export * from '../../fixtures/portfolio-data.ts';
export * from '../../fixtures/trade-data.ts';
export * from '../../fixtures/share-issues-data.ts';
export * from '../../fixtures/lending-data.ts';


const priceText = (minor: number) => `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;

// Sixty five-minute bars of a made-up NEPSE stock: a decimal-string price range, an exact integer volume, and the
// buyer-initiated part. A small deterministic generator, so the page is the same every time.
export function sessionBars(): { low: string; high: string; volume: bigint; buyVolume: bigint }[] {
  const bars: { low: string; high: string; volume: bigint; buyVolume: bigint }[] = [];
  let seed = 7;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  let mid = 50_000;
  for (let i = 0; i < 60; i += 1) {
    // Drift up for the first half, back down in the second, pulled gently toward 505.00.
    mid += Math.round((next() - 0.5) * 120) + (i < 30 ? 14 : -14) + Math.round((50_500 - mid) / 40);
    const spread = 60 + Math.round(next() * 140);
    // More shares trade near the centre of the day's range.
    const crowd = 1 + Math.max(0, 8 - Math.round(Math.abs(mid - 50_500) / 120));
    const volume = BigInt(900 + Math.round(next() * 3200)) * BigInt(crowd);
    const buy = (volume * BigInt(Math.round(35 + next() * 30))) / 100n;
    bars.push({ low: priceText(mid - spread), high: priceText(mid + spread), volume, buyVolume: buy });
  }
  return bars;
}
