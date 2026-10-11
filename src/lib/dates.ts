/** Local-time YYYY-MM-DD. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, days: number): string {
  const d = fromISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** 0 = Monday … 6 = Sunday, matching the weekly plan. */
export function planDayIndex(s: string): number {
  return (fromISODate(s).getDay() + 6) % 7;
}

/** Monday of the week containing the date. */
export function weekStart(s: string): string {
  return addDays(s, -planDayIndex(s));
}

export function prettyDate(s: string, today = toISODate(new Date())): string {
  if (s === today) return 'Today';
  if (s === addDays(today, -1)) return 'Yesterday';
  if (s === addDays(today, 1)) return 'Tomorrow';
  return fromISODate(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
