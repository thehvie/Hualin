import { prisma } from "@/lib/prisma";
import { COMPANY_PLAN_SELECT, accessFor, type CompanyPlanFields } from "@/lib/plans";

// Third-party API usage is metered per company. Each plan includes an allowance of our cost each calendar
// month (UTC, see lib/plans.ts); beyond that it is billed at cost + OVERAGE_MARKUP, up to the plan's overage
// cap, at which point paid features pause until the next month. Starter and the free trial have a cap of 0:
// no overage billing, features pause once the allowance is used.
export const OVERAGE_MARKUP = 1.5; // cost plus 50%

export type UsageService = "VOICE_INTAKE" | "TEXT_INTAKE" | "VOICE_ITEMS" | "GEOCODE" | "ROUTE" | "MAP_LOAD" | "RENTAL_MESSAGE" | "RENTAL_REPLY";

// Google list prices (Essentials tier) per call, in millionths of a dollar. AI calls are metered at the
// actual cost OpenRouter reports for each request.
export const GOOGLE_COST_MICROS = { GEOCODE: 5_000, ROUTE: 5_000, MAP_LOAD: 7_000 } as const;

export const SERVICE_LABELS: Record<string, string> = {
  VOICE_INTAKE: "Voice intake",
  TEXT_INTAKE: "Typed commands",
  VOICE_ITEMS: "Voice items",
  GEOCODE: "Address lookups",
  ROUTE: "Drive routes",
  MAP_LOAD: "Map views",
  RENTAL_MESSAGE: "Rental reminders",
  RENTAL_REPLY: "Customer reply reading",
};

export const USAGE_PAUSED_MESSAGE =
  "Your API usage limit for this month has been reached. Paid features resume on the 1st.";

/** Start (inclusive) and end (exclusive) of the UTC calendar month containing `date`. */
export function monthRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface UsageLimits {
  includedMicros: number;
  overageCapCents: number;
}

/** What to bill (in cents) for a month of usage: the part over the allowance, plus markup, capped. */
export function overageCents(usageMicros: number, limits: UsageLimits): number {
  const over = Math.max(0, usageMicros - limits.includedMicros);
  return Math.min(limits.overageCapCents, Math.ceil((over / 10_000) * OVERAGE_MARKUP));
}

/** Paid features pause: the overage cap is hit, or (no overage billing) the allowance is used up. */
export function isCapped(usageMicros: number, limits: UsageLimits): boolean {
  if (limits.overageCapCents <= 0) return usageMicros >= limits.includedMicros;
  return overageCents(usageMicros, limits) >= limits.overageCapCents;
}

export interface UsageStatus {
  usedMicros: number;
  includedMicros: number;
  overageCapCents: number;
  overageCents: number;
  capped: boolean;
  byService: { service: string; count: number; costMicros: number }[];
}

export async function getUsageStatus(companyId: string, date = new Date()): Promise<UsageStatus> {
  const { start, end } = monthRange(date);
  const groups = await prisma.usageEvent.groupBy({
    by: ["service"],
    where: { companyId, createdAt: { gte: start, lt: end } },
    _sum: { costMicros: true },
    _count: { _all: true },
  });
  const byService = groups.map((g) => ({ service: g.service, count: g._count._all, costMicros: g._sum.costMicros ?? 0 }));
  const usedMicros = byService.reduce((sum, g) => sum + g.costMicros, 0);
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: COMPANY_PLAN_SELECT });
  const access = accessFor(company as CompanyPlanFields, date);
  const limits = { includedMicros: access.includedMicros, overageCapCents: access.overageCapCents };
  return {
    usedMicros,
    includedMicros: access.includedMicros,
    overageCapCents: access.overageCapCents,
    overageCents: overageCents(usedMicros, limits),
    capped: isCapped(usedMicros, limits),
    byService,
  };
}

export async function recordUsage(companyId: string, service: UsageService, costMicros: number, ref?: string) {
  try {
    await prisma.usageEvent.create({ data: { companyId, service, costMicros: Math.max(0, Math.round(costMicros)), ref: ref ?? null } });
  } catch (err) {
    // Metering must never break the feature the user is using.
    console.error("Failed to record usage", err);
  }
}

/**
 * Map views are counted once per thing (an estimate, a customer) per 24 hours, so re-opening the same page
 * doesn't keep running up the meter. Returns true if this view should be counted.
 */
export async function shouldCountMapView(companyId: string, ref: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const seen = await prisma.usageEvent.findFirst({
    where: { companyId, service: "MAP_LOAD", ref, createdAt: { gte: since } },
    select: { id: true },
  });
  return !seen;
}

export function formatMicros(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}
