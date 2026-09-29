"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { sendEmail, MailgunNotConfiguredError } from "@/lib/mailgun";
import { formatCents } from "@/lib/money";
import { poTotalCents } from "@/lib/purchase-orders";
import { newPublicToken } from "@/lib/estimate-signing";

interface VendorSummary {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
}

const STATUSES = ["DRAFT", "SENT", "RECEIVED", "CANCELLED"] as const;
type Status = (typeof STATUSES)[number];

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

function toCents(value: string | number): number {
  const n = Math.round(parseFloat(String(value || "0")) * 100);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function str(fd: FormData, key: string): string | null {
  return String(fd.get(key) || "").trim() || null;
}

// ── Vendors ────────────────────────────────────────────────────────────────

export async function createVendor(
  formData: FormData,
): Promise<{ ok: true; vendor: VendorSummary } | { ok: false; error: string }> {
  const { companyId } = await requireSession();
  const name = str(formData, "name");
  if (!name) return { ok: false, error: "Vendor name is required." };

  const vendor = await prisma.vendor.create({
    data: {
      companyId,
      name,
      addressLine1: str(formData, "addressLine1"),
      city: str(formData, "city"),
      state: str(formData, "state"),
      zip: str(formData, "zip"),
      phone: str(formData, "phone"),
      phoneExt: str(formData, "phoneExt"),
      secondaryPhone: str(formData, "secondaryPhone"),
      email: str(formData, "email"),
      secondaryEmail: str(formData, "secondaryEmail"),
      contactName: str(formData, "contactName"),
      contactTitle: str(formData, "contactTitle"),
      paymentTerms: str(formData, "paymentTerms"),
    },
  });
  revalidatePath("/purchase-orders");
  return {
    ok: true,
    vendor: {
      id: vendor.id,
      name: vendor.name,
      contactName: vendor.contactName,
      phone: vendor.phone,
      email: vendor.email,
    },
  };
}

export async function setVendorActive(vendorId: string, active: boolean) {
  const { companyId } = await requireSession();
  await prisma.vendor.updateMany({ where: { id: vendorId, companyId }, data: { active } });
  revalidatePath("/purchase-orders");
}

// ── Purchase orders ────────────────────────────────────────────────────────

interface LineItemInput {
  name: string;
  cost: string;
  quantity: number;
  jobId: string | null;
}

async function readAttachments(formData: FormData) {
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_ATTACHMENTS) throw new Error(`Attach at most ${MAX_ATTACHMENTS} files.`);
  return Promise.all(
    files.map(async (f) => {
      if (!ALLOWED_TYPES.includes(f.type)) throw new Error(`"${f.name}" must be a PDF, JPEG or PNG.`);
      if (f.size > MAX_ATTACHMENT_BYTES) throw new Error(`"${f.name}" is over 5MB.`);
      const buf = Buffer.from(await f.arrayBuffer());
      return { filename: f.name, mimeType: f.type, dataUrl: `data:${f.type};base64,${buf.toString("base64")}` };
    }),
  );
}

/**
 * Creates a purchase order from the two-step wizard. With intent "send" it is
 * emailed to the vendor straight away and marked Sent; otherwise it's a Draft.
 */
export async function createPurchaseOrder(
  formData: FormData,
): Promise<{ ok: true; id: string; emailNote?: string } | { ok: false; error: string }> {
  const { companyId, userId } = await requireSession();

  const vendorId = String(formData.get("vendorId") || "");
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, companyId } });
  if (!vendor) return { ok: false, error: "Please choose a vendor." };

  let items: LineItemInput[] = [];
  try {
    items = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    items = [];
  }
  items = items.filter((i) => i && String(i.name || "").trim());
  if (items.length === 0) return { ok: false, error: "Add at least one item." };

  const jobIds = [...new Set(items.map((i) => i.jobId).filter((j): j is string => !!j))];
  if (jobIds.length > 0) {
    const found = await prisma.job.count({ where: { id: { in: jobIds }, companyId } });
    if (found !== jobIds.length) return { ok: false, error: "One of the selected jobs no longer exists." };
  }

  let attachments;
  try {
    attachments = await readAttachments(formData);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not read the attachments." };
  }

  const fulfillment = String(formData.get("fulfillment")) === "PICKUP" ? "PICKUP" : "DELIVERY";
  const orderDateStr = String(formData.get("orderDate") || "");
  const expectedStr = String(formData.get("expectedDate") || "");

  const po = await prisma.purchaseOrder.create({
    data: {
      companyId,
      vendorId: vendor.id,
      requestedById: userId,
      publicToken: newPublicToken(),
      orderDate: orderDateStr ? new Date(orderDateStr + "T12:00:00") : new Date(),
      fulfillment,
      expectedDate: expectedStr ? new Date(expectedStr + "T12:00:00") : null,
      deliveryAddressLine1: fulfillment === "DELIVERY" ? str(formData, "deliveryAddressLine1") : null,
      deliveryCity: fulfillment === "DELIVERY" ? str(formData, "deliveryCity") : null,
      deliveryState: fulfillment === "DELIVERY" ? str(formData, "deliveryState") : null,
      deliveryZip: fulfillment === "DELIVERY" ? str(formData, "deliveryZip") : null,
      notes: str(formData, "notes"),
      lineItems: {
        create: items.map((i, idx) => ({
          companyId,
          name: String(i.name).trim(),
          costCents: toCents(i.cost),
          quantity: Math.max(1, Math.min(99999, Math.floor(Number(i.quantity)) || 1)),
          jobId: i.jobId || null,
          sortOrder: idx,
        })),
      },
      attachments: { create: attachments.map((a) => ({ companyId, ...a })) },
    },
  });

  revalidatePath("/purchase-orders");

  if (String(formData.get("intent")) === "send") {
    const res = await emailPurchaseOrder(po.id, companyId);
    return { ok: true, id: po.id, emailNote: res.ok ? undefined : res.error };
  }
  return { ok: true, id: po.id };
}

