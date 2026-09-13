"use server";

import { prisma } from "@/lib/prisma";
import { slotsForDate, slotDateTime, MAX_JOBS_PER_SLOT } from "@/lib/booking";
import { normalizePhoto, MAX_PHOTOS } from "@/lib/photos";

export async function getAvailableSlots(
  companyId: string,
  dateIso: string,
): Promise<{ hour: number; label: string }[]> {
  const date = new Date(dateIso);
  const daySlots = slotsForDate(date);
  if (daySlots.length === 0) return [];

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const jobs = await prisma.job.findMany({
    where: { companyId, scheduledAt: { gte: dayStart, lte: dayEnd } },
    select: { scheduledAt: true },
  });

  const countByHour = new Map<number, number>();
  for (const j of jobs) {
    if (!j.scheduledAt) continue;
    const h = j.scheduledAt.getHours();
    countByHour.set(h, (countByHour.get(h) ?? 0) + 1);
  }

  return daySlots.filter((s) => (countByHour.get(s.hour) ?? 0) < MAX_JOBS_PER_SLOT);
}

export async function submitBooking(
  companyId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return { ok: false, error: "This booking page isn't available." };

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const addressLine1 = String(formData.get("address") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const zip = String(formData.get("zip") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const dateIso = String(formData.get("dateIso") || "");
  const hour = Number(formData.get("hour"));

  if (!firstName || !lastName || !email || !phone || !addressLine1 || !city || !state || !zip) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (!dateIso || Number.isNaN(hour)) {
    return { ok: false, error: "Please pick a date and time." };
  }

  const photoFiles = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photoFiles.length > MAX_PHOTOS) {
    return { ok: false, error: `Please attach at most ${MAX_PHOTOS} photos.` };
  }

  let photos: { filename: string; mimeType: string; dataUrl: string }[];
  try {
    photos = (await Promise.all(photoFiles.map(normalizePhoto))).filter((p) => p !== null);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not process the uploaded photos." };
  }

  const scheduledAt = slotDateTime(new Date(dateIso), hour);

  const conflictCount = await prisma.job.count({ where: { companyId, scheduledAt } });
  if (conflictCount >= MAX_JOBS_PER_SLOT) {
    return { ok: false, error: "That time slot was just booked by someone else — please pick another." };
  }

  let customer = await prisma.customer.findFirst({ where: { companyId, email } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { companyId, firstName, lastName, email, phone, source: "WEBSITE" },
    });
  }

  const property = await prisma.property.create({
    data: { companyId, customerId: customer.id, addressLine1, city, state, zip },
  });

  const job = await prisma.job.create({
    data: {
      companyId,
      customerId: customer.id,
      propertyId: property.id,
      status: "SCHEDULED",
      scheduledAt,
      notes: notes || null,
    },
  });

  if (photos.length > 0) {
    await prisma.jobAttachment.createMany({
      data: photos.map((p) => ({
        companyId,
        jobId: job.id,
        filename: p.filename,
        mimeType: p.mimeType,
        dataUrl: p.dataUrl,
      })),
    });
  }

  return { ok: true };
}
