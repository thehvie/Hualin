import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import Link from "next/link";
import { SettingsForm } from "./settings-form";
import { UsageCard } from "./usage-card";
import { TermsCard } from "./terms-card";
import { ReminderCard } from "./reminder-card";
import { SwapCard } from "./swap-card";
import { EmailCard, type EmailState } from "./email-card";
import { sharedEmailStatusOf } from "@/lib/mail-config";
import { getUsageStatus } from "@/lib/usage";
import { attachmentStorage } from "@/lib/comm-attachments";
import { getDefaultTaxRate, bpsToPercent } from "@/lib/tax";

export default async function SettingsPage() {
  const { companyId } = await requireSession();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const defaultTax = await getDefaultTaxRate(companyId);
  const usage = await getUsageStatus(companyId);
  const storage = await attachmentStorage(companyId);
  const mail = sharedEmailStatusOf(company);
  const emailState: EmailState =
    mail.mode === "own"
      ? { mode: "own", domain: mail.domain, fromEmail: company.mailFromEmail || `noreply@${mail.domain}`, region: company.mailgunRegion, hasSigningKey: !!company.mailgunSigningKeyEnc }
      : mail;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          This shows up on your estimates and invoices, including downloaded PDFs.
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/settings/plan" className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
          Plan and billing
        </Link>
        <Link href="/settings/customer-requests" className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
          Customer requests
        </Link>
        <Link href="/settings/team" className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
          Team
        </Link>
      </div>

      <SettingsForm
        company={{
          name: company.name,
          email: company.email,
          phone: company.phone,
          website: company.website,
          timezone: company.timezone,
          state: company.state,
          paymentLinkUrl: company.paymentLinkUrl,
          paymentLinkLabel: company.paymentLinkLabel,
          paymentLinkOnEstimates: company.paymentLinkOnEstimates,
          paymentLinkOnInvoices: company.paymentLinkOnInvoices,
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

      <TermsCard termsText={company.termsText ?? ""} rentalTermsText={company.rentalTermsText ?? ""} />

      <ReminderCard
        initial={{
          on: company.rentalRemindersOn,
          hours: company.rentalReminderHours,
          auto: company.rentalReminderAuto,
          ai: company.rentalReminderAi,
          quietStart: company.rentalQuietStartHour,
          quietEnd: company.rentalQuietEndHour,
        }}
      />

      <SwapCard initial={{ policy: company.swapPolicy, feeDollars: company.swapFeeCents ? (company.swapFeeCents / 100).toString() : "" }} />

      <EmailCard state={emailState} appUrl={(process.env.NEXTAUTH_URL || "").replace(/\/$/, "")} />

      <UsageCard usage={usage} storageUsedBytes={storage.usedBytes} />
    </div>
  );
}
