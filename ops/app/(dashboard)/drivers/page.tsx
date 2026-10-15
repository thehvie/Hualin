import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { companyHasFeature } from "@/lib/plan-access";
import { FeatureLocked } from "@/components/feature-locked";
import { DriversManager, type DriverRow } from "./drivers-manager";

export default async function DriversPage() {
  const { companyId, role } = await requireSession();
  if (!(await companyHasFeature(companyId, "RENTALS"))) return <FeatureLocked feature="RENTALS" title="Drivers" />;

  const drivers = await prisma.driver.findMany({
    where: { companyId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { user: { select: { email: true } } },
  });

  const rows: DriverRow[] = drivers.map((d) => ({
    id: d.id,
    name: d.name,
    phone: d.phone,
    email: d.email,
    vehicle: d.vehicle,
    color: d.color,
    notes: d.notes,
    active: d.active,
    loginEmail: d.user?.email ?? null,
  }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Drivers</h1>
        <p className="mt-1 text-sm text-zinc-500">
          The people who drive your trucks. Dispatch assigns deliveries and pickups to them. Drivers are unlimited and free, and never count as a user on your plan.
        </p>
      </div>
      <DriversManager drivers={rows} canEdit={role === "ADMIN" || role === "DISPATCHER"} />
    </div>
  );
}
