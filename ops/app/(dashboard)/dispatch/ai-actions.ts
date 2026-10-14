"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { availableAssets } from "@/lib/rentals";
import { swapChargeCents } from "@/lib/rental-portal";
import { deliverReminder } from "@/lib/rental-reminders";
import { buildRequestContext, sendTemplateToCustomer } from "@/lib/customer-messages";

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
export async function applyProposal(proposalId: string, opts?: { waiveFee?: boolean }): Promise<Result> {
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
  const swapCents = p.kind === "SWAP" && !opts?.waiveFee ? await swapChargeCents(companyId, b.priceBookItemId) : 0;

  if (p.kind === "SWAP") {
    await prisma.rentalBooking.update({ where: { id: b.id }, data: { status: "PICKUP_REQUESTED", pickupRequestedAt: new Date(), swapRequested: true, swapFeeCents: swapCents } });
  } else if (p.kind === "PICKUP") {
    await prisma.rentalBooking.update({ where: { id: b.id }, data: { status: "PICKUP_REQUESTED", pickupRequestedAt: new Date() } });
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
  }

  await prisma.rentalProposal.update({ where: { id: p.id }, data: { status: "APPLIED" } });
  await prisma.rentalReminder.updateMany({ where: { bookingId: b.id, status: "DRAFT" }, data: { status: "DISMISSED", note: "Handled by the customer's reply." } });

  // Tell the customer what was done, with the company's approval template. A failure here must not undo the change.
  let note: string | undefined;
  try {
    const ctx = await buildRequestContext(b.id, companyId, { kind: p.kind, newEndAt: p.newEndAt, extraDays: p.extraDays, chargeCents: p.kind === "SWAP" ? swapCents : p.priceCents });
    const sent = await sendTemplateToCustomer({ companyId, customerId: ctx.customerId, key: "REQUEST_APPROVED", vars: ctx.vars, estimateId: ctx.estimateId });
    if (!sent.ok) note = `Applied, but the confirmation to the customer wasn't sent: ${sent.error}`;
  } catch (err) {
    console.error("[rental] approval message failed", err);
    note = "Applied, but the confirmation to the customer wasn't sent.";
  }

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

/** Owner turns a customer's request down. The customer gets the decline template, with the reason if one is given. */
export async function declineProposal(proposalId: string, reason: string): Promise<Result> {
  const { companyId } = await requireSession();
  const p = await prisma.rentalProposal.findFirst({ where: { id: proposalId, companyId, status: "PENDING" }, include: { booking: { select: { id: true, jobId: true } } } });
  if (!p) return { ok: false, error: "This request is no longer pending." };
  await prisma.rentalProposal.update({ where: { id: p.id }, data: { status: "DISMISSED" } });

  let note: string | undefined;
  try {
    const ctx = await buildRequestContext(p.booking.id, companyId, { kind: p.kind, newEndAt: p.newEndAt, extraDays: p.extraDays, reason: reason.slice(0, 300) });
    const sent = await sendTemplateToCustomer({ companyId, customerId: ctx.customerId, key: "REQUEST_DECLINED", vars: ctx.vars, estimateId: ctx.estimateId });
    if (!sent.ok) note = `Declined, but the customer wasn't told: ${sent.error}`;
  } catch (err) {
    console.error("[rental] decline message failed", err);
    note = "Declined, but the customer wasn't told.";
  }
  await refresh(p.booking.jobId);
  return { ok: true, note };
}
