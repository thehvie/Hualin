/**
 * Timezone helpers. Every job time is stored as an absolute instant (UTC in
 * Postgres) and interpreted in the COMPANY's timezone (Company.timezone), never
 * the server's or the visitor's — so the schedule, the booking widget and the
 * emails all line up no matter where the server or the viewer is.
 *
 * Pure functions on Intl, so they work on the server and in client components.
 */

export const DEFAULT_TIMEZONE = "America/New_York";

export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Phoenix", label: "Mountain Time – no daylight saving (Arizona)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska Time (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (Honolulu)" },
] as const;

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function timezoneLabel(tz: string): string {
  return TIMEZONE_OPTIONS.find((o) => o.value === tz)?.label.replace(/ \(.*\)$/, "") ?? tz;
}

export interface WallParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
    });
    formatters.set(tz, f);
  }
  return f;
}

/** The wall-clock reading in `tz` for an instant. */
export function wallParts(date: Date, tz: string): WallParts {
  const p: Record<string, string> = {};
  for (const part of formatterFor(tz).formatToParts(date)) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" of the calendar date in `tz` at that instant. */
export function wallYmd(date: Date, tz: string): string {
  const p = wallParts(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Adds calendar days to a "YYYY-MM-DD" string (pure calendar math, no timezone). */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Day of week (0 = Sunday) of a "YYYY-MM-DD" calendar date. */
export function weekdayOfYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** True if the string is a real calendar date in "YYYY-MM-DD" form. */
export function isValidYmd(ymd: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return false;
  const t = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return t.getUTCFullYear() === Number(m[1]) && t.getUTCMonth() === Number(m[2]) - 1 && t.getUTCDate() === Number(m[3]);
}

function offsetMs(ts: number, tz: string): number {
  const p = wallParts(new Date(ts), tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/**
 * The instant at which the wall clock in `tz` reads `ymd hour:minute`. Handles
 * daylight-saving offsets; a time that doesn't exist (spring-forward gap) lands
 * just after the gap.
 */
export function zonedInstant(ymd: string, hour: number, minute: number, tz: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  const first = offsetMs(guess, tz);
  let t = guess - first;
  const second = offsetMs(t, tz);
  if (second !== first) t = guess - second;
  return new Date(t);
}

/** Start (00:00) of a calendar date in `tz`. */
export function startOfDayInTz(ymd: string, tz: string): Date {
  return zonedInstant(ymd, 0, 0, tz);
}

/** Calendar days a rental runs, counting both the start and end day (Mon to Wed = 3), minimum 1. */
export function rentalDays(start: Date, end: Date, tz: string): number {
  const a = wallParts(start, tz);
  const b = wallParts(end, tz);
  const diff = Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
  return Math.max(1, diff + 1);
}

export function formatInTz(date: Date, tz: string, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleString("en-US", { ...options, timeZone: tz });
}

/** Value for <input type="datetime-local"> showing the wall clock in `tz`. */
export function toDatetimeLocalInTz(date: Date, tz: string): string {
  const p = wallParts(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Inverse of toDatetimeLocalInTz: "YYYY-MM-DDTHH:mm" read in `tz` -> instant. Null if malformed. */
export function fromDatetimeLocalInTz(value: string, tz: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m || !isValidYmd(m[1])) return null;
  return zonedInstant(m[1], Number(m[2]), Number(m[3]), tz);
}
