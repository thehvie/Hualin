import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getOfficePoint } from "@/lib/office";
import { MapTool } from "./map-tool";

export default async function MapPage() {
  const { companyId } = await requireSession();
  const [office, company] = await Promise.all([
    getOfficePoint(companyId),
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true } }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Map</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Type any address to see where it is and how far it is from {office ? "your office" : company.name}: miles, drive time, and the fuel charge.
        </p>
      </div>
      {!office && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Add your office address in Settings to get distances. Without it you can still look up where an address is.
        </p>
      )}
      <MapTool officeLabel={office?.label ?? null} />
    </div>
  );
}
