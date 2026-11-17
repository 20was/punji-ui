import { describe, expect, it } from 'vitest';

import { advanceDeclineLine, percentAboveMA } from '../src/chart-math/breadth.ts';
import { kagiLines, lineBreak, pointAndFigure, rangeBars, renkoBricks, type PriceBar } from '../src/chart-math/priceOnly.ts';

/** Bars from closes: dates are consecutive days of November 2025 and the close is the only price. */
const closes = (...c: string[]): PriceBar[] => c.map((close, i) => ({ date: `2025-11-${String(i + 1).padStart(2, '0')}`, close }));
const ohlc = (rows: [string, string, string, string][]): PriceBar[] => rows.map(([open, high, low, close], i) => ({ date: `2025-11-${String(i + 1).padStart(2, '0')}`, open, high, low, close }));

describe('renkoBricks (TradingView Renko, two-box reversal as aticio/renko)', () => {
  it('forms a brick one box beyond the last brick and reverses one box beyond its open edge (worked by hand)', () => {
    // box 5, anchor 100: 106 -> 100..105; 111 -> 105..110; 104 and 108 form nothing; 99 <= 105 - 5 -> down 105..100.
    const { boxSize, bricks } = renkoBricks(closes('100.00', '103.00', '106.00', '111.00', '108.00', '104.00', '99.00', '98.00'), { box: '5' });
    expect(boxSize).toBe('5.00');
    expect(bricks.map((b) => [b.direction, b.open, b.close, b.fromBar, b.toBar, b.fromDate, b.toDate])).toEqual([
      ['up', '100.00', '105.00', 0, 2, '2025-11-01', '2025-11-03'],
      ['up', '105.00', '110.00', 3, 3, '2025-11-04', '2025-11-04'],
      ['down', '105.00', '100.00', 4, 6, '2025-11-05', '2025-11-07'],
    ]);
  });

  it('does not reverse on a single box against the trend', () => {
    const { bricks } = renkoBricks(closes('100', '106', '101'), { box: '5' });
    expect(bricks.map((b) => b.direction)).toEqual(['up']);
  });

  it('forms several bricks from one price and shares the bar', () => {
    const { bricks } = renkoBricks(closes('100', '120'), { box: '5' });
    expect(bricks.map((b) => `${b.open}-${b.close}`)).toEqual(['100-105', '105-110', '110-115', '115-120']);
    expect(bricks.map((b) => [b.fromBar, b.toBar])).toEqual([[0, 1], [1, 1], [1, 1], [1, 1]]);
  });

  it('goes down first when the first move is down', () => {
    const { bricks } = renkoBricks(closes('100', '94'), { box: '5' });
    expect(bricks).toHaveLength(1);
    expect(bricks[0]).toMatchObject({ direction: 'down', open: '100', close: '95' });
  });

  it('is exact on decimals that floats get wrong (0.1 + 0.2)', () => {
    const { bricks } = renkoBricks(closes('0.1', '0.4'), { box: '0.1' });
    expect(bricks.map((b) => `${b.open}-${b.close}`)).toEqual(['0.1-0.2', '0.2-0.3', '0.3-0.4']);
  });

  it('uses the most decimals of any input as the scale', () => {
    const { boxSize, bricks } = renkoBricks(closes('100', '101.255'), { box: '1' });
    expect(boxSize).toBe('1.000');
    expect(bricks[0]!.close).toBe('101.000');
  });

  it('takes the ATR as the box: Wilder, period 2, rounded half up (TR 2, 2, 3 -> ATR 2.5 -> 3)', () => {
    const bars = ohlc([['10', '12', '10', '11'], ['11', '13', '11', '12'], ['12', '15', '12', '14']]);
    expect(renkoBricks(bars, { box: { atr: 2 } }).boxSize).toBe('3');
    const fine = ohlc([['10.00', '12.00', '10.00', '11.00'], ['11.00', '13.00', '11.00', '12.00'], ['12.00', '15.00', '12.00', '14.00']]);
    expect(renkoBricks(fine, { box: { atr: 2 } }).boxSize).toBe('2.50');
  });

  it('never lets an ATR box fall below one unit', () => {
    const bars = ohlc([['10.00', '10.00', '10.00', '10.00'], ['10.00', '10.00', '10.00', '10.00']]);
    expect(renkoBricks(bars, { box: { atr: 14 } }).boxSize).toBe('0.01');
  });

  it('walks low then high on an up bar and high then low on a down bar with the highlow source', () => {
    // Up bar (close >= open) 100: low 98, high 111, close 110: price touches 98 first (nothing), then 111 -> two bricks.
    const up = renkoBricks(ohlc([['100', '100', '100', '100'], ['100', '111', '98', '110']]), { box: '5', source: 'highlow' });
    expect(up.bricks.map((b) => `${b.direction}:${b.open}-${b.close}`)).toEqual(['up:100-105', 'up:105-110']);
    // Down bar: high 111 first (two bricks up), then low 98 reverses once: 110 - 2*5? bottom 105 - 5 = 100 -> 98 reaches it.
    const down = renkoBricks(ohlc([['100', '100', '100', '100'], ['110', '111', '98', '99']]), { box: '5', source: 'highlow' });
    expect(down.bricks.map((b) => `${b.direction}:${b.open}-${b.close}`)).toEqual(['up:100-105', 'up:105-110', 'down:105-100']);
  });

  it('handles no bars, one bar and bad input', () => {
    expect(renkoBricks([], { box: '5' })).toEqual({ boxSize: '5', bricks: [] });
    expect(renkoBricks(closes('100'), { box: '5' }).bricks).toEqual([]);
    expect(() => renkoBricks(closes('100'), { box: '0' })).toThrow(RangeError);
    expect(() => renkoBricks(closes('100'), { box: 'abc' })).toThrow(RangeError);
    expect(() => renkoBricks(closes('1e3'), { box: '5' })).toThrow(RangeError);
    expect(() => renkoBricks(closes('100', '101'), { box: { atr: 14 } })).toThrow(RangeError);
  });
});

