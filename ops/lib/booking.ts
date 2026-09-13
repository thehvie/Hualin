/**
 * Simple fixed business-hours booking-slot model. Not yet configurable per
 * company (everyone gets the same hours) — a reasonable v1 given there's no
 * per-crew capacity/routing concept yet. One Job per slot, i.e. one crew.
 */

export const BUSINESS_HOURS = {
  startHour: 9,
  endHour: 17,
  slotDurationHours: 1,
  closedWeekdays: [0], // Sunday
};

export const MAX_JOBS_PER_SLOT = 1;

export interface BookingSlot {
  /** ISO string, business-local wall-clock time with no timezone conversion. */
  startIso: string;
  label: string;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

export function isDayOpen(date: Date): boolean {
  return !BUSINESS_HOURS.closedWeekdays.includes(date.getDay());
}

/** Generates the slot start times for a given calendar date (local wall-clock hours). */
export function slotsForDate(date: Date): { hour: number; label: string }[] {
  if (!isDayOpen(date)) return [];

  const slots: { hour: number; label: string }[] = [];
  for (let h = BUSINESS_HOURS.startHour; h < BUSINESS_HOURS.endHour; h += BUSINESS_HOURS.slotDurationHours) {
    slots.push({ hour: h, label: `${formatHour(h)} - ${formatHour(h + BUSINESS_HOURS.slotDurationHours)}` });
  }
  return slots;
}

export function slotDateTime(dateOnly: Date, hour: number): Date {
  const d = new Date(dateOnly);
  d.setHours(hour, 0, 0, 0);
  return d;
}
