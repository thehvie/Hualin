import { prisma } from "@/lib/prisma";

// Third-party API usage is metered per company. Every plan includes INCLUDED_MICROS of our cost each
// calendar month (UTC); beyond that it is billed at cost + OVERAGE_MARKUP, up to OVERAGE_CAP_CENTS,
// at which point paid features pause until the next month.
export const INCLUDED_MICROS = 5_000_000; // $5.00
export const OVERAGE_MARKUP = 1.5; // cost plus 50%
export const OVERAGE_CAP_CENTS = 5000; // $50.00 of billed overage

export type UsageService = "VOICE_INTAKE" | "VOICE_ITEMS" | "GEOCODE" | "ROUTE" | "MAP_LOAD";

// Google list prices (Essentials tier) per call, in millionths of a dollar. AI calls are metered at the
// actual cost OpenRouter reports for each request.
export const GOOGLE_COST_MICROS = { GEOCODE: 5_000, ROUTE: 5_000, MAP_LOAD: 7_000 } as const;

export const SERVICE_LABELS: Record<string, string> = {
  VOICE_INTAKE: "Voice intake",
  VOICE_ITEMS: "Voice items",
  GEOCODE: "Address lookups",
  ROUTE: "Drive routes",
  MAP_LOAD: "Map views",
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

/** What to bill (in cents) for a month of usage: the part over the allowance, plus markup, capped. */
export function overageCents(usageMicros: number): number {
  const over = Math.max(0, usageMicros - INCLUDED_MICROS);
  return Math.min(OVERAGE_CAP_CENTS, Math.ceil((over / 10_000) * OVERAGE_MARKUP));
}

export interface UsageStatus {
  usedMicros: number;
  includedMicros: number;
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
  const overage = overageCents(usedMicros);
  return { usedMicros, includedMicros: INCLUDED_MICROS, overageCents: overage, capped: overage >= OVERAGE_CAP_CENTS, byService };
}

export async function recordUsage(companyId: string, service: UsageService, costMicros: number) {
  try {
    await prisma.usageEvent.create({ data: { companyId, service, costMicros: Math.max(0, Math.round(costMicros)) } });
  } catch (err) {
    // Metering must never break the feature the user is using.
    console.error("Failed to record usage", err);
  }
}

export function formatMicros(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}
