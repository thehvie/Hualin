import { prisma } from "@/lib/prisma";
import { Locator } from "@/lib/map-pins";
import { addDaysYmd, formatInTz, startOfDayInTz, wallYmd } from "@/lib/tz";

// The stops dispatch has to staff on a given day: drop-offs and pickups, each its own task so a delivery and its
// pickup can go to different drivers.

export type TaskKind = "DELIVERY" | "PICKUP";

export interface DispatchTask {
  /** `${bookingId}:${kind}`, unique per stop. */
  id: string;
  bookingId: string;
  kind: TaskKind;
  /** The customer asked for a swap, so this pickup is followed by a replacement drop-off. */
  swap: boolean;
  /** The customer asked for this pickup (rather than it being due). */
  requested: boolean;
  /** Should have happened before today. */
  overdue: boolean;
  customer: string;
  phone: string | null;
  unit: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  when: string;
  driverId: string | null;
  href: string;
}

const time = (d: Date, tz: string) => formatInTz(d, tz, { hour: "numeric", minute: "2-digit" });
const dateShort = (d: Date, tz: string) => formatInTz(d, tz, { month: "short", day: "numeric" });

/** All drop-offs and pickups due on `ymd` (company timezone), plus anything overdue or customer-requested when it's today. */
export async function dispatchTasks(companyId: string, tz: string, ymd: string): Promise<DispatchTask[]> {
  const start = startOfDayInTz(ymd, tz);
  const end = startOfDayInTz(addDaysYmd(ymd, 1), tz);
  const isToday = ymd === wallYmd(new Date(), tz);

  const bookings = await prisma.rentalBooking.findMany({
    where: {
      companyId,
      vendorId: null, // vendors deliver and pick up their own dumpsters
      OR: [
        { status: "RESERVED", startAt: { gte: start, lt: end } },
        { status: { in: ["DELIVERED", "PICKUP_REQUESTED"] }, endAt: { gte: start, lt: end } },
        ...(isToday ? [{ status: { in: ["DELIVERED", "PICKUP_REQUESTED"] as ("DELIVERED" | "PICKUP_REQUESTED")[] }, OR: [{ endAt: { lt: start } }, { status: "PICKUP_REQUESTED" as const }] }] : []),
      ],
    },
    include: { asset: true, job: { include: { customer: true, property: true } } },
    orderBy: { startAt: "asc" },
  });

  const locator = new Locator(companyId);
  const tasks: DispatchTask[] = [];
  for (const b of bookings) {
    const delivery = b.status === "RESERVED";
    const spot = await locator.locate(b.job.property);
    const overdue = delivery ? b.startAt < start : b.endAt < start;
    tasks.push({
      id: `${b.id}:${delivery ? "DELIVERY" : "PICKUP"}`,
      bookingId: b.id,
      kind: delivery ? "DELIVERY" : "PICKUP",
      swap: !delivery && b.swapRequested,
      requested: b.status === "PICKUP_REQUESTED",
      overdue,
      customer: `${b.job.customer.firstName} ${b.job.customer.lastName}`.trim(),
      phone: b.job.customer.phone,
      unit: `${b.category ?? "Dumpster"}${b.asset ? ` · ${b.asset.label}` : ""}`,
      address: spot?.address ?? null,
      lat: spot?.lat ?? null,
      lng: spot?.lng ?? null,
      when: delivery ? `${time(b.startAt, tz)}${overdue ? `, was ${dateShort(b.startAt, tz)}` : ""}` : b.status === "PICKUP_REQUESTED" ? "Requested by customer" : `${time(b.endAt, tz)}${overdue ? `, was ${dateShort(b.endAt, tz)}` : ""}`,
      driverId: delivery ? b.deliveryDriverId : b.pickupDriverId,
      href: `/jobs/${b.jobId}`,
    });
  }
  return tasks;
}
