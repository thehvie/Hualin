"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { featureBlock } from "@/lib/plan-access";

type Result = { ok: true } | { ok: false; error: string };

/** Gives a drop-off or a pickup to a driver, or takes it back (driverId null). */
export async function assignTask(bookingId: string, kind: "DELIVERY" | "PICKUP", driverId: string | null): Promise<Result> {
  const { companyId, role } = await requireSession();
  if (role !== "ADMIN" && role !== "DISPATCHER") return { ok: false, error: "Only an admin or dispatcher can assign drivers." };
  const blocked = await featureBlock(companyId, "RENTALS");
  if (blocked) return { ok: false, error: blocked };
  if (kind !== "DELIVERY" && kind !== "PICKUP") return { ok: false, error: "Unknown task." };

  const booking = await prisma.rentalBooking.findFirst({ where: { id: bookingId, companyId }, select: { id: true, jobId: true, status: true } });
  if (!booking) return { ok: false, error: "That stop no longer exists." };
  if (kind === "DELIVERY" && booking.status !== "RESERVED") return { ok: false, error: "This drop-off has already happened." };
  if (kind === "PICKUP" && booking.status !== "DELIVERED" && booking.status !== "PICKUP_REQUESTED") return { ok: false, error: "This pickup isn't due or has already happened." };

  if (driverId) {
    const driver = await prisma.driver.findFirst({ where: { id: driverId, companyId, active: true }, select: { id: true } });
    if (!driver) return { ok: false, error: "That driver isn't on the schedule." };
  }

  await prisma.rentalBooking.update({ where: { id: booking.id }, data: kind === "DELIVERY" ? { deliveryDriverId: driverId } : { pickupDriverId: driverId } });
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/assign");
  revalidatePath(`/jobs/${booking.jobId}`);
  return { ok: true };
}
