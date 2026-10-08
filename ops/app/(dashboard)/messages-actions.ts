"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

/** Staff confirm that a held inbound email really is from the customer, which reveals its attachments. */
export async function confirmSender(communicationId: string): Promise<{ ok: boolean }> {
  const { companyId } = await requireSession();
  const message = await prisma.communication.findFirst({
    where: { id: communicationId, companyId, direction: "INBOUND" },
    select: { id: true, estimateId: true, invoiceId: true },
  });
  if (!message) return { ok: false };
  await prisma.communication.update({ where: { id: message.id }, data: { senderVerified: true } });
  if (message.estimateId) revalidatePath(`/estimates/${message.estimateId}`);
  if (message.invoiceId) revalidatePath(`/invoices/${message.invoiceId}`);
  return { ok: true };
}
