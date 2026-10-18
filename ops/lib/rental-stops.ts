import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatInTz, startOfDayInTz, wallYmd } from "@/lib/tz";
import { rentalCharges, type PackageTerms } from "@/lib/rental-charges";
import type { RentalStop } from "@/components/rental-row";

type BookingWithContext = Awaited<ReturnType<typeof loadBookings>>[number];

async function loadBookings(where: Prisma.RentalBookingWhereInput) {
  const bookings = await prisma.rentalBooking.findMany({
    where,
    include: { asset: true, vendor: { select: { name: true, phone: true } }, deliveryDriver: true, pickupDriver: true, job: { include: { customer: true, property: true } } },
    orderBy: { startAt: "asc" },
  });
  const ids = [...new Set(bookings.map((b) => b.priceBookItemId).filter((x): x is string => !!x))];
  const items = ids.length
    ? await prisma.priceBookItem.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, packageDays: true, extraDayCents: true, includedTons: true, overageCentsPerTon: true },
      })
    : [];
  const terms = new Map<string, PackageTerms>(items.map((i) => [i.id, i]));
  return bookings.map((b) => ({ ...b, terms: b.priceBookItemId ? (terms.get(b.priceBookItemId) ?? null) : null }));
}

/** Turns bookings into rows for the dispatch board and job page. `tz` is the company timezone. */
export function toStops(bookings: BookingWithContext[], tz: string): RentalStop[] {
  const todayStart = startOfDayInTz(wallYmd(new Date(), tz), tz).getTime();
  const label = (d: Date) => formatInTz(d, tz, { weekday: "short", month: "short", day: "numeric" });
  return bookings.map((b) => {
    const p = b.job.property;
    const out = b.status === "DELIVERED" || b.status === "PICKUP_REQUESTED";
    return {
      id: b.id,
      jobId: b.jobId,
      status: b.status as RentalStop["status"],
      category: b.category,
      unit: b.asset?.label ?? null,
      vendor: b.vendor ? { name: b.vendor.name, phone: b.vendor.phone, ordered: !!b.vendorOrderedAt } : null,
      customer: `${b.job.customer.firstName} ${b.job.customer.lastName}`,
      phone: b.job.customer.phone,
      address: p ? `${p.addressLine1}${p.addressLine2 ? ` ${p.addressLine2}` : ""}, ${p.city}, ${p.state} ${p.zip}` : null,
      startLabel: label(b.startAt),
      endLabel: label(b.endAt),
      overdue: b.status === "RESERVED" ? b.startAt.getTime() < todayStart : out && b.endAt.getTime() < todayStart,
      swap: b.swapRequested,
      driver: (() => {
        const d = b.status === "RESERVED" ? b.deliveryDriver : b.pickupDriver;
        return d ? { name: d.name, color: d.color } : null;
      })(),
      placementNotes: b.placementNotes,
      weightTons: b.weightTons,
      ticketNumber: b.ticketNumber,
      countdown: {
        status: b.status as RentalStop["status"],
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        deliveredAt: b.deliveredAt?.toISOString() ?? null,
        tz,
        terms: b.terms,
      },
      charges: (() => {
        const c = b.status === "PICKED_UP" ? rentalCharges(b, b.terms, tz) : null;
        if (!c || (c.lines.length === 0 && c.waived.length === 0)) return null;
        const row = (l: (typeof c.lines)[number], waived: boolean) => ({ kind: l.kind, description: l.description, cents: l.quantity * l.unitPriceCents, waived });
        return { totalCents: c.totalCents, lines: [...c.lines.map((l) => row(l, false)), ...c.waived.map((l) => row(l, true))] };
      })(),
    };
  });
}

/** Open rentals for a company (not yet picked up, not cancelled). */
export function openBookings(companyId: string) {
  return loadBookings({ companyId, status: { in: ["RESERVED", "DELIVERED", "PICKUP_REQUESTED"] } });
}

/** Every non-cancelled rental on one job, for its page. */
export function jobBookings(companyId: string, jobId: string) {
  return loadBookings({ companyId, jobId, status: { not: "CANCELLED" } });
}
