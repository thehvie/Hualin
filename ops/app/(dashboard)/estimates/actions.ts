"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { geocodeAddress } from "@/lib/geocode";
import { prisma } from "@/lib/prisma";
import { normalizePhoto, MAX_PHOTOS } from "@/lib/photos";
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

export interface BuilderItem {
  priceBookItemId: string | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
  costCents: number | null;
  isRental: boolean;
}

export interface BuilderPayload {
  mode: "new" | "existing";
  customerId?: string;
  customer?: {
    firstName: string;
    lastName: string;
    companyName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zip: string;
  };
  jobNotes: string;
  items: BuilderItem[];
}

/**
 * Saves a whole estimate built on the "new estimate" screen in one go: creates the
 * customer + property if it's a new customer, a Job holding the job details, and the
 * Estimate with its line items, then opens the estimate editor.
 */
export async function createEstimateFromBuilder(
  payload: BuilderPayload,
  photoData?: FormData,
): Promise<{ error: string } | void> {
  const { companyId } = await requireSession();

  // Validate photos up front so a bad file does not leave a half-created customer behind.
  const photoFiles = (photoData?.getAll("photos") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (photoFiles.length > MAX_PHOTOS) return { error: `Please attach at most ${MAX_PHOTOS} photos.` };
  let photos: { filename: string; mimeType: string; dataUrl: string }[];
  try {
    photos = (await Promise.all(photoFiles.map(normalizePhoto))).filter((p) => p !== null);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not process the uploaded photos." };
  }

  const jobNotes = String(payload.jobNotes || "").trim().slice(0, 5000);

  let customerId: string;
  let propertyId: string | null = null;

  if (payload.mode === "new") {
    const c = payload.customer;
    if (!c) return { error: "Enter the customer's details." };
    const firstName = String(c.firstName || "").trim();
    const lastName = String(c.lastName || "").trim();
    const email = String(c.email || "").trim();
    const phone = String(c.phone || "").trim();
    const companyName = String(c.companyName || "").trim();
    const addressLine1 = String(c.addressLine1 || "").trim();
    const addressLine2 = String(c.addressLine2 || "").trim();
    const city = String(c.city || "").trim();
    // The company works in one state (Settings), so use it; only fall back to the form value if unset.
    const companyState = (await prisma.company.findUnique({ where: { id: companyId }, select: { state: true } }))?.state;
    const state = companyState || String(c.state || "").trim();
    const zip = String(c.zip || "").trim();

    if (!firstName || !lastName) return { error: "First and last name are required." };
    if (!addressLine1 || !city || !state) return { error: "The job address is required." };

    const geo = await geocodeAddress(`${addressLine1}, ${city}, ${state} ${zip}, US`);
    const customer = await prisma.customer.create({
      data: {
        companyId,
        firstName,
        lastName,
        companyName: companyName || null,
        email: email || null,
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
    const customer = await prisma.customer.findFirst({
      where: { id: String(payload.customerId || ""), companyId },
      include: { properties: { take: 1, orderBy: { createdAt: "asc" } } },
    });
    if (!customer) return { error: "Please choose a customer." };
    customerId = customer.id;
    propertyId = customer.properties[0]?.id ?? null;
  }

  const pbIds = payload.items.map((i) => i.priceBookItemId).filter((x): x is string => !!x);
  const validPb = new Set(
    (await prisma.priceBookItem.findMany({ where: { id: { in: pbIds }, companyId }, select: { id: true } })).map((p) => p.id),
  );
  const items = payload.items
    .map((i, sortOrder) => ({
      companyId,
      priceBookItemId: i.priceBookItemId && validPb.has(i.priceBookItemId) ? i.priceBookItemId : null,
      description: String(i.description || "").trim().slice(0, 300),
      quantity: Math.max(1, Math.min(9999, Math.floor(Number(i.quantity)) || 1)),
      unitPriceCents: Math.max(0, Math.round(Number(i.unitPriceCents)) || 0),
      costCents: i.costCents == null ? null : Math.max(0, Math.round(Number(i.costCents)) || 0),
      isRental: !!i.isRental,
      sortOrder,
    }))
    .filter((i) => i.description);

  const job = await prisma.job.create({
    data: { companyId, customerId, propertyId, notes: jobNotes || null },
  });
  const estimate = await prisma.estimate.create({
    data: { companyId, customerId, propertyId, jobId: job.id, notes: jobNotes || null, lineItems: { create: items } },
  });
  if (photos.length > 0) {
    await prisma.jobAttachment.createMany({
      data: photos.map((p) => ({ companyId, jobId: job.id, filename: p.filename, mimeType: p.mimeType, dataUrl: p.dataUrl })),
    });
  }

  revalidatePath("/estimates");
  redirect(`/estimates/${estimate.id}`);
}

export interface VoiceDraftPayload {
  /** Set when the dictated phone/email matched a customer already in the database. */
  existingCustomerId?: string;
  customer: NonNullable<BuilderPayload["customer"]>;
  jobNotes: string;
}

/**
 * Accepts the reviewed voice intake: saves the customer (or reuses the matched one),
 * creates the Job with the dictated description and an empty draft Estimate, then opens
 * the estimate editor so photos and services can be added.
 */
export async function createDraftFromVoice(payload: VoiceDraftPayload): Promise<{ error: string } | void> {
  const { companyId } = await requireSession();
  const jobNotes = String(payload.jobNotes || "").trim().slice(0, 5000);

  let customerId: string;
  let propertyId: string | null = null;

  const existing = payload.existingCustomerId
    ? await prisma.customer.findFirst({
        where: { id: payload.existingCustomerId, companyId },
        include: { properties: { take: 1, orderBy: { createdAt: "asc" } } },
      })
    : null;

  if (existing) {
    customerId = existing.id;
    propertyId = existing.properties[0]?.id ?? null;
  } else {
    const c = payload.customer;
    const firstName = String(c.firstName || "").trim();
    const lastName = String(c.lastName || "").trim();
    const addressLine1 = String(c.addressLine1 || "").trim();
    const city = String(c.city || "").trim();
    const companyState = (await prisma.company.findUnique({ where: { id: companyId }, select: { state: true } }))?.state;
    const state = companyState || String(c.state || "").trim();
    const zip = String(c.zip || "").trim();

    if (!firstName || !lastName) return { error: "First and last name are required." };
    if (!addressLine1 || !city || !state) return { error: "The job address is required." };

    const geo = await geocodeAddress(`${addressLine1}, ${city}, ${state} ${zip}, US`);
    const customer = await prisma.customer.create({
      data: {
        companyId,
        firstName,
        lastName,
        companyName: String(c.companyName || "").trim() || null,
        email: String(c.email || "").trim() || null,
        phone: String(c.phone || "").trim() || null,
        source: "OTHER",
        properties: {
          create: {
            companyId,
            addressLine1,
            addressLine2: String(c.addressLine2 || "").trim() || null,
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
  }

  const job = await prisma.job.create({ data: { companyId, customerId, propertyId, notes: jobNotes || null } });
  const estimate = await prisma.estimate.create({
    data: { companyId, customerId, propertyId, jobId: job.id, notes: jobNotes || null },
  });

  revalidatePath("/estimates");
  revalidatePath("/customers");
  redirect(`/estimates/${estimate.id}`);
}
