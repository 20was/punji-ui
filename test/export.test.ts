import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { toCsv, neutralizeFormula, safeFilename, CSV_MIME, type CsvColumn } from '../src/export/export.ts';
import { downloadText } from '../src/download/downloadText.ts';

/** Minimal RFC 4180 reader used only to check the writer. */
function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(field); field = ''; }
    else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  row.push(field); rows.push(row);
  return rows;
}

type Row = { name: string; amount: number; note?: string | null };
const cols: CsvColumn<Row>[] = [
  { header: 'name', accessor: 'name' },
  { header: 'amount', accessor: 'amount' },
  { header: 'note', accessor: 'note' },
];

describe('toCsv', () => {
  it('writes CRLF rows with a header and quotes only where needed', () => {
    const rows: Row[] = [{ name: 'Nabil, Bank', amount: 12.5, note: 'say "hi"' }, { name: 'plain', amount: 0, note: null }];
    expect(toCsv(rows, cols)).toBe('name,amount,note\r\n"Nabil, Bank",12.5,"say ""hi"""\r\nplain,0,');
  });

  it('supports LF, BOM, no header, and other delimiters', () => {
    const rows: Row[] = [{ name: 'a;b', amount: 1 }];
    expect(toCsv(rows, cols, { crlf: false, header: false })).toBe('a;b,1,');
    expect(toCsv(rows, cols, { delimiter: ';', header: false })).toBe('"a;b";1;');
    expect(toCsv(rows, cols, { bom: true }).startsWith('﻿name,')).toBe(true);
    expect(toCsv([], cols)).toBe('name,amount,note');
  });

  it('keeps embedded newlines and unicode intact', () => {
    const rows: Row[] = [{ name: 'line1\nline2\r\nline3', amount: 1, note: 'रु १,२३४ 😀 é' }];
    const parsed = parseCsv(toCsv(rows, cols));
    expect(parsed[1]).toEqual(['line1\nline2\r\nline3', '1', 'रु १,२३४ 😀 é']);
  });

  it.each([
    ['=HYPERLINK("http://evil","click")'],
    ['+cmd|\' /C calc\'!A0'],
    ['-2+3+cmd|\' /C calc\'!A0'],
    ['@SUM(1+1)*cmd|\' /C calc\'!A0'],
    ['\t=1+1'],
    ['\r=1+1'],
    ['\n=1+1'],
    ['＝HYPERLINK("http://evil","click")'],
    ['＋1+1'],
    ['－1+1'],
    ['＠SUM(1+1)'],
  ])('neutralises the payload %j', (payload) => {
    const parsed = parseCsv(toCsv([{ name: payload, amount: 1 }], cols));
    expect(parsed[1]![0]).toBe(`'${payload}`);
    expect(parsed[1]![0]![0]).toBe("'");
  });

  it('neutralises headers and formatted output too, but not mid-string triggers', () => {
    const csv = toCsv([{ v: '=1' }], [{ header: '=bad', accessor: 'v', format: (x) => `+${String(x)}` }, { header: 'ok', accessor: () => 'a=b+c' }]);
    expect(parseCsv(csv)).toEqual([["'=bad", 'ok'], ["'+=1", 'a=b+c']]);
  });

  it('keeps typed negative numbers numeric but prefixes numeric-looking strings', () => {
    const rows = [{ name: 'n', amount: -1234.5 }, { name: '-1234.5', amount: -1e-7 }];
    const parsed = parseCsv(toCsv(rows, cols));
    expect(parsed[1]).toEqual(['n', '-1234.5', '']);
    expect(parsed[2]).toEqual(["'-1234.5", '-1e-7', '']);
  });

  it('keepNumericText leaves only strict plain numbers alone', () => {
    const csv = toCsv([{ v: '-12.50' }, { v: '-12.50+cmd' }, { v: '-1,234' }, { v: '=1' }], [{ header: 'v', accessor: 'v', keepNumericText: true }], { header: false });
    expect(parseCsv(csv)).toEqual([['-12.50'], ["'-12.50+cmd"], ["'-1,234"], ["'=1"]]);
  });

  it('can switch neutralisation off for trusted data', () => {
    expect(toCsv([{ name: '=1', amount: 1 }], cols, { neutralizeFormulas: false, header: false })).toBe('=1,1,');
  });

  it('maps non-finite numbers to empty and booleans to words', () => {
    const csv = toCsv([{ a: NaN, b: Infinity, c: true, d: false }], [{ header: 'a', accessor: 'a' }, { header: 'b', accessor: 'b' }, { header: 'c', accessor: 'c' }, { header: 'd', accessor: 'd' }], { header: false });
    expect(csv).toBe(',,true,false');
  });

  it('requires explicit formatters for Date and bigint without leaking values', () => {
    const when = new Date(Date.UTC(2026, 0, 2));
    expect(() => toCsv([{ when }], [{ header: 'when', accessor: 'when' }])).toThrow(/"when".*Date/);
    expect(() => toCsv([{ big: 123456789012345678901234567890n }], [{ header: 'big', accessor: 'big' }])).toThrow(/"big".*bigint/);
    expect(() => toCsv([{ big: 123456789012345678901234567890n }], [{ header: 'big', accessor: 'big' }])).not.toThrow(/1234567890/);
    const csv = toCsv([{ when, big: 12345678901234567890n }], [
      { header: 'when', accessor: 'when', format: (v) => (v as Date).toISOString().slice(0, 10) },
      { header: 'big', accessor: 'big', format: (v) => (v as bigint).toString() },
    ]);
    expect(csv).toBe('when,big\r\n2026-01-02,12345678901234567890');
  });

  it('round-trips neutralised cell text for arbitrary strings (property)', () => {
    const cell = fc.string({ unit: fc.constantFrom(...'ab ,;"\r\n=+-@\té€र😀'.split('')) });
    fc.assert(fc.property(fc.array(fc.tuple(cell, cell, fc.integer()), { maxLength: 8 }), fc.boolean(), fc.boolean(), (rows, crlf, bom) => {
      const csv = toCsv(rows, [
        { header: 'a', accessor: (r) => r[0] }, { header: 'b', accessor: (r) => r[1] }, { header: 'n', accessor: (r) => r[2] },
      ], { crlf, bom });
      const parsed = parseCsv(bom ? csv.slice(1) : csv);
      expect(parsed[0]).toEqual(['a', 'b', 'n']);
      expect(parsed.slice(1)).toEqual(rows.map(([a, b, n]) => [neutralizeFormula(a), neutralizeFormula(b), String(n)]));
      for (const out of parsed.slice(1)) for (const text of out.slice(0, 2)) expect(/^[=+\-@\t\r]/.test(text)).toBe(false);
    }));
  });
});

