"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function markInvoicesSent(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.invoice.updateMany({
    where: { id: { in: ids }, status: { in: ["DRAFT", "SENT"] } },
    data: { status: "SENT", sentAt: new Date() },
  });
  revalidatePath("/invoices");
}

export async function deleteInvoices(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.invoice.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/invoices");
}

/**
 * Stage 1: no real delivery yet (Mailgun wiring lands in stage 2). Flags the
 * invoices as sent and reports how many could not actually be emailed.
 */
export async function sendInvoices(ids: string[]): Promise<{ sent: number; skipped: number }> {
  if (ids.length === 0) return { sent: 0, skipped: 0 };
  const result = await prisma.invoice.updateMany({
    where: { id: { in: ids }, status: { not: "VOID" } },
    data: { sentAt: new Date() },
  });
  await prisma.invoice.updateMany({
    where: { id: { in: ids }, status: "DRAFT" },
    data: { status: "SENT" },
  });
  revalidatePath("/invoices");
  return { sent: result.count, skipped: result.count };
}
