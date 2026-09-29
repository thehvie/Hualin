import type { ServicePlanBillingFrequency, ServicePlanDurationUnit } from "@prisma/client";

const DAYS_PER_YEAR = 365.25;
const DAYS_PER_MONTH = DAYS_PER_YEAR / 12;

function durationDays(durationValue: number, durationUnit: ServicePlanDurationUnit): number {
  switch (durationUnit) {
    case "DAY":
      return durationValue;
    case "WEEK":
      return durationValue * 7;
    case "MONTH":
      return durationValue * DAYS_PER_MONTH;
    case "YEAR":
      return durationValue * DAYS_PER_YEAR;
  }
}

function frequencyDays(frequency: ServicePlanBillingFrequency): number {
  switch (frequency) {
    case "DAILY":
      return 1;
    case "WEEKLY":
      return 7;
    case "MONTHLY":
      return DAYS_PER_MONTH;
    case "QUARTERLY":
      return DAYS_PER_MONTH * 3;
    case "ANNUALLY":
      return DAYS_PER_YEAR;
  }
}

// How many billing cycles of a given frequency fit across the plan's full
// duration — used to evenly split the total contract price into per-cycle
// installments (e.g. a $1800, 2-year plan billed monthly = $75/mo, a $140,
// 2-week rental billed daily = $10/day). Always at least one cycle.
export function cyclesForFrequency(
  durationValue: number,
  durationUnit: ServicePlanDurationUnit,
  frequency: ServicePlanBillingFrequency,
): number {
  return Math.max(1, Math.round(durationDays(durationValue, durationUnit) / frequencyDays(frequency)));
}

export function amountCentsForFrequency(
  priceCents: number,
  durationValue: number,
  durationUnit: ServicePlanDurationUnit,
  frequency: ServicePlanBillingFrequency,
): number {
  const cycles = cyclesForFrequency(durationValue, durationUnit, frequency);
  return Math.round(priceCents / cycles);
}

type StripeInterval = "day" | "week" | "month" | "year";

export function stripeRecurringInterval(
  frequency: ServicePlanBillingFrequency,
): { interval: StripeInterval; interval_count: number } {
  switch (frequency) {
    case "DAILY":
      return { interval: "day", interval_count: 1 };
    case "WEEKLY":
      return { interval: "week", interval_count: 1 };
    case "MONTHLY":
      return { interval: "month", interval_count: 1 };
    case "QUARTERLY":
      return { interval: "month", interval_count: 3 };
    case "ANNUALLY":
      return { interval: "year", interval_count: 1 };
  }
}

function addInterval(date: Date, interval: StripeInterval, count: number): Date {
  const next = new Date(date);
  switch (interval) {
    case "day":
      next.setDate(next.getDate() + count);
      break;
    case "week":
      next.setDate(next.getDate() + count * 7);
      break;
    case "month":
      next.setMonth(next.getMonth() + count);
      break;
    case "year":
      next.setFullYear(next.getFullYear() + count);
      break;
  }
  return next;
}

export function endDateFrom(startDate: Date, durationValue: number, durationUnit: ServicePlanDurationUnit): Date {
  return addInterval(startDate, durationUnit.toLowerCase() as StripeInterval, durationValue);
}

export function nextVisitDateFrom(startDate: Date, frequency: ServicePlanBillingFrequency): Date {
  const { interval, interval_count } = stripeRecurringInterval(frequency);
  return addInterval(startDate, interval, interval_count);
}

export const DURATION_UNIT_LABELS: Record<string, { one: string; many: string }> = {
  DAY: { one: "day", many: "days" },
  WEEK: { one: "week", many: "weeks" },
  MONTH: { one: "month", many: "months" },
  YEAR: { one: "year", many: "years" },
};

export function formatDuration(durationValue: number, durationUnit: string): string {
  const label = DURATION_UNIT_LABELS[durationUnit] ?? { one: durationUnit.toLowerCase(), many: durationUnit.toLowerCase() };
  return `${durationValue} ${durationValue === 1 ? label.one : label.many}`;
}

export const BILLING_FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annually",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Pending approval",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};