describe('safeFilename', () => {
  it.each([
    ['../../etc/passwd', '_.._etc_passwd'],
    ['a:b*c?.csv', 'a_b_c_.csv'],
    ['  .hidden. ', 'hidden'],
    ['', 'download'],
    ['CON.csv', '_CON.csv'],
    ['line\nbreak\u0000.csv', 'line_break_.csv'],
  ])('%j', (input, expected) => expect(safeFilename(input)).toBe(expected));
  it('removes bidirectional and zero-width controls that could disguise the extension', () => {
    expect(safeFilename('invoice‮fdp.exe')).toBe('invoice_fdp.exe');
    expect(safeFilename('a⁦b⁩c​d؜e﻿.csv')).toBe('a_b_c_d_e_.csv');
    expect(Array.from(safeFilename('‪d‫‬‭‎‏⁧⁨'), (ch) => ch.codePointAt(0)!).every((c) => c < 0x200b || c > 0x2069)).toBe(true);
  });
  it('trims long runs of dots and spaces in linear time', () => {
    const start = performance.now();
    expect(safeFilename(`a${' '.repeat(200_000)}b`)).toBe('a');
    expect(safeFilename(`${'. '.repeat(100_000)}x`)).toBe('x');
    expect(performance.now() - start).toBeLessThan(1000);
  });
  it('never splits a surrogate pair at the length limit', () => {
    const out = safeFilename('😀'.repeat(100));
    expect(out.length).toBe(150);
    expect(out).toBe('😀'.repeat(75));
  });
  it('limits length and has no separators (property)', () => {
    fc.assert(fc.property(fc.string({ maxLength: 400 }), (s) => {
      const out = safeFilename(s);
      expect(out.length).toBeGreaterThan(0);
      expect(out.length).toBeLessThanOrEqual(151);
      expect(Array.from(out).some((ch) => ch.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(ch))).toBe(false);
      expect(out.startsWith('.')).toBe(false);
    }));
  });
});

describe('downloadText', () => {
  afterEach(() => vi.useRealTimers());
  it('downloads under a sanitised name, cleans up and revokes the URL', () => {
    vi.useFakeTimers();
    const create = vi.fn<(blob: Blob) => string>(() => 'blob:mock');
    const revoke = vi.fn<(url: string) => void>();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    let seen: { download: string; href: string; attached: boolean } | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      seen = { download: this.download, href: this.href, attached: this.isConnected };
    });
    downloadText('../report: Q1.csv', 'a,b', CSV_MIME);
    expect(create).toHaveBeenCalledTimes(1);
    const blob = create.mock.calls[0]![0];
    expect(blob.type).toBe(CSV_MIME);
    expect(seen).toEqual({ download: '_report_ Q1.csv', href: 'blob:mock', attached: true });
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:mock');
  });
});
