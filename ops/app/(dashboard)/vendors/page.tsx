import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { companyHasFeature } from "@/lib/plan-access";
import { FeatureLocked } from "@/components/feature-locked";
import { VendorsManager, type PartnerVendor, type Lookup } from "./vendors-manager";

export default async function VendorsPage() {
  const { companyId } = await requireSession();
  if (!(await companyHasFeature(companyId, "RENTALS"))) return <FeatureLocked feature="RENTALS" title="Vendors" />;

  const [vendors, packages] = await Promise.all([
    prisma.vendor.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" }, include: { rates: { orderBy: { size: "asc" } } } }),
    prisma.priceBookItem.findMany({
      where: { companyId, active: true, packageDays: { not: null }, assetCategory: { not: null } },
      select: { assetCategory: true, unitPriceCents: true, costCents: true },
    }),
  ]);

  const partners: PartnerVendor[] = vendors
    .filter((v) => v.dumpsterPartner)
    .map((v) => ({
      id: v.id,
      name: v.name,
      contactName: v.contactName,
      phone: v.phone,
      email: v.email,
      serviceAreas: v.serviceAreas,
      paymentTerms: v.paymentTerms,
      partnerNotes: v.partnerNotes,
      ourRatePercent: v.ourRatePercent,
      rates: v.rates.map((r) => ({
        id: r.id,
        size: r.size,
        costCents: r.costCents,
        sellCents: r.sellCents,
        packageDays: r.packageDays,
        includedTons: r.includedTons,
        extraDayCents: r.extraDayCents,
        overageCentsPerTon: r.overageCentsPerTon,
        notes: r.notes,
        inventory: r.inventory,
        inventoryUpdatedAt: r.inventoryUpdatedAt?.toISOString() ?? null,
      })),
    }));
  const others = vendors.filter((v) => !v.dumpsterPartner).map((v) => ({ id: v.id, name: v.name }));

  // Price lookup by size: our own price and cost next to every partner's.
  const sizes = new Set<string>();
  for (const p of packages) sizes.add(p.assetCategory!.trim());
  for (const v of partners) for (const r of v.rates) sizes.add(r.size.trim());
  const lookup: Lookup[] = [...sizes]
    .sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b))
    .map((size) => {
      const own = packages.find((p) => p.assetCategory!.trim().toLowerCase() === size.toLowerCase());
      return {
        size,
        ownPriceCents: own?.unitPriceCents ?? null,
        ownCostCents: own?.costCents ?? null,
        vendors: partners.flatMap((v) => {
          const r = v.rates.find((x) => x.size.trim().toLowerCase() === size.toLowerCase());
          return r ? [{ vendorId: v.id, vendorName: v.name, costCents: r.costCents, sellCents: r.sellCents, inventory: r.inventory }] : [];
        }),
      };
    });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Vendors</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Other dumpster companies you can broker for when your own fleet is booked. Keep their sizes, what they charge you, what you charge the customer, and where they deliver. Orders to them are placed by phone or text for now.
        </p>
      </div>
      <VendorsManager partners={partners} others={others} lookup={lookup} />
    </div>
  );
}