describe('kagiLines (reversal amount; yang and yin by the previous shoulder and waist)', () => {
  const rows = closes('100', '105', '102', '101', '97', '98', '110', '95');

  it('extends while closes keep going and reverses at the amount (worked by hand, reversal 4)', () => {
    const lines = kagiLines(rows, { reversal: '4' });
    expect(lines.map((l) => [l.direction, l.start, l.end, l.fromBar, l.toBar])).toEqual([
      ['up', '100', '105', 0, 1],
      ['down', '105', '97', 2, 4],
      ['up', '97', '110', 5, 6],
      ['down', '110', '95', 7, 7],
    ]);
  });

  it('turns yang above the previous shoulder and yin below the previous waist, splitting the line where it passes', () => {
    const lines = kagiLines(rows, { reversal: '4' });
    expect(lines[0]!.parts).toEqual([{ start: '100', end: '105', style: 'yin' }]);
    expect(lines[1]!.parts).toEqual([{ start: '105', end: '97', style: 'yin' }]);
    // line 3 passes the shoulder 105 (the end of line 1) on its way to 110.
    expect(lines[2]!.parts).toEqual([{ start: '97', end: '105', style: 'yin' }, { start: '105', end: '110', style: 'yang' }]);
    // line 4 is thick until it passes the waist 97, then thin.
    expect(lines[3]!.parts).toEqual([{ start: '110', end: '97', style: 'yang' }, { start: '97', end: '95', style: 'yin' }]);
    expect(lines.map((l) => l.style)).toEqual(['yin', 'yin', 'yang', 'yin']);
  });

  it('reverses by a percentage of the line end, in exact integers', () => {
    // 4 percent: 100 -> 105 (5% >= 4%) is a line; a fall to 102 is 3 of 105 = 2.857%: no reversal; to 100 is 4.76%: reversal.
    expect(kagiLines(closes('100', '105', '102'), { reversal: { percent: '4' } })).toHaveLength(1);
    const two = kagiLines(closes('100', '105', '100'), { reversal: { percent: '4' } });
    expect(two.map((l) => `${l.direction}:${l.start}-${l.end}`)).toEqual(['up:100-105', 'down:105-100']);
    // exactly on the threshold counts: 100 * 5% = 5.
    expect(kagiLines(closes('100', '105'), { reversal: { percent: '5' } })).toHaveLength(1);
    expect(kagiLines(closes('100', '104.99'), { reversal: { percent: '5' } })).toHaveLength(0);
  });

  it('starts only when the first move reaches the reversal, and returns nothing for a flat series', () => {
    expect(kagiLines(closes('100', '102', '101'), { reversal: '5' })).toEqual([]);
    expect(kagiLines(closes('100', '100', '100'), { reversal: '5' })).toEqual([]);
    expect(kagiLines([], { reversal: '5' })).toEqual([]);
  });

  it('rejects a zero or malformed reversal', () => {
    expect(() => kagiLines(closes('1', '2'), { reversal: '0' })).toThrow(RangeError);
    expect(() => kagiLines(closes('1', '2'), { reversal: { percent: 'x' } })).toThrow(RangeError);
  });
});

