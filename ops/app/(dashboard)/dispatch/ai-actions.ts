"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { availableAssets } from "@/lib/rentals";
import { deliverReminder, whenText } from "@/lib/rental-reminders";
import { sendToCustomer } from "@/lib/outbound";
import { formatCents } from "@/lib/money";

type Result = { ok: true; note?: string } | { ok: false; error: string };

async function refresh(jobId: string) {
  revalidatePath("/dispatch");
  revalidatePath("/schedule");
  revalidatePath("/inbox");
  revalidatePath(`/jobs/${jobId}`);
  const estimates = await prisma.estimate.findMany({ where: { jobId }, select: { id: true } });
  for (const e of estimates) revalidatePath(`/estimates/${e.id}`);
}

/** Owner approves a drafted reminder (optionally after editing it) and it goes to the customer. */
export async function sendReminder(reminderId: string, body: string): Promise<Result> {
  const { companyId } = await requireSession();
  const r = await prisma.rentalReminder.findFirst({ where: { id: reminderId, companyId }, include: { booking: { select: { jobId: true } } } });
  if (!r) return { ok: false, error: "Reminder not found." };
  const res = await deliverReminder(r.id, { body });
  await refresh(r.booking.jobId);
  return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Couldn't send." };
}

export async function dismissReminder(reminderId: string): Promise<Result> {
  const { companyId } = await requireSession();
  const r = await prisma.rentalReminder.findFirst({ where: { id: reminderId, companyId, status: "DRAFT" }, include: { booking: { select: { jobId: true } } } });
  if (!r) return { ok: false, error: "Reminder not found." };
  await prisma.rentalReminder.update({ where: { id: r.id }, data: { status: "DISMISSED" } });
  await refresh(r.booking.jobId);
  return { ok: true };
}

/** Owner confirms what the AI read in a customer's reply: move the pickup date, or mark the pickup as requested. */
export async function applyProposal(proposalId: string): Promise<Result> {
  const { companyId } = await requireSession();
  const p = await prisma.rentalProposal.findFirst({
    where: { id: proposalId, companyId, status: "PENDING" },
    include: { booking: { include: { job: { include: { estimates: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } } } } } } },
  });
  if (!p) return { ok: false, error: "This suggestion is no longer pending." };
  const b = p.booking;
  if (b.status !== "DELIVERED") {
    await prisma.rentalProposal.update({ where: { id: p.id }, data: { status: "DISMISSED" } });
    await refresh(b.jobId);
    return { ok: false, error: "This dumpster isn't out on site any more, so the suggestion was cleared." };
  }
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  const estimateId = b.job.estimates[0]?.id ?? null;
  let confirmation: string | null = null;

  if (p.kind === "PICKUP") {
    await prisma.rentalBooking.update({ where: { id: b.id }, data: { status: "PICKUP_REQUESTED", pickupRequestedAt: new Date() } });
    confirmation = `Thanks! We have you down for a pickup of your ${b.category ? `${b.category} ` : ""}dumpster and will be in touch about timing.`;
  } else {
    if (!p.newEndAt) return { ok: false, error: "This suggestion has no new date." };
    // The unit must be free for the longer period.
    if (b.assetId) {
      const free = await availableAssets(companyId, b.category, b.startAt, p.newEndAt, b.id);
      if (!free.some((u) => u.id === b.assetId)) {
        return { ok: false, error: "That unit is booked by another customer in the extra time. Pick a different date or swap the unit first." };
      }
    }
    await prisma.rentalBooking.update({ where: { id: b.id }, data: { endAt: p.newEndAt } });
    const latest = await prisma.rentalBooking.aggregate({ where: { jobId: b.jobId, companyId, status: { not: "CANCELLED" } }, _max: { endAt: true } });
    await prisma.job.update({ where: { id: b.jobId }, data: { scheduledEndAt: latest._max.endAt ?? p.newEndAt } });
    await prisma.rentalProposal.updateMany({ where: { bookingId: b.id, status: "PENDING", id: { not: p.id }, kind: "EXTEND" }, data: { status: "DISMISSED" } });
    const cost = p.priceCents ? ` The ${p.extraDays} extra day${p.extraDays === 1 ? "" : "s"} will be ${formatCents(p.priceCents)} on your invoice.` : "";
    confirmation = `Got it! Your pickup is now ${whenText(p.newEndAt, company.timezone)}.${cost} Reply if anything changes.`;
  }

  await prisma.rentalProposal.update({ where: { id: p.id }, data: { status: "APPLIED" } });
  await prisma.rentalReminder.updateMany({ where: { bookingId: b.id, status: "DRAFT" }, data: { status: "DISMISSED", note: "Handled by the customer's reply." } });

  // Tell the customer what was done. A failure here must not undo the change.
  let note: string | undefined;
  const sent = await sendToCustomer({ companyId, customerId: b.job.customerId, body: confirmation, subject: "Your dumpster rental", estimateId });
  if (!sent.ok) note = `Applied, but the confirmation to the customer wasn't sent: ${sent.error}`;

  await refresh(b.jobId);
  return { ok: true, note };
}

export async function dismissProposal(proposalId: string): Promise<Result> {
  const { companyId } = await requireSession();
  const p = await prisma.rentalProposal.findFirst({ where: { id: proposalId, companyId, status: "PENDING" }, include: { booking: { select: { jobId: true } } } });
  if (!p) return { ok: false, error: "Suggestion not found." };
  await prisma.rentalProposal.update({ where: { id: p.id }, data: { status: "DISMISSED" } });
  await refresh(p.booking.jobId);
  return { ok: true };
}
