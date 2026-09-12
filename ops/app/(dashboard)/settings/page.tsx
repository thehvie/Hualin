import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { companyId } = await requireSession();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });

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
          logoDataUrl: company.logoDataUrl,
        }}
      />
    </div>
  );
}
