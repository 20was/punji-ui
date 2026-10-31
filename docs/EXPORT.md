# Data export

```ts
import { toCsv, CSV_MIME } from '@punji/ui/export';
import { downloadText } from '@punji/ui/download';

const csv = toCsv(holdings, [
  { header: 'Symbol', accessor: 'symbol' },
  { header: 'Units', accessor: 'units' },                       // number: written as-is
  { header: 'Price', accessor: 'price', format: v => (v as bigint).toString() }, // bigint needs a formatter
  { header: 'Bought', accessor: 'bought', format: v => (v as Date).toISOString().slice(0, 10) },
], { bom: true });                                             // BOM for Excel
downloadText('holdings.csv', csv, CSV_MIME);                   // in a click handler
```

`@punji/ui/export` is pure: no React, DOM, locale or dependencies (enforced by
`scripts/check-boundaries.mjs`). `@punji/ui/download` is browser-only and separate so
server code never imports it.

## `toCsv(rows, columns, options)`

- RFC 4180: fields containing the delimiter, `"`, CR or LF are quoted, `"` is doubled.
  Line breaks are CRLF by default (`crlf: false` for LF). No trailing line break.
- Options: `delimiter` (`,` `;` or tab), `bom` (prefix U+FEFF so Excel reads UTF-8),
  `header` (default true), `neutralizeFormulas` (default true).
- Cell values: `string`, finite `number`, `boolean`, `null`/`undefined` (empty) work
  directly. `NaN` and infinities export as empty. `Date`, `bigint` and objects **throw**
  unless the column has `format(value, row)`; there is no implicit locale or time zone.
  The error names the column header, never the value.
- Excel export is CSV with a BOM. There is no xlsx or PDF writer and no dependency for
  one; PDF is out of scope for now.

## Formula-injection neutralisation

A spreadsheet treats a cell starting with `=`, `+`, `-`, `@`, tab or CR as a formula
(`=HYPERLINK(...)`, `+cmd|' /C calc'!A0`, `@SUM(...)`). By default every **text** cell
and header that starts with one of those characters gets a leading apostrophe
(`'=1+1`), following OWASP's CSV-injection guidance. The apostrophe is visible when the
file is opened in Excel; that is the price of safety.

**Negative numbers.** A cell of JavaScript type `number` is exempt, because a finite
number prints only digits, `-`, `.`, `e` and `+` and cannot contain a formula, so `-5`
stays numeric and summable. The trade-off is that the type decides: the string `"-5"`
is prefixed and becomes text. If a `format` emits plain machine numbers such as
`-1234.50`, set `keepNumericText: true` on that column; only strict
`[+-]digits[.digits][e[+-]digits]` text is then left alone (`-5+cmd` is still prefixed).
Do not set it for grouped or currency text such as `-1,234.50` or `-Rs 5`.

Unicode look-alikes of these characters are not formulas in spreadsheets and are not
altered. Leading spaces are not stripped or prefixed.

## Security boundary

Client-side neutralisation reduces the risk of a spreadsheet running data you export. It
does **not** replace server-side validation or encoding: validate and constrain what is
stored, authorise what a user may export, and neutralise on the server for any CSV the
server generates or emails. Exports contain whatever the caller passes; mask or omit
sensitive columns before calling `toCsv`. `downloadText` creates an object URL, clicks
a hidden link, removes it and revokes the URL after one second; nothing leaves the
browser. File names are passed through `safeFilename` (no path parts, reserved or
control characters, at most 150 characters, never empty). `neutralizeFormulas: false`
is for trusted, machine-generated data only.
