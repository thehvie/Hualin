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
  /** null when the company doesn't offer swaps; otherwise what to tell the customer it costs. */
  swapNote: string | null;
  /** Requests already waiting on the office, so the buttons don't offer them twice. */
  pending: { PICKUP: boolean; EXTEND: boolean; SWAP: boolean };
}

export async function loadPortalRentals(companyId: string, jobId: string | null, timezone: string): Promise<PortalRental[]> {
  if (!jobId) return [];
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { swapPolicy: true, swapFeeCents: true } });
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
      swapNote: await swapNoteFor(companyId, company, b.priceBookItemId),
      pending: {
        PICKUP: b.proposals.some((p) => p.kind === "PICKUP") || b.status === "PICKUP_REQUESTED",
        EXTEND: b.proposals.some((p) => p.kind === "EXTEND"),
        SWAP: b.proposals.some((p) => p.kind === "SWAP"),
      },
    });
  }
  return out;
}

/** What a swap costs, in words for the customer, or null when swaps aren't offered. */
async function swapNoteFor(companyId: string, company: { swapPolicy: string; swapFeeCents: number }, priceBookItemId: string | null): Promise<string | null> {
  if (company.swapPolicy === "OFF") return null;
  if (company.swapPolicy === "FREE") return "No charge";
  if (company.swapPolicy === "FLAT") return `${formatCents(company.swapFeeCents)} swap fee`;
  const item = priceBookItemId ? await prisma.priceBookItem.findFirst({ where: { id: priceBookItemId, companyId }, select: { unitPriceCents: true } }) : null;
  return item?.unitPriceCents ? `${formatCents(item.unitPriceCents)}, the full package price` : "Charged at the full package price";
}

/** What a confirmed swap adds to the invoice, in cents, under the company's current policy. */
export async function swapChargeCents(companyId: string, priceBookItemId: string | null): Promise<number> {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { swapPolicy: true, swapFeeCents: true } });
  if (company.swapPolicy === "FLAT") return company.swapFeeCents;
  if (company.swapPolicy === "FULL" && priceBookItemId) {
    const item = await prisma.priceBookItem.findFirst({ where: { id: priceBookItemId, companyId }, select: { unitPriceCents: true } });
    return item?.unitPriceCents ?? 0;
  }
  return 0;
}