describe('pointAndFigure (box size, reversal count; X rises, O falls)', () => {
  it('builds X and O columns from closes (worked by hand, box 5, reversal 3)', () => {
    // boxes: 100 -> 20, 103 -> 20, 112 -> 22, 108 -> 21, 98 -> 19, 97 -> 19, 110 -> 22.
    const { boxSize, reversal, columns } = pointAndFigure(closes('100', '103', '112', '108', '98', '97', '110'), { box: '5' });
    expect(boxSize).toBe('5');
    expect(reversal).toBe(3);
    expect(columns.map((c) => [c.direction, c.low, c.high, c.boxes, c.fromBar, c.toBar])).toEqual([
      ['x', '100', '110', 3, 0, 2],
      // 98 is box 19 = 22 - 3: the O column starts one box under the X top (21) and runs to 19.
      ['o', '95', '105', 3, 3, 4],
      // 110 is box 22 = 19 + 3: the X column starts one box above the O bottom (20).
      ['x', '100', '110', 3, 5, 6],
    ]);
  });

  it('does not reverse on fewer boxes than the reversal count', () => {
    const { columns } = pointAndFigure(closes('100', '112', '101'), { box: '5' });
    expect(columns.map((c) => c.direction)).toEqual(['x']);
  });

  it('respects a reversal of one box and a reversal of two', () => {
    expect(pointAndFigure(closes('100', '112', '104'), { box: '5', reversal: 1 }).columns.map((c) => c.direction)).toEqual(['x', 'o']);
    expect(pointAndFigure(closes('100', '112', '104'), { box: '5', reversal: 2 }).columns.map((c) => c.direction)).toEqual(['x', 'o']);
    expect(pointAndFigure(closes('100', '112', '106'), { box: '5', reversal: 2 }).columns.map((c) => c.direction)).toEqual(['x']);
  });

  it('starts with an O column when the first move is down, and keeps O from the base box', () => {
    const { columns } = pointAndFigure(closes('100', '93', '91'), { box: '5' });
    expect(columns.map((c) => [c.direction, c.low, c.high, c.boxes])).toEqual([['o', '90', '100', 3]]);
  });

  it('floors prices into boxes with decimal prices', () => {
    const { columns } = pointAndFigure(closes('0.34', '0.52'), { box: '0.1' });
    expect(columns.map((c) => [c.low, c.high, c.boxes])).toEqual([['0.30', '0.50', 3]]);
  });

  it('uses a bar high to extend an X column before its low is tried for a reversal (highlow)', () => {
    const bars = ohlc([['100', '101', '99', '100'], ['100', '112', '100', '111'], ['111', '123', '101', '102']]);
    // Bar 2: high 123 is box 24 > 22: the X column extends to 24; the low (box 20) is not tried.
    const { columns } = pointAndFigure(bars, { box: '5', source: 'highlow' });
    expect(columns.map((c) => [c.direction, c.low, c.high])).toEqual([['x', '100', '120']]);
  });

  it('handles no bars and rejects bad input', () => {
    expect(pointAndFigure([], { box: '5' }).columns).toEqual([]);
    expect(() => pointAndFigure(closes('1', '2'), { box: '5', reversal: 0 })).toThrow(RangeError);
    expect(() => pointAndFigure(closes('1', '2'), { box: '-5' })).toThrow(RangeError);
  });
});

