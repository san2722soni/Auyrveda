export const CLINIC_TIMEZONE = "Asia/Kolkata";
const OFFSET = 330 * 60_000;
export function toDateKey(date: Date): string {
  return new Date(date.getTime() + OFFSET).toISOString().slice(0, 10);
}
export function parseClinicDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+05:30`);
  return Number.isFinite(date.getTime()) && toDateKey(date) === value ? date : null;
}
export function startOfDay(date: Date): Date { return parseClinicDate(toDateKey(date))!; }
export function addDays(date: Date, days: number): Date { return new Date(date.getTime() + days * 86_400_000); }
export function startOfMonth(date: Date): Date { return parseClinicDate(`${toDateKey(date).slice(0, 7)}-01`)!; }
