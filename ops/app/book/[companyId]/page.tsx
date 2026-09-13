import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingWizard } from "./booking-wizard";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  if (!company) notFound();

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-1">
        <div className="flex items-center gap-3">
          {company.logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoDataUrl} alt={company.name} className="h-10 max-w-[140px] object-contain" />
          )}
          <div>
            <h1 className="text-lg font-bold text-zinc-900">Book service with {company.name}</h1>
            <p className="text-sm text-zinc-500">Junk Removal</p>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-2xl">
        <BookingWizard companyId={company.id} companyName={company.name} serviceName="Junk Removal" />
      </div>
    </div>
  );
}
