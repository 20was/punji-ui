/** "2 minutes ago" from a millisecond age, through Intl (so it follows the locale). Pure. */
export function formatAge(ageMs: number, locale = 'en'): string {
  const seconds = Math.max(0, Math.round(ageMs / 1000));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  if (seconds < 60) return rtf.format(0, 'second');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.floor(hours / 24), 'day');
}

/** A Date or ISO string to epoch ms; NaN when it does not parse. */
export function toTime(value: Date | string | number): number {
  return value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
}
