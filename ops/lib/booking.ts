/**
 * Simple fixed business-hours booking-slot model. Not yet configurable per
 * company beyond the timezone (everyone gets the same hours) — a reasonable v1
 * given there's no per-crew capacity/routing concept yet. One Job per slot,
 * i.e. one crew.
 *
 * Slots are wall-clock hours in the COMPANY's timezone (Company.timezone), and
 * a date is a plain "YYYY-MM-DD" calendar date in that same timezone, so the
 * result never depends on the server's or the visitor's timezone.
 */

import { addDaysYmd, weekdayOfYmd, wallYmd, zonedInstant } from "@/lib/tz";

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

export function isDayOpen(ymd: string): boolean {
  return !BUSINESS_HOURS.closedWeekdays.includes(weekdayOfYmd(ymd));
}

/** The instant a slot starts, for a calendar date + hour in the company's timezone. */
export function slotInstant(ymd: string, hour: number, timezone: string): Date {
  return zonedInstant(ymd, hour, 0, timezone);
}

/** Whether a calendar date is inside the bookable window (today .. MAX_ADVANCE_DAYS), in the company's timezone. */
export function isWithinBookingWindow(ymd: string, timezone: string, now = new Date()): boolean {
  const today = wallYmd(now, timezone);
  return ymd >= today && ymd <= addDaysYmd(today, MAX_ADVANCE_DAYS);
}

/**
 * The slot start times for a calendar date, minus closed days, dates outside
 * the window, and slots that are already past or too soon.
 */
export function slotsForDate(ymd: string, timezone: string, now = new Date()): { hour: number; label: string }[] {
  if (!isDayOpen(ymd) || !isWithinBookingWindow(ymd, timezone, now)) return [];

  const earliest = now.getTime() + MIN_NOTICE_MINUTES * 60_000;
  const slots: { hour: number; label: string }[] = [];
  for (let h = BUSINESS_HOURS.startHour; h < BUSINESS_HOURS.endHour; h += BUSINESS_HOURS.slotDurationHours) {
    if (slotInstant(ymd, h, timezone).getTime() < earliest) continue;
    slots.push({ hour: h, label: `${formatHour(h)} - ${formatHour(h + BUSINESS_HOURS.slotDurationHours)}` });
  }
  return slots;
}
