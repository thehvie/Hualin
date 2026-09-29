/**
 * Simple fixed business-hours booking-slot model. Not yet configurable per
 * company (everyone gets the same hours) — a reasonable v1 given there's no
 * per-crew capacity/routing concept yet. One Job per slot, i.e. one crew.
 *
 * Times are the business's local wall-clock time, which is the SERVER's
 * timezone (pinned with the TZ env var in ecosystem.config.js) — the schedule,
 * jobs list and dashboard all read job times the same way. One timezone per
 * deployment for now.
 */

export const BUSINESS_HOURS = {
  startHour: 9,
  endHour: 17,
  slotDurationHours: 1,
  closedWeekdays: [0], // Sunday
};

export const MAX_JOBS_PER_SLOT = 1;

/** Don't offer a slot that starts sooner than this from now. */
export const MIN_NOTICE_MINUTES = 60;

/** How far ahead customers can book. */
export const MAX_ADVANCE_DAYS = 90;

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

/** "YYYY-MM-DD" -> local midnight of that calendar date, or null if malformed. */
export function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Reject rollovers like 2026-02-31.
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d;
}

export function isDayOpen(date: Date): boolean {
  return !BUSINESS_HOURS.closedWeekdays.includes(date.getDay());
}

export function slotDateTime(dateOnly: Date, hour: number): Date {
  const d = new Date(dateOnly);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Whether a calendar date is inside the bookable window (today .. MAX_ADVANCE_DAYS). */
export function isWithinBookingWindow(date: Date, now = new Date()): boolean {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const last = new Date(today);
  last.setDate(last.getDate() + MAX_ADVANCE_DAYS);
  return date >= today && date <= last;
}

/**
 * The slot start times for a given calendar date (local wall-clock hours),
 * minus closed days and slots that are already too soon or in the past.
 */
export function slotsForDate(date: Date, now = new Date()): { hour: number; label: string }[] {
  if (!isDayOpen(date) || !isWithinBookingWindow(date, now)) return [];

  const earliest = now.getTime() + MIN_NOTICE_MINUTES * 60_000;
  const slots: { hour: number; label: string }[] = [];
  for (let h = BUSINESS_HOURS.startHour; h < BUSINESS_HOURS.endHour; h += BUSINESS_HOURS.slotDurationHours) {
    if (slotDateTime(date, h).getTime() < earliest) continue;
    slots.push({ hour: h, label: `${formatHour(h)} - ${formatHour(h + BUSINESS_HOURS.slotDurationHours)}` });
  }
  return slots;
}