describe('lineBreak (three-line break; TradingView: past the high or low of the previous N lines)', () => {
  it('adds lines past the last end and reverses past the last three lines (worked by hand)', () => {
    const lines = lineBreak(closes('10', '12', '14', '13', '15', '9', '16'));
    expect(lines.map((l) => [l.direction, l.open, l.close, l.fromBar, l.toBar])).toEqual([
      ['up', '10', '12', 0, 1],
      ['up', '12', '14', 2, 2],
      // 13 is not past 14 and not below the lowest of the three lines (10): nothing. 15 adds a line (bars 3 and 4).
      ['up', '14', '15', 3, 4],
      // 9 is below 10, the low of the last three lines: a reversal line from 15.
      ['down', '15', '9', 5, 5],
      // 16 is above 15, the high of the last three lines (12-14, 14-15, 15-9).
      ['up', '9', '16', 6, 6],
    ]);
  });

  it('needs the close to break all N lines to reverse', () => {
    expect(lineBreak(closes('10', '12', '14', '16', '11')).map((l) => l.direction)).toEqual(['up', 'up', 'up']);
    expect(lineBreak(closes('10', '12', '14', '16', '9')).map((l) => l.direction)).toEqual(['up', 'up', 'up', 'down']);
    // Two-line break reverses sooner: 11 is below the low of the last two lines (12).
    expect(lineBreak(closes('10', '12', '14', '16', '11'), { lines: 2 }).map((l) => l.direction)).toEqual(['up', 'up', 'up', 'down']);
  });

  it('ignores equal closes at the start and returns nothing for a flat series', () => {
    expect(lineBreak(closes('10', '10', '11')).map((l) => [l.open, l.close, l.fromBar, l.toBar])).toEqual([['10', '11', 0, 2]]);
    expect(lineBreak(closes('10', '10'))).toEqual([]);
    expect(lineBreak([])).toEqual([]);
  });

  it('rejects a bad line count', () => {
    expect(() => lineBreak(closes('1', '2'), { lines: 0 })).toThrow(RangeError);
  });
});

describe('rangeBars (fixed range, each bar exactly the range)', () => {
  it('closes a bar a full range from its low and opens the next at that close (worked by hand, range 2)', () => {
    const bars = rangeBars(closes('10.00', '11.00', '12.50', '14.00', '11.00'), { range: '2' });
    expect(bars.map((b) => [b.direction, b.open, b.high, b.low, b.close, b.fromBar, b.toBar])).toEqual([
      ['up', '10.00', '12.00', '10.00', '12.00', 0, 2],
      ['up', '12.00', '14.00', '12.00', '14.00', 3, 3],
      ['down', '14.00', '14.00', '12.00', '12.00', 4, 4],
    ]);
  });

  it('closes several bars on a gap, and every bar has the exact range', () => {
    const bars = rangeBars(closes('10', '15'), { range: '2' });
    expect(bars.map((b) => `${b.low}-${b.high}`)).toEqual(['10-12', '12-14']);
    for (const b of rangeBars(closes('10', '15', '3', '7', '1'), { range: '2.5' })) expect(Number(b.high) - Number(b.low)).toBeCloseTo(2.5, 10);
  });

  it('does not return the bar still forming', () => {
    expect(rangeBars(closes('10', '11', '10.5'), { range: '2' })).toEqual([]);
  });

  it('feeds the high and low with the highlow source', () => {
    const bars = rangeBars(ohlc([['10', '10', '10', '10'], ['10', '13', '9', '12']]), { range: '2', source: 'highlow' });
    // Up bar: low 9 first (bar 10..9, range 1), then high 13: 13 - 9 = 4 >= 2 -> 9..11 up, 11..13 up.
    expect(bars.map((b) => `${b.direction}:${b.low}-${b.high}`)).toEqual(['up:9-11', 'up:11-13']);
  });

  it('rejects a zero or malformed range', () => {
    expect(() => rangeBars(closes('1', '2'), { range: '0' })).toThrow(RangeError);
    expect(() => rangeBars(closes('1', '2'), { range: '1,5' })).toThrow(RangeError);
  });
});

