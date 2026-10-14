import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { formatInTz } from "@/lib/tz";

// What a customer sees and can ask for on their private estimate link (/e/<token>) once a rental exists.

export const MAX_EXTENSION_DAYS = 14;

export interface PortalRental {
  id: string;
  /** "20 yard dumpster" style label. */
  unit: string;
  status: "RESERVED" | "DELIVERED" | "PICKUP_REQUESTED";
  deliveryLabel: string;
  pickupLabel: string;
  extraDayPrice: string | null;
  /** Requests already waiting on the office, so the buttons don't offer them twice. */
  pending: { PICKUP: boolean; EXTEND: boolean; SWAP: boolean };
}

export async function loadPortalRentals(companyId: string, jobId: string | null, timezone: string): Promise<PortalRental[]> {
  if (!jobId) return [];
  const bookings = await prisma.rentalBooking.findMany({
    where: { companyId, jobId, status: { in: ["RESERVED", "DELIVERED", "PICKUP_REQUESTED"] } },
    orderBy: { startAt: "asc" },
    include: { proposals: { where: { status: "PENDING" }, select: { kind: true } } },
  });
  const when = (d: Date) => `${formatInTz(d, timezone, { weekday: "short", month: "short", day: "numeric" })}, ${formatInTz(d, timezone, { hour: "numeric", minute: "2-digit" })}`;

  const out: PortalRental[] = [];
  for (const b of bookings) {
    const item = b.priceBookItemId
      ? await prisma.priceBookItem.findFirst({ where: { id: b.priceBookItemId, companyId }, select: { extraDayCents: true } })
      : null;
    out.push({
      id: b.id,
      unit: `${b.category ?? "Dumpster"}`,
      status: b.status as PortalRental["status"],
      deliveryLabel: when(b.startAt),
      pickupLabel: when(b.endAt),
      extraDayPrice: item?.extraDayCents ? formatCents(item.extraDayCents) : null,
      pending: {
        PICKUP: b.proposals.some((p) => p.kind === "PICKUP") || b.status === "PICKUP_REQUESTED",
        EXTEND: b.proposals.some((p) => p.kind === "EXTEND"),
        SWAP: b.proposals.some((p) => p.kind === "SWAP"),
      },
    });
  }
  return out;
}
