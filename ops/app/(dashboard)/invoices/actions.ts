"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function markInvoicesSent(ids: string[]) {
  if (ids.length === 0) return;
  const { companyId } = await requireSession();
  await prisma.invoice.updateMany({
    where: { id: { in: ids }, companyId, status: { in: ["DRAFT", "SENT"] } },
    data: { status: "SENT", sentAt: new Date() },
  });
  revalidatePath("/invoices");
}

export async function deleteInvoices(ids: string[]) {
  if (ids.length === 0) return;
  const { companyId } = await requireSession();
  await prisma.invoice.deleteMany({ where: { id: { in: ids }, companyId } });
  revalidatePath("/invoices");
}

/**
 * Stage 1: no real delivery yet (Mailgun wiring lands in stage 2). Flags the
 * invoices as sent and reports how many could not actually be emailed.
 */
export async function sendInvoices(ids: string[]): Promise<{ sent: number; skipped: number }> {
  if (ids.length === 0) return { sent: 0, skipped: 0 };
  const { companyId } = await requireSession();
  const result = await prisma.invoice.updateMany({
    where: { id: { in: ids }, companyId, status: { not: "VOID" } },
    data: { sentAt: new Date() },
  });
  await prisma.invoice.updateMany({
    where: { id: { in: ids }, companyId, status: "DRAFT" },
    data: { status: "SENT" },
  });
  revalidatePath("/invoices");
  return { sent: result.count, skipped: result.count };
}
