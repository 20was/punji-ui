import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { compactRs, cr, Delta, Figure, formatFigure, PunjiLocaleProvider, readerLang, readerLangOf, rs, rsMark, setReaderLang, unitWords } from '../src/index.ts';
import { ne } from '../src/locale/ne.ts';

afterEach(() => setReaderLang('en'));

describe('reader-language rupee mark', () => {
  it('English output is unchanged by default', () => {
    expect(rsMark()).toBe('Rs');
    expect(rs(842610)).toBe('Rs 8,42,610.00');
    expect(cr(4.2)).toBe('Rs 4.20 crore');
    expect(formatFigure(842610, 'rs')).toBe('Rs 8,42,610.00');
    expect(compactRs(12_400_000, unitWords()).short).toBe('Rs 1.24 Cr');
    expect(rs(null)).toBe('-');
    expect(cr(undefined)).toBe('-');
  });

  it('Nepali prints the Nepali mark and words, with Western digits', () => {
    expect(rsMark('ne')).toBe('रु.');
    expect(rs(842610, 'ne')).toBe('रु. 8,42,610.00');
    expect(cr(4.2, 'ne')).toBe('रु. 4.20 करोड');
    expect(formatFigure(842610, 'rs', 2, rsMark('ne'))).toBe('रु. 8,42,610.00');
    expect(compactRs(12_400_000, unitWords('ne'), 1e7, rsMark('ne')).short).toBe('रु. 1.24 करोड');
    expect(compactRs(-3_000_000_000, unitWords('ne'), 1e7, rsMark('ne')).short).toBe('−रु. 3.00 अर्ब');
    expect(readerLangOf('ne-NP')).toBe('ne');
    expect(readerLangOf('hi')).toBe('en');
  });

  it('setReaderLang is the documented shim for code outside React', () => {
    setReaderLang('ne');
    expect(readerLang()).toBe('ne');
    expect(rs(100)).toBe('रु. 100.00');
    expect(rs(100, 'en')).toBe('Rs 100.00');
    setReaderLang('en');
    expect(rs(100)).toBe('Rs 100.00');
  });

  it('Figure and Delta follow the provider locale, and a mark prop wins', () => {
    const { rerender } = render(<Figure value={1500} kind="rs" testId="f" />);
    expect(screen.getByTestId('f').textContent).toBe('Rs 1,500.00');
    rerender(
      <PunjiLocaleProvider locale={ne}>
        <Figure value={1500} kind="rs" testId="f" />
        <Delta value={-250} kind="rs" testId="d" />
      </PunjiLocaleProvider>,
    );
    expect(screen.getByTestId('f').textContent).toBe('रु. 1,500.00');
    expect(screen.getByTestId('d').textContent).toContain('रु. 250.00');
    rerender(
      <PunjiLocaleProvider locale={ne}>
        <Figure value={1500} kind="rs" mark="NPR" testId="f" />
      </PunjiLocaleProvider>,
    );
    expect(screen.getByTestId('f').textContent).toBe('NPR 1,500.00');
  });
});
