import { AttendanceEntry } from '../services/attendance';

export interface MonthlyHoursRow {
  key: string;
  label: string;
  year: number;
  month: number;
  hours: number;
}

export function calculateEntryHours(entry: AttendanceEntry): number {
  if (!entry.clockOutAt) return 0;
  const ms = entry.clockOutAt.getTime() - entry.clockInAt.getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

export function getMonthlyHoursForEntries(
  entries: AttendanceEntry[],
  month: number,
  year: number
): number {
  return entries.reduce((sum, entry) => {
    if (!entry.clockOutAt) return sum;
    if (entry.clockInAt.getMonth() !== month || entry.clockInAt.getFullYear() !== year) {
      return sum;
    }
    return sum + calculateEntryHours(entry);
  }, 0);
}

export function getMonthlyBreakdown(entries: AttendanceEntry[]): MonthlyHoursRow[] {
  const totals = new Map<string, MonthlyHoursRow>();

  entries.forEach((entry) => {
    if (!entry.clockOutAt) return;
    const year = entry.clockInAt.getFullYear();
    const month = entry.clockInAt.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const existing = totals.get(key) || {
      key,
      label: entry.clockInAt.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
      year,
      month,
      hours: 0,
    };
    existing.hours += calculateEntryHours(entry);
    totals.set(key, existing);
  });

  return Array.from(totals.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function calculateSalary(hours: number, hourlySalary: number): number {
  return Math.round(hours * hourlySalary * 100) / 100;
}
