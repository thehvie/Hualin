"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["DRAFT", "SENT", "APPROVED", "DECLINED", "EXPIRED"] as const;
type EstimateStatus = (typeof VALID_STATUSES)[number];

export async function deleteEstimates(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.estimate.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/estimates");
}

export async function updateEstimatesStatus(ids: string[], status: string) {
  if (ids.length === 0) return;
  if (!VALID_STATUSES.includes(status as EstimateStatus)) {
    throw new Error(`Invalid status: ${status}`);
  }
  await prisma.estimate.updateMany({
    where: { id: { in: ids } },
    data: { status: status as EstimateStatus },
  });
  revalidatePath("/estimates");
}
