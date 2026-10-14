import { prisma } from "@/lib/prisma";
import { formatInTz } from "@/lib/tz";
import { formatCents } from "@/lib/money";
import { swapChargeCents } from "@/lib/rental-portal";

export interface DraftItem {
  id: string;
  jobId: string;
  customer: string;
  unit: string;
  pickup: string;
  channel: string | null;
  body: string;
}

export interface ProposalItem {
  id: string;
  jobId: string;
  customer: string;
  unit: string;
  kind: "EXTEND" | "PICKUP" | "SWAP";
  message: string;
  summary: string;
  /** Asked for on the customer's rental page, not read from a reply by the AI. */
  fromCustomer: boolean;
  /** A swap's charge in cents under the current policy (0 when free or not a swap), so the office can waive it. */
  swapCents: number;
}

/** What is waiting for the owner on the Dispatch page: reminder drafts to approve and AI readings of customer replies. */
export async function loadRentalAiQueue(companyId: string, tz: string): Promise<{ drafts: DraftItem[]; proposals: ProposalItem[] }> {
  const label = (d: Date) =>
    `${formatInTz(d, tz, { weekday: "short", month: "short", day: "numeric" })} ${formatInTz(d, tz, { hour: "numeric", minute: "2-digit" })}`;
  const [drafts, proposals] = await Promise.all([
    prisma.rentalReminder.findMany({
      where: { companyId, status: "DRAFT" },
      orderBy: { forEndAt: "asc" },
      include: { booking: { include: { asset: true, job: { include: { customer: true } } } } },
    }),
    prisma.rentalProposal.findMany({
      where: { companyId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { booking: { include: { asset: true, job: { include: { customer: true } } } } },
    }),
  ]);
  const swapCents = new Map<string, number>(
    await Promise.all(proposals.filter((p) => p.kind === "SWAP").map(async (p) => [p.id, await swapChargeCents(companyId, p.booking.priceBookItemId)] as [string, number])),
  );
  const unitOf = (b: { category: string | null; asset: { label: string } | null }) => `${b.category ?? "Dumpster"}${b.asset ? ` · ${b.asset.label}` : ""}`;
  const nameOf = (b: { job: { customer: { firstName: string; lastName: string } } }) => `${b.job.customer.firstName} ${b.job.customer.lastName}`;

  return {
    drafts: drafts.map((d) => ({
      id: d.id,
      jobId: d.booking.jobId,
      customer: nameOf(d.booking),
      unit: unitOf(d.booking),
      pickup: label(d.forEndAt),
      channel: d.channel,
      body: d.body,
    })),
    proposals: proposals.map((p) => ({
      id: p.id,
      jobId: p.booking.jobId,
      customer: nameOf(p.booking),
      unit: unitOf(p.booking),
      kind: p.kind,
      message: p.message,
      fromCustomer: p.fromCustomer,
      swapCents: swapCents.get(p.id) ?? 0,
      summary:
        p.kind === "PICKUP"
          ? "Wants the dumpster picked up. Confirm to mark pickup requested."
          : p.kind === "SWAP"
            ? `Dumpster is full and they want an empty one${swapCents.get(p.id) ? ` (${formatCents(swapCents.get(p.id)!)} swap charge)` : " (no charge)"}. Confirm to mark pickup requested as a swap, then schedule the replacement.`
            : `Wants ${p.extraDays} more day${p.extraDays === 1 ? "" : "s"}: move pickup from ${label(p.booking.endAt)} to ${p.newEndAt ? label(p.newEndAt) : "?"}${p.priceCents ? ` (${formatCents(p.priceCents)} extra)` : ""}.`,
    })),
  };
}
