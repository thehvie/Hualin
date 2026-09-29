"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { geocodeAddress } from "@/lib/geocode";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const VALID_STATUSES = ["DRAFT", "SENT", "APPROVED", "DECLINED", "EXPIRED"] as const;
type EstimateStatus = (typeof VALID_STATUSES)[number];

export async function deleteEstimates(ids: string[]) {
  if (ids.length === 0) return;
  const { companyId } = await requireSession();
  await prisma.estimate.deleteMany({ where: { id: { in: ids }, companyId } });
  revalidatePath("/estimates");
}

export async function updateEstimatesStatus(ids: string[], status: string) {
  if (ids.length === 0) return;
  if (!VALID_STATUSES.includes(status as EstimateStatus)) {
    throw new Error(`Invalid status: ${status}`);
  }
  const { companyId } = await requireSession();
  await prisma.estimate.updateMany({
    where: { id: { in: ids }, companyId },
    data: { status: status as EstimateStatus },
  });
  revalidatePath("/estimates");
}

/**
 * Creates (optionally) a new customer + property, a Job holding the job details,
 * and a draft Estimate linked to that job, then opens the estimate editor.
 */
export async function createEstimateWithJob(formData: FormData): Promise<{ error: string } | void> {
  const { companyId } = await requireSession();

  const mode = String(formData.get("mode") || "existing");
  const jobNotes = String(formData.get("jobNotes") || "").trim();

  let customerId: string;
  let propertyId: string | null = null;

  if (mode === "new") {
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const companyName = String(formData.get("companyName") || "").trim();
    const addressLine1 = String(formData.get("addressLine1") || "").trim();
    const addressLine2 = String(formData.get("addressLine2") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const state = String(formData.get("state") || "").trim();
    const zip = String(formData.get("zip") || "").trim();

    if (!firstName || !lastName) return { error: "First and last name are required." };
    if (!email) return { error: "An email is required so we can send the estimate." };
    if (!addressLine1 || !city || !state) return { error: "The job address is required." };

    const geo = await geocodeAddress(`${addressLine1}, ${city}, ${state} ${zip}, US`);
    const customer = await prisma.customer.create({
      data: {
        companyId,
        firstName,
        lastName,
        companyName: companyName || null,
        email,
        phone: phone || null,
        source: "OTHER",
        properties: {
          create: {
            companyId,
            addressLine1,
            addressLine2: addressLine2 || null,
            city,
            state,
            zip,
            latitude: geo?.latitude ?? null,
            longitude: geo?.longitude ?? null,
          },
        },
      },
      include: { properties: true },
    });
    customerId = customer.id;
    propertyId = customer.properties[0]?.id ?? null;
  } else {
    const id = String(formData.get("customerId") || "");
    const customer = await prisma.customer.findFirst({
      where: { id, companyId },
      include: { properties: { take: 1, orderBy: { createdAt: "asc" } } },
    });
    if (!customer) return { error: "Please choose a customer." };
    customerId = customer.id;
    propertyId = customer.properties[0]?.id ?? null;
  }

  const job = await prisma.job.create({
    data: { companyId, customerId, propertyId, notes: jobNotes || null },
  });
  const estimate = await prisma.estimate.create({
    data: { companyId, customerId, propertyId, jobId: job.id },
  });

  redirect(`/estimates/${estimate.id}`);
}
