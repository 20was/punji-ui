/**
 * Property-based tests (fast-check): rules that must hold for every input,
 * not only the examples in the component tests. Generated inputs cover what a
 * hand-written list misses (one option, long lists, any starting point, any
 * key), and fast-check shrinks a failure to its smallest case.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { formatFigure, parseNumber, SegmentedControl, segmentTarget, Tabs, toneOf } from '../src/index.ts';

afterEach(cleanup);

/** 1 to 12 distinct option values, and one of them as the current value. */
const listAndCurrent = fc
  .uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), { minLength: 1, maxLength: 12 })
  .chain((values) => fc.record({ values: fc.constant(values), current: fc.constantFrom(...values) }));

const MOVE_KEYS = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'] as const;

describe('segmentTarget, for any list', () => {
  it('always lands on one of the options for a navigation key', () => {
    fc.assert(
      fc.property(listAndCurrent, fc.constantFrom(...MOVE_KEYS), ({ values, current }, key) => {
        expect(values).toContain(segmentTarget(values, current, key));
      }),
    );
  });

  it('a step forward then back returns to where it started', () => {
    fc.assert(
      fc.property(listAndCurrent, ({ values, current }) => {
        const next = segmentTarget(values, current, 'ArrowRight')!;
        expect(segmentTarget(values, next, 'ArrowLeft')).toBe(current);
        const down = segmentTarget(values, current, 'ArrowDown')!;
        expect(segmentTarget(values, down, 'ArrowUp')).toBe(current);
      }),
    );
  });

  it('n steps forward go all the way round, visiting every option once', () => {
    fc.assert(
      fc.property(listAndCurrent, ({ values, current }) => {
        const seen = new Set<string>();
        let at = current;
        for (let i = 0; i < values.length; i++) {
          at = segmentTarget(values, at, 'ArrowRight')!;
          seen.add(at);
        }
        expect(at).toBe(current);
        expect(seen.size).toBe(values.length);
      }),
    );
  });

  it('Home and End are the first and last option from anywhere', () => {
    fc.assert(
      fc.property(listAndCurrent, ({ values, current }) => {
        expect(segmentTarget(values, current, 'Home')).toBe(values[0]);
        expect(segmentTarget(values, current, 'End')).toBe(values[values.length - 1]);
      }),
    );
  });

  it('any other key moves nowhere', () => {
    fc.assert(
      fc.property(
        listAndCurrent,
        fc.string().filter((k) => !(MOVE_KEYS as readonly string[]).includes(k)),
        ({ values, current }, key) => {
          expect(segmentTarget(values, current, key)).toBeNull();
        },
      ),
    );
  });
});

describe('SegmentedControl, for any options and key presses', () => {
  it('exactly one segment is pressed, and it is the value the keys led to', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^[a-z]{1,4}$/), { minLength: 2, maxLength: 6 }),
        fc.array(fc.constantFrom(...MOVE_KEYS), { maxLength: 8 }),
        (values, keys) => {
          function Harness() {
            const [v, setV] = useState(values[0]!);
            return <SegmentedControl options={values.map((value) => ({ value, label: value.toUpperCase() }))} value={v} onChange={setV} prefix="p" label="Choice" />;
          }
          const { unmount } = render(<Harness />);
          let expected = values[0]!;
          for (const key of keys) {
            fireEvent.keyDown(screen.getByRole('button', { pressed: true }), { key });
            expected = segmentTarget(values, expected, key) ?? expected;
          }
          const pressed = screen.getAllByRole('button', { pressed: true });
          expect(pressed).toHaveLength(1);
          expect(pressed[0]!.textContent).toBe(expected.toUpperCase());
          unmount();
        },
      ),
      { numRuns: 40 },
    );
  });
});

describe('Tabs, for any options and key presses', () => {
  it('exactly one tab is selected and holds the only tab stop', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^[a-z]{1,4}$/), { minLength: 1, maxLength: 6 }),
        fc.array(fc.constantFrom('ArrowRight', 'ArrowLeft', 'Home', 'End', 'ArrowUp'), { maxLength: 8 }),
        (values, keys) => {
          function Harness() {
            const [v, setV] = useState(values[0]!);
            return <Tabs options={values.map((value) => ({ value, label: value }))} value={v} onChange={setV} prefix="t" label="T" panelId="p" />;
          }
          const { unmount } = render(<Harness />);
          let expected = values[0]!;
          for (const key of keys) {
            fireEvent.keyDown(screen.getByRole('tab', { selected: true }), { key });
            if (key !== 'ArrowUp') expected = segmentTarget(values, expected, key) ?? expected;
          }
          const selected = screen.getAllByRole('tab', { selected: true });
          expect(selected).toHaveLength(1);
          expect(selected[0]!.textContent).toBe(expected);
          expect(screen.getAllByRole('tab').filter((t) => t.getAttribute('tabindex') === '0')).toEqual(selected);
          unmount();
        },
      ),
      { numRuns: 40 },
    );
  });
});

/** Numbers a figure may hold: integers and decimals, small and large, both signs. */
const amount = fc.oneof(fc.integer({ min: -1e12, max: 1e12 }), fc.double({ min: -1e9, max: 1e9, noNaN: true, noDefaultInfinity: true }));

describe('figures, for any number', () => {
  it('parseNumber reads back what formatFigure prints, to the printed precision', () => {
    fc.assert(
      fc.property(amount, fc.integer({ min: 0, max: 4 }), (n, dp) => {
        const printed = formatFigure(n, 'num', dp);
        expect(parseNumber(printed)).toBeCloseTo(Number(n.toFixed(dp)), dp);
      }),
    );
  });

  it('parseNumber treats Devanagari digits exactly as Latin ones', () => {
    const DEV = '०१२३४५६७८९';
    fc.assert(
      fc.property(fc.stringMatching(/^-?\d{1,9}(\.\d{1,4})?$/), (s) => {
        const dev = s.replace(/\d/g, (d) => DEV[Number(d)]!);
        expect(parseNumber(dev)).toBe(parseNumber(s));
      }),
    );
  });

  it('the tone agrees with the sign of the printed value, and a dash is never a number', () => {
    fc.assert(
      fc.property(amount, fc.integer({ min: 0, max: 4 }), (n, dp) => {
        const tone = toneOf(n, dp);
        const shown = Number(n.toFixed(dp));
        expect(tone).toBe(shown > 0 ? 'up' : shown < 0 ? 'down' : 'flat');
      }),
    );
    fc.assert(
      fc.property(fc.constantFrom(null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY), fc.constantFrom('rs', 'int', 'pct', 'num'), (v, kind) => {
        expect(formatFigure(v, kind as 'rs' | 'int' | 'pct' | 'num')).toBe('-');
      }),
    );
  });
});

describe('parseNumber, against the pattern it replaced', () => {
  // The source's pattern, kept here to prove the rewrite accepts exactly the same strings.
  const OLD = /^-?\d*\.?\d+$|^-?\d+\.?$/;
  it('accepts and rejects the same strings', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[-0-9.]{0,8}$/), (s) => {
        expect(Number.isNaN(parseNumber(s))).toBe(!OLD.test(s));
      }),
      { numRuns: 2000 },
    );
  });
});
