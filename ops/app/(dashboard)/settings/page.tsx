import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { SettingsForm } from "./settings-form";
import { UsageCard } from "./usage-card";
import { getUsageStatus } from "@/lib/usage";
import { getDefaultTaxRate, bpsToPercent } from "@/lib/tax";

export default async function SettingsPage() {
  const { companyId } = await requireSession();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const defaultTax = await getDefaultTaxRate(companyId);
  const usage = await getUsageStatus(companyId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          This shows up on your estimates and invoices, including downloaded PDFs.
        </p>
      </div>

      <SettingsForm
        company={{
          name: company.name,
          email: company.email,
          phone: company.phone,
          website: company.website,
          termsText: company.termsText,
          timezone: company.timezone,
          state: company.state,
          fuelRate: (company.fuelRateCentsPerMile / 100).toFixed(2),
          fuelFreeMiles: company.fuelFreeMiles,
          fuelRoundTrip: company.fuelRoundTrip,
          officeAddressLine1: company.officeAddressLine1,
          officeCity: company.officeCity,
          officeState: company.officeState,
          officeZip: company.officeZip,
          salesTaxPercent: bpsToPercent(defaultTax?.rateBps ?? 0),
          logoDataUrl: company.logoDataUrl,
        }}
      />

      <UsageCard usage={usage} />
    </div>
  );
}
