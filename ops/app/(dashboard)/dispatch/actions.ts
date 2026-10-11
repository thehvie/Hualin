"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

type Result = { ok: true } | { ok: false; error: string };

async function loadBooking(bookingId: string, companyId: string) {
  return prisma.rentalBooking.findFirst({ where: { id: bookingId, companyId }, include: { asset: true } });
}

async function refresh(jobId: string) {
  revalidatePath("/dispatch");
  revalidatePath("/fleet");
  revalidatePath("/schedule");
  revalidatePath(`/jobs/${jobId}`);
  const estimates = await prisma.estimate.findMany({ where: { jobId }, select: { id: true } });
  for (const e of estimates) revalidatePath(`/estimates/${e.id}`);
}

/** The dumpster is on the customer's site. */
export async function markDelivered(bookingId: string, placementNotes: string): Promise<Result> {
  const { companyId } = await requireSession();
  const b = await loadBooking(bookingId, companyId);
  if (!b) return { ok: false, error: "Rental not found." };
  if (b.status !== "RESERVED") return { ok: false, error: "This one has already been delivered." };
  if (!b.assetId) return { ok: false, error: "Assign a specific dumpster first (on the estimate's Dumpster rentals card)." };

  await prisma.rentalBooking.update({
    where: { id: b.id },
    data: { status: "DELIVERED", deliveredAt: new Date(), placementNotes: placementNotes.trim().slice(0, 1000) || null },
  });
  await prisma.rentalAsset.update({ where: { id: b.assetId }, data: { status: "ON_RENT" } });
  // The job is under way once its first dumpster is out.
  await prisma.job.updateMany({ where: { id: b.jobId, companyId, status: { in: ["UNSCHEDULED", "SCHEDULED"] } }, data: { status: "IN_PROGRESS" } });
  await refresh(b.jobId);
  return { ok: true };
}

/** The customer is done and wants it picked up. */
export async function requestPickup(bookingId: string): Promise<Result> {
  const { companyId } = await requireSession();
  const b = await loadBooking(bookingId, companyId);
  if (!b) return { ok: false, error: "Rental not found." };
  if (b.status !== "DELIVERED") return { ok: false, error: "Only a delivered dumpster can be marked for pickup." };
  await prisma.rentalBooking.update({ where: { id: b.id }, data: { status: "PICKUP_REQUESTED", pickupRequestedAt: new Date() } });
  await refresh(b.jobId);
  return { ok: true };
}

/** The dumpster is back: record the weight from the scale ticket, free the unit, and finish the job when all are back. */
export async function markPickedUp(bookingId: string, input: { weightTons: string; ticketNumber: string }): Promise<Result> {
  const { companyId } = await requireSession();
  const b = await loadBooking(bookingId, companyId);
  if (!b) return { ok: false, error: "Rental not found." };
  if (b.status !== "DELIVERED" && b.status !== "PICKUP_REQUESTED") return { ok: false, error: "This dumpster isn't out on a job." };

  const raw = input.weightTons.trim();
  const weight = raw ? parseFloat(raw) : null;
  if (raw && (!Number.isFinite(weight) || (weight as number) < 0 || (weight as number) > 100)) {
    return { ok: false, error: "Enter the weight in tons, like 1.8." };
  }

  await prisma.rentalBooking.update({
    where: { id: b.id },
    data: { status: "PICKED_UP", pickedUpAt: new Date(), weightTons: weight, ticketNumber: input.ticketNumber.trim().slice(0, 60) || null },
  });
  if (b.assetId) {
    await prisma.rentalAsset.updateMany({ where: { id: b.assetId, companyId, status: "ON_RENT" }, data: { status: "AVAILABLE" } });
  }

  const stillOut = await prisma.rentalBooking.count({
    where: { jobId: b.jobId, companyId, status: { in: ["RESERVED", "DELIVERED", "PICKUP_REQUESTED"] } },
  });
  if (stillOut === 0) {
    await prisma.job.updateMany({ where: { id: b.jobId, companyId, status: { not: "CANCELLED" } }, data: { status: "COMPLETED", completedAt: new Date() } });
  }
  await refresh(b.jobId);
  return { ok: true };
}

/** Steps a rental back one stage, for a tap on the wrong button. */
export async function undoRentalStep(bookingId: string): Promise<Result> {
  const { companyId } = await requireSession();
  const b = await loadBooking(bookingId, companyId);
  if (!b) return { ok: false, error: "Rental not found." };

  if (b.status === "PICKUP_REQUESTED") {
    await prisma.rentalBooking.update({ where: { id: b.id }, data: { status: "DELIVERED", pickupRequestedAt: null } });
  } else if (b.status === "DELIVERED") {
    await prisma.rentalBooking.update({ where: { id: b.id }, data: { status: "RESERVED", deliveredAt: null, placementNotes: null } });
    if (b.assetId) await prisma.rentalAsset.updateMany({ where: { id: b.assetId, companyId, status: "ON_RENT" }, data: { status: "AVAILABLE" } });
  } else if (b.status === "PICKED_UP") {
    await prisma.rentalBooking.update({ where: { id: b.id }, data: { status: "DELIVERED", pickedUpAt: null, weightTons: null, ticketNumber: null } });
    if (b.assetId) await prisma.rentalAsset.updateMany({ where: { id: b.assetId, companyId, status: "AVAILABLE" }, data: { status: "ON_RENT" } });
    await prisma.job.updateMany({ where: { id: b.jobId, companyId, status: "COMPLETED" }, data: { status: "IN_PROGRESS", completedAt: null } });
  } else {
    return { ok: false, error: "Nothing to undo." };
  }
  await refresh(b.jobId);
  return { ok: true };
}
