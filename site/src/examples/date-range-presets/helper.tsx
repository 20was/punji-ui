import { nepalDateRangePresets } from '@punji/ui/date-range-presets/nepal';
import { formatBSDate, gregorianToBS, parseCalendarDate } from '@punji/ui/nepal';

const TODAY = '2026-11-01';

function bs(iso: string): string {
  const date = parseCalendarDate(iso);
  return date ? formatBSDate(gregorianToBS(date)) : iso;
}

// The same helper without any component: exact civil dates you can send to an API or use in a filter.
export default function Example() {
  const rows = nepalDateRangePresets({ today: TODAY, ids: ['today', 'this-week', 'this-month', 'last-month', 'last-30-days', 'fiscal-year-to-date', 'last-fiscal-year'] });
  return (
    <div className="ex-stack">
      <p className="doc-muted">Today is <code>{TODAY}</code> ({bs(TODAY)}).</p>
      <div className="doc-table-wrap"><table className="doc-table">
        <thead>
          <tr><th scope="col">Preset</th><th scope="col">Start</th><th scope="col">End</th><th scope="col">Starts on (BS)</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.label}</th>
              <td><code>{row.range.start}</code></td>
              <td><code>{row.range.end}</code></td>
              <td>{bs(row.range.start)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}
