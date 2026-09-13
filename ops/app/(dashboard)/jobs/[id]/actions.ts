"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

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

  await prisma.job.updateMany({
    where: { id: jobId, companyId },
    data: {
      status: status as JobStatusValue,
      scheduledAt: scheduledAtStr ? new Date(scheduledAtStr) : null,
      completedAt: status === "COMPLETED" ? new Date() : status === "CANCELLED" ? null : undefined,
      notes: notes || null,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
}
