"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailgun";
import { lineItemsTotal, formatCents } from "@/lib/money";

const MAX_SIGNATURE_LENGTH = 400_000;

export async function signEstimate(
  token: string,
  input: { name: string; signatureDataUrl: string },
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Please type your full name." };
  if (
    !input.signatureDataUrl.startsWith("data:image/png;base64,") ||
    input.signatureDataUrl.length > MAX_SIGNATURE_LENGTH
  ) {
    return { ok: false, error: "Please draw your signature." };
  }

  const estimate = await prisma.estimate.findUnique({
    where: { publicToken: token },
    include: { customer: true, company: true, lineItems: true },
  });
  if (!estimate) return { ok: false, error: "This link is no longer valid." };
  if (estimate.status === "APPROVED") return { ok: true };
  if (estimate.status === "DECLINED" || estimate.status === "EXPIRED") {
    return { ok: false, error: "This estimate is no longer open for approval. Please contact us." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;

  // updateMany with a status guard so two simultaneous submits can't both win.
  const { count } = await prisma.estimate.updateMany({
    where: { id: estimate.id, status: { in: ["DRAFT", "SENT"] } },
    data: {
      status: "APPROVED",
      respondedAt: new Date(),
      signedAt: new Date(),
      signedName: name,
      signatureDataUrl: input.signatureDataUrl,
      signedIp: ip,
    },
  });
  if (count === 0) return { ok: true };

  if (estimate.company.email) {
    const total = Math.max(0, lineItemsTotal(estimate.lineItems) - estimate.discountCents);
    try {
      await sendEmail({
        to: estimate.company.email,
        fromName: estimate.company.name,
        subject: `Estimate #${estimate.number} approved by ${estimate.customer.firstName} ${estimate.customer.lastName}`,
        text: `${name} signed and approved estimate #${estimate.number} (${formatCents(total)}).`,
      });
    } catch {
      // Notification is best-effort; the approval itself already succeeded.
    }
  }

  revalidatePath(`/estimates/${estimate.id}`);
  if (estimate.jobId) revalidatePath(`/jobs/${estimate.jobId}`);
  return { ok: true };
}

export async function declineEstimate(token: string): Promise<{ ok: boolean; error?: string }> {
  const estimate = await prisma.estimate.findUnique({ where: { publicToken: token } });
  if (!estimate) return { ok: false, error: "This link is no longer valid." };
  await prisma.estimate.updateMany({
    where: { id: estimate.id, status: { in: ["DRAFT", "SENT"] } },
    data: { status: "DECLINED", respondedAt: new Date() },
  });
  revalidatePath(`/estimates/${estimate.id}`);
  return { ok: true };
}
