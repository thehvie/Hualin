import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { availableAssets, plannedEnd } from "@/lib/rentals";
import { rateLimit } from "@/lib/rate-limit";

// Public, read-only: dumpster packages from the price book plus whether a unit is free. The marketing site calls this
// from its server and shows live prices and "available / booked until" on the size cards. No costs, no unit counts.
const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKAHEAD_DAYS = 45;

export async function GET(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`public-rentals:${ip}`, 60, 60_000).ok) return new NextResponse("Too many requests", { status: 429 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) return new NextResponse("Not found", { status: 404 });

  const items = await prisma.priceBookItem.findMany({
    where: { companyId, active: true, packageDays: { not: null } },
    orderBy: { unitPriceCents: "asc" },
    select: {
      id: true, name: true, description: true, unitPriceCents: true, packageDays: true, includedTons: true,
      extraDayCents: true, overageCentsPerTon: true, assetCategory: true,
    },
  });

  // Requested delivery date, default tomorrow. Whole days are enough for a "can you deliver" signal.
  const dateParam = new URL(req.url).searchParams.get("date");
  const parsed = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? new Date(`${dateParam}T12:00:00Z`) : null;
  const start = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date(Date.now() + DAY_MS);

  // Same sizes share one check.
  const byCategory = new Map<string, { available: boolean; nextAvailable: string | null }>();
  for (const cat of new Set(items.map((i) => i.assetCategory).filter((c): c is string => !!c))) {
    const days = Math.max(...items.filter((i) => i.assetCategory === cat).map((i) => i.packageDays ?? 3));
    const free = async (from: Date) => (await availableAssets(companyId, cat, from, plannedEnd(from, null, days))).length > 0;
    let available = await free(start);
    let nextAvailable: string | null = available ? start.toISOString().slice(0, 10) : null;
    for (let d = 1; !available && d <= LOOKAHEAD_DAYS; d++) {
      const from = new Date(start.getTime() + d * DAY_MS);
      if (await free(from)) {
        available = false;
        nextAvailable = from.toISOString().slice(0, 10);
        break;
      }
    }
    byCategory.set(cat, { available: nextAvailable === start.toISOString().slice(0, 10), nextAvailable });
  }

  const packages = items.map((i) => {
    const a = i.assetCategory ? byCategory.get(i.assetCategory) : undefined;
    return {
      id: i.id,
      name: i.name,
      category: i.assetCategory,
      priceCents: i.unitPriceCents,
      packageDays: i.packageDays,
      includedTons: i.includedTons,
      extraDayCents: i.extraDayCents,
      overageCentsPerTon: i.overageCentsPerTon,
      // null = we can't tell (no fleet size linked, e.g. a combo), so the site shows "call".
      available: a ? a.available : null,
      nextAvailable: a ? a.nextAvailable : null,
    };
  });

  return NextResponse.json(
    { date: start.toISOString().slice(0, 10), packages },
    { headers: { "Cache-Control": "public, s-maxage=60, max-age=60" } },
  );
}
