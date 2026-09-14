// Date helpers. Sessions are calendar days, so we work with local dates and
// 'YYYY-MM-DD' strings throughout to avoid time-zone off-by-one bugs.

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Format a Date as a local 'YYYY-MM-DD' string. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a 'YYYY-MM-DD' string into a local Date (midnight). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** First day of the given month. */
export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

/** Number of days in the given month (month is 0-indexed). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Build the 6-week grid (42 cells) covering the month, padded with the
 * surrounding days so the calendar always renders as full weeks.
 */
export function buildMonthGrid(year: number, month: number): Date[] {
  const first = startOfMonth(year, month);
  const startWeekday = first.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

/**
 * All dates in the given month that fall on the same weekday as `from`,
 * starting at `from` through the end of the month. Used for weekly recurrence.
 */
export function sameWeekdayThroughMonth(from: Date): Date[] {
  const year = from.getFullYear();
  const month = from.getMonth();
  const total = daysInMonth(year, month);
  const dates: Date[] = [];
  for (let day = from.getDate(); day <= total; day += 7) {
    dates.push(new Date(year, month, day));
  }
  return dates;
}

/** The first date in the given month that falls on `weekday` (0 = Sunday). */
export function firstWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const first = startOfMonth(year, month);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset);
}

/**
 * Every date in the given month on `weekday`, from the first occurrence
 * through the end of the month. Used when re-applying a recurring series to
 * a different month (e.g. "duplicate to next month").
 */
export function allWeekdaysInMonth(year: number, month: number, weekday: number): Date[] {
  return sameWeekdayThroughMonth(firstWeekdayOfMonth(year, month, weekday));
}

/** Format 'HH:MM[:SS]' into a friendly label like '4:00 PM'. */
export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Day-of-month number for a date key, e.g. '2026-09-13' -> 13. */
export function dayOfMonth(key: string): number {
  return Number(key.split("-")[2]);
}
