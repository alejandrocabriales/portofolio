/**
 * Formatting helpers shared by the index and (later) the blog.
 *
 * Everything is UTC-anchored. Parsing `'2021-12'` with `new Date()` directly
 * would be interpreted as UTC midnight and then rendered in the *viewer's* zone,
 * which shifts the month backwards for anyone west of Greenwich.
 */

const MONTH_YEAR = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `'2021-12'` → `'Dec 2021'` */
export function formatMonth(iso: string): string {
  const [year, month] = iso.split('-');
  return MONTH_YEAR.format(Date.UTC(Number(year), Number(month ?? '1') - 1, 1));
}

/** `('2021-12', null)` → `'Dec 2021 — Present'` */
export function formatRange(start: string, end: string | null): string {
  return `${formatMonth(start)} — ${end ? formatMonth(end) : 'Present'}`;
}

const FULL_DATE = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `Date(2026-03-04)` → `'4 March 2026'`. UTC-anchored so the day never shifts. */
export function formatDate(date: Date): string {
  return FULL_DATE.format(date);
}
