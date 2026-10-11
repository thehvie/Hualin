import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Statuses that keep a unit tied up. A unit that's out (delivered, or pickup requested) is busy until it comes back. */
export const ACTIVE_RENTAL_STATUSES = ["RESERVED", "DELIVERED", "PICKUP_REQUESTED"] as const;

export interface UnitOption {
  id: string;
  label: string;
}

/**
 * Units of a size that are free for the whole of [start, end): not in maintenance or retired, and with no other rental
 * overlapping those dates. A unit that's still out past its planned pickup is treated as busy until it returns.
 * `excludeBookingId` lets a booking keep the unit it already holds when its dates are re-checked.
 */
export async function availableAssets(
  companyId: string,
  category: string | null,
  start: Date,
  end: Date,
  excludeBookingId?: string,
): Promise<UnitOption[]> {
  const now = Date.now();
  const assets = await prisma.rentalAsset.findMany({
    where: {
      companyId,
      kind: "DUMPSTER",
      status: { in: ["AVAILABLE", "ON_RENT"] },
      ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
    },
    orderBy: { label: "asc" },
    include: {
      bookings: {
        where: { status: { in: [...ACTIVE_RENTAL_STATUSES] }, ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}) },
        select: { startAt: true, endAt: true, status: true },
      },
    },
  });

  return assets
    .filter((a) =>
      a.bookings.every((b) => {
        const out = b.status !== "RESERVED"; // already on a customer's site
        const busyUntil = out ? Math.max(b.endAt.getTime(), now) : b.endAt.getTime();
        return !(b.startAt.getTime() < end.getTime() && busyUntil > start.getTime());
      }),
    )
    .map((a) => ({ id: a.id, label: a.label }));
}

/** Planned pickup: the job's end date, or the start plus the days the package includes. */
export function plannedEnd(start: Date, end: Date | null, packageDays: number | null): Date {
  if (end && end > start) return end;
  return new Date(start.getTime() + Math.max(1, packageDays ?? 7) * DAY_MS);
}

/** After the job's dates change, move its not-yet-delivered rentals with it, and release any unit that's no longer free. */
export async function syncBookingDates(companyId: string, jobId: string, start: Date | null, end: Date | null): Promise<void> {
  if (!start) return;
  const bookings = await prisma.rentalBooking.findMany({ where: { jobId, companyId, status: "RESERVED" } });
  if (bookings.length === 0) return;

  const items = await prisma.priceBookItem.findMany({
    where: { companyId, id: { in: bookings.map((b) => b.priceBookItemId).filter((x): x is string => !!x) } },
    select: { id: true, packageDays: true },
  });
  const packageDays = new Map(items.map((i) => [i.id, i.packageDays]));

  for (const b of bookings) {
    const newEnd = plannedEnd(start, end, b.priceBookItemId ? (packageDays.get(b.priceBookItemId) ?? null) : null);
    let assetId = b.assetId;
    if (assetId) {
      const free = await availableAssets(companyId, b.category, start, newEnd, b.id);
      if (!free.some((u) => u.id === assetId)) assetId = null;
    }
    await prisma.rentalBooking.update({ where: { id: b.id }, data: { startAt: start, endAt: newEnd, assetId } });
  }
}

export interface RentalRow {
  id: string;
  category: string | null;
  status: string;
  assetId: string | null;
  startAt: string;
  endAt: string;
  options: UnitOption[];
}

export interface RentalCardData {
  /** True when the estimate has at least one dumpster package item. */
  hasPackageLines: boolean;
  /** How many dumpsters the estimate's items call for. */
  unitsNeeded: number;
  /** The job has a delivery date, so units can be reserved. */
  scheduled: boolean;
  bookings: RentalRow[];
}

/** Everything the estimate's Rentals card shows: what's needed, what's reserved, and which units are free for each. */
export async function loadRentalCard(
  companyId: string,
  estimate: { jobId: string | null; lineItems: { priceBookItemId: string | null; quantity: number }[] },
  job: { scheduledAt: Date | null } | null,
): Promise<RentalCardData> {
  const ids = estimate.lineItems.map((l) => l.priceBookItemId).filter((x): x is string => !!x);
  const items = ids.length
    ? await prisma.priceBookItem.findMany({ where: { companyId, id: { in: ids }, packageDays: { not: null } }, select: { id: true } })
    : [];
  const packageIds = new Set(items.map((i) => i.id));
  const unitsNeeded = estimate.lineItems.filter((l) => l.priceBookItemId && packageIds.has(l.priceBookItemId)).reduce((s, l) => s + l.quantity, 0);

  const bookings = estimate.jobId
    ? await prisma.rentalBooking.findMany({
        where: { jobId: estimate.jobId, companyId, status: { not: "CANCELLED" } },
        orderBy: { createdAt: "asc" },
        include: { asset: true },
      })
    : [];

  const rows: RentalRow[] = [];
  for (const b of bookings) {
    // Delivered or finished rentals are fixed; only reserved ones can still be given a different unit.
    const options = b.status === "RESERVED" ? await availableAssets(companyId, b.category, b.startAt, b.endAt, b.id) : [];
    if (b.asset && !options.some((o) => o.id === b.asset!.id)) options.unshift({ id: b.asset.id, label: b.asset.label });
    rows.push({
      id: b.id,
      category: b.category,
      status: b.status,
      assetId: b.assetId,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      options,
    });
  }

  return { hasPackageLines: unitsNeeded > 0 || bookings.length > 0, unitsNeeded, scheduled: !!job?.scheduledAt, bookings: rows };
}