describe('advanceDeclineLine', () => {
  it('adds each day net to a running total', () => {
    const line = advanceDeclineLine([
      { date: '2025-11-03', advances: 10, declines: 5 },
      { date: '2025-11-04', advances: 5, declines: 10, unchanged: 3 },
      { date: '2025-11-05', advances: 8, declines: 8 },
    ]);
    expect(line.map((p) => [p.net, p.line])).toEqual([[5, 5], [-5, 0], [0, 0]]);
  });

  it('starts from a given level and counts a bad number as zero', () => {
    const line = advanceDeclineLine([{ date: 'a', advances: Number.NaN, declines: 2 }, { date: 'b', advances: -4, declines: 1.9 }], { start: 100 });
    expect(line.map((p) => p.line)).toEqual([98, 97]);
    expect(advanceDeclineLine([])).toEqual([]);
  });
});

const series = (id: string, ...c: string[]) => ({ id, closes: c.map((close, i) => ({ date: `2025-11-0${i + 1}`, close })) });

describe('percentAboveMA', () => {
  const group = [series('A', '10', '12', '11'), series('B', '5', '4', '3'), series('C', '1', '2', '3')];

  it('counts closes above their own simple average over those that have one (worked by hand, period 2)', () => {
    // 2025-11-02: A 12*2=24 > 22 yes, B 8 > 9 no, C 4 > 3 yes -> 2 of 3. 2025-11-03: A 22 > 23 no, B 6 > 7 no, C 6 > 5 yes -> 1 of 3.
    expect(percentAboveMA(group, { period: 2 })).toEqual([
      { date: '2025-11-01', above: 0, eligible: 0, percent: null },
      { date: '2025-11-02', above: 2, eligible: 3, percent: '66.7' },
      { date: '2025-11-03', above: 1, eligible: 3, percent: '33.3' },
    ]);
    expect(percentAboveMA(group, { period: 2, decimals: 0 }).map((p) => p.percent)).toEqual([null, '67', '33']);
  });

  it('is not above when equal to the average (strictly above) and works on decimals exactly', () => {
    const flat = [series('F', '0.1', '0.2', '0.3')];
    // average of 0.2 and 0.3 is 0.25: 0.3 is above; average of 0.1 and 0.2 is 0.15: 0.2 is above.
    expect(percentAboveMA(flat, { period: 2 }).map((p) => p.percent)).toEqual([null, '100.0', '100.0']);
    expect(percentAboveMA([series('E', '5', '5', '5')], { period: 2 }).map((p) => p.percent)).toEqual([null, '0.0', '0.0']);
  });

  it('merges constituents that start on different dates and handles an empty group', () => {
    const late = { id: 'L', closes: [{ date: '2025-11-02', close: '9' }, { date: '2025-11-03', close: '10' }] };
    const out = percentAboveMA([series('A', '10', '12', '11'), late], { period: 2 });
    expect(out.map((p) => p.eligible)).toEqual([0, 1, 2]);
    expect(percentAboveMA([], { period: 2 })).toEqual([]);
  });

  it('rejects a bad period, decimals or close', () => {
    expect(() => percentAboveMA(group, { period: 0 })).toThrow(RangeError);
    expect(() => percentAboveMA(group, { period: 2, decimals: 9 })).toThrow(RangeError);
    expect(() => percentAboveMA([series('Z', 'x', '1')], { period: 2 })).toThrow(RangeError);
  });
});
