import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { FleetManager, type FleetUnit } from "./fleet-manager";

export default async function FleetPage() {
  const { companyId } = await requireSession();

  const assets = await prisma.rentalAsset.findMany({
    where: { companyId, kind: "DUMPSTER" },
    orderBy: [{ category: "asc" }, { label: "asc" }],
    include: {
      // What each unit is doing now (out on a site) and its next reservation.
      bookings: {
        where: { status: { in: ["RESERVED", "DELIVERED", "PICKUP_REQUESTED"] } },
        orderBy: { startAt: "asc" },
        include: { job: { include: { customer: true, property: true } } },
      },
    },
  });

  const units: FleetUnit[] = assets.map((a) => {
    const out = a.bookings.find((b) => b.status === "DELIVERED" || b.status === "PICKUP_REQUESTED");
    const next = a.bookings.find((b) => b.status === "RESERVED");
    const describe = (b: (typeof a.bookings)[number]) => ({
      customer: `${b.job.customer.firstName} ${b.job.customer.lastName}`,
      address: b.job.property ? `${b.job.property.addressLine1}, ${b.job.property.city}` : null,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      jobId: b.jobId,
      status: b.status,
    });
    return {
      id: a.id,
      label: a.label,
      category: a.category,
      status: a.status,
      notes: a.notes,
      current: out ? describe(out) : null,
      next: next ? describe(next) : null,
    };
  });

  const categories = [...new Set(units.map((u) => u.category).filter((c): c is string => !!c))];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Fleet</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Every dumpster you own as its own unit. Rentals are assigned to a specific unit so you can see what&apos;s available and never double-book.
        </p>
      </div>
      <FleetManager units={units} categories={categories} />
    </div>
  );
}
