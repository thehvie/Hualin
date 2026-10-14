import { prisma } from "@/lib/prisma";
import { formatInTz } from "@/lib/tz";
import { formatCents } from "@/lib/money";

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
      summary:
        p.kind === "PICKUP"
          ? "Wants the dumpster picked up. Confirm to mark pickup requested."
          : p.kind === "SWAP"
            ? "Dumpster is full and they want an empty one. Confirm to mark pickup requested as a swap, then book the replacement on the estimate."
            : `Wants ${p.extraDays} more day${p.extraDays === 1 ? "" : "s"}: move pickup from ${label(p.booking.endAt)} to ${p.newEndAt ? label(p.newEndAt) : "?"}${p.priceCents ? ` (${formatCents(p.priceCents)} extra)` : ""}.`,
    })),
  };
}
