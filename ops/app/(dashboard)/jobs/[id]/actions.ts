"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { fromDatetimeLocalInTz } from "@/lib/tz";
import { normalizePhoto, MAX_PHOTOS } from "@/lib/photos";
import { getObjectBytes } from "@/lib/storage";

const JOB_STATUSES = ["UNSCHEDULED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
type JobStatusValue = (typeof JOB_STATUSES)[number];

export async function updateJob(jobId: string, formData: FormData) {
  const { companyId } = await requireSession();

  const status = String(formData.get("status") || "");
  const scheduledAtStr = String(formData.get("scheduledAt") || "");
  const notes = String(formData.get("notes") || "").trim();

  if (!JOB_STATUSES.includes(status as JobStatusValue)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const { timezone } = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  const scheduledAt = scheduledAtStr ? fromDatetimeLocalInTz(scheduledAtStr, timezone) : null;
  if (scheduledAtStr && !scheduledAt) throw new Error("That date and time isn't valid.");

  await prisma.job.updateMany({
    where: { id: jobId, companyId },
    data: {
      status: status as JobStatusValue,
      scheduledAt,
      scheduledEndAt: scheduledAt ? undefined : null,
      completedAt: status === "COMPLETED" ? new Date() : status === "CANCELLED" ? null : undefined,
      notes: notes || null,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
}

export async function createEstimateForJob(jobId: string) {
  const { companyId } = await requireSession();

  const job = await prisma.job.findFirst({ where: { id: jobId, companyId } });
  if (!job) throw new Error("Job not found");

  const estimate = await prisma.estimate.create({
    data: { companyId, customerId: job.customerId, propertyId: job.propertyId, jobId: job.id },
  });

  redirect(`/estimates/${estimate.id}`);
}

export async function addJobAttachments(
  jobId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const { companyId } = await requireSession();

  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId },
    include: { _count: { select: { attachments: true } } },
  });
  if (!job) return { ok: false, error: "Job not found." };

  const photoFiles = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (job._count.attachments + photoFiles.length > MAX_PHOTOS) {
    return { ok: false, error: `A job can have at most ${MAX_PHOTOS} photos.` };
  }

  let photos: { filename: string; mimeType: string; dataUrl: string }[];
  try {
    photos = (await Promise.all(photoFiles.map(normalizePhoto))).filter((p) => p !== null);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not process the uploaded photos." };
  }

  if (photos.length > 0) {
    await prisma.jobAttachment.createMany({
      data: photos.map((p) => ({
        companyId,
        jobId,
        filename: p.filename,
        mimeType: p.mimeType,
        dataUrl: p.dataUrl,
      })),
    });
  }

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

/** Copies a photo the customer emailed into the job's photos (shown on the estimate and the job). */
export async function saveEmailPhotoToJob(attachmentId: string, jobId: string): Promise<{ ok: boolean; error?: string }> {
  const { companyId } = await requireSession();
  const [file, job] = await Promise.all([
    prisma.communicationAttachment.findFirst({ where: { id: attachmentId, companyId } }),
    prisma.job.findFirst({ where: { id: jobId, companyId }, include: { _count: { select: { attachments: true } } } }),
  ]);
  if (!file || !job) return { ok: false, error: "Not found." };
  if (file.mimeType !== "image/jpeg") return { ok: false, error: "Only photos can be saved to the job." };
  if (job._count.attachments >= MAX_PHOTOS) return { ok: false, error: `A job can have at most ${MAX_PHOTOS} photos.` };

  const bytes = file.storageKey ? await getObjectBytes(file.storageKey) : file.data ? Buffer.from(file.data) : null;
  if (!bytes) return { ok: false, error: "The photo file is missing." };

  await prisma.jobAttachment.create({
    data: {
      companyId,
      jobId,
      filename: file.filename,
      mimeType: file.mimeType,
      dataUrl: `data:${file.mimeType};base64,${bytes.toString("base64")}`,
    },
  });
  revalidatePath(`/jobs/${jobId}`);
  const estimates = await prisma.estimate.findMany({ where: { jobId, companyId }, select: { id: true } });
  for (const e of estimates) revalidatePath(`/estimates/${e.id}`);
  return { ok: true };
}

export async function removeJobAttachment(jobId: string, attachmentId: string) {
  const { companyId } = await requireSession();
  await prisma.jobAttachment.deleteMany({ where: { id: attachmentId, jobId, companyId } });
  revalidatePath(`/jobs/${jobId}`);
}
