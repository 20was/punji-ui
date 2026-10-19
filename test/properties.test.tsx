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

import { SegmentedControl } from '../src/index.ts';
import { segmentTarget } from '../src/internal/segment-target.ts';

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