async function emailPurchaseOrder(poId: string, companyId: string): Promise<{ ok: boolean; error?: string }> {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, companyId },
    include: { vendor: true, company: true, lineItems: { orderBy: { sortOrder: "asc" } }, requestedBy: true },
  });
  if (!po) return { ok: false, error: "Purchase order not found." };
  const publicToken = po.publicToken ?? newPublicToken();
  if (!po.publicToken) {
    await prisma.purchaseOrder.update({ where: { id: po.id }, data: { publicToken } });
  }
  const origin = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  if (!po.vendor.email) return { ok: false, error: "This vendor has no email address on file — the PO was saved but not sent." };

  const total = poTotalCents(po.lineItems);
  const lines = po.lineItems.map(
    (li) => `  ${li.quantity} x ${li.name} @ ${formatCents(li.costCents)} = ${formatCents(li.costCents * li.quantity)}`,
  );
  const fulfil =
    po.fulfillment === "PICKUP"
      ? "Pickup"
      : `Delivery to: ${[po.deliveryAddressLine1, po.deliveryCity, [po.deliveryState, po.deliveryZip].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", ") || "(address to be confirmed)"}`;

  const text = [
    `Hello ${po.vendor.contactName || po.vendor.name},`,
    "",
    `${po.company.name} would like to place purchase order #${po.number}.`,
    "",
    "Items:",
    ...lines,
    "",
    `Total: ${formatCents(total)}`,
    `${fulfil}`,
    po.expectedDate
      ? `Needed by: ${po.expectedDate.toLocaleDateString("en-US", { dateStyle: "medium" })}`
      : "",
    po.notes ? `\nNotes: ${po.notes}` : "",
    po.vendor.paymentTerms ? `\nPayment terms: ${po.vendor.paymentTerms}` : "",
    "",
    "Download the purchase order (PDF):",
    `${origin}/po/${publicToken}/pdf`,
    "",
    "Please confirm receipt of this order.",
    po.company.name,
    po.company.phone ?? "",
  ]
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n");

  try {
    await sendEmail({
      to: po.vendor.email,
      fromName: po.company.name,
      replyTo: po.company.email ?? undefined,
      subject: `Purchase order #${po.number} from ${po.company.name}`,
      text,
    });
  } catch (err) {
    if (err instanceof MailgunNotConfiguredError) {
      await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: "SENT", sentAt: new Date() } });
      return { ok: false, error: "Marked as sent, but email isn't configured so nothing went out." };
    }
    return { ok: false, error: "The PO was saved but the email couldn't be sent. Try Resend from the PO page." };
  }

  await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: "SENT", sentAt: new Date() } });
  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${po.id}`);
  return { ok: true };
}

export async function sendPurchaseOrder(poId: string): Promise<{ ok: boolean; error?: string }> {
  const { companyId } = await requireSession();
  return emailPurchaseOrder(poId, companyId);
}

export async function updatePurchaseOrderStatus(poId: string, status: string) {
  if (!STATUSES.includes(status as Status)) throw new Error(`Invalid status: ${status}`);
  const { companyId } = await requireSession();
  await prisma.purchaseOrder.updateMany({
    where: { id: poId, companyId },
    data: {
      status: status as Status,
      receivedAt: status === "RECEIVED" ? new Date() : undefined,
    },
  });
  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${poId}`);
}

export async function deletePurchaseOrder(poId: string) {
  const { companyId } = await requireSession();
  await prisma.purchaseOrder.deleteMany({ where: { id: poId, companyId, status: { in: ["DRAFT", "CANCELLED"] } } });
  redirect("/purchase-orders");
}
