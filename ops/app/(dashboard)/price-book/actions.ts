"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

function toCents(value: string): number {
  const n = Math.round(parseFloat(value || "0") * 100);
  return Number.isFinite(n) ? n : 0;
}

function readFields(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const type = String(formData.get("type") || "SERVICE") as "SERVICE" | "MATERIAL" | "RENTAL";
  const category = String(formData.get("category") || "").trim();
  const modelNumber = String(formData.get("modelNumber") || "").trim();
  const unitPriceCents = toCents(String(formData.get("unitPrice") || "0"));
  const costRaw = String(formData.get("cost") || "").trim();
  const costCents = costRaw ? toCents(costRaw) : null;
  const bookable = formData.get("bookable") === "on";
  const bookingPriceRaw = String(formData.get("bookingPrice") || "").trim();
  const bookingPriceCents = bookable && bookingPriceRaw ? toCents(bookingPriceRaw) : null;
  const active = formData.get("active") === "on";

  // Dumpster-style rental package; only kept for rentals.
  const isRental = type === "RENTAL";
  const intOrNull = (key: string) => {
    const raw = String(formData.get(key) || "").trim();
    const n = Math.round(parseFloat(raw));
    return isRental && raw && Number.isFinite(n) && n >= 0 ? n : null;
  };
  const floatOrNull = (key: string) => {
    const raw = String(formData.get(key) || "").trim();
    const n = parseFloat(raw);
    return isRental && raw && Number.isFinite(n) && n >= 0 ? n : null;
  };
  const centsOrNull = (key: string) => {
    const raw = String(formData.get(key) || "").trim();
    return isRental && raw ? toCents(raw) : null;
  };
  const assetCategory = String(formData.get("assetCategory") || "").trim();

  return {
    packageDays: intOrNull("packageDays"),
    extraDayCents: centsOrNull("extraDay"),
    includedTons: floatOrNull("includedTons"),
    overageCentsPerTon: centsOrNull("overagePerTon"),
    assetCategory: isRental && assetCategory ? assetCategory : null,
    name,
    description: description || null,
    type,
    category: category || null,
    modelNumber: modelNumber || null,
    unitPriceCents,
    costCents,
    bookable,
    bookingPriceCents,
    active,
  };
}

export async function createPriceBookItem(formData: FormData) {
  const { companyId } = await requireSession();
  const fields = readFields(formData);
  if (!fields.name) return;

  await prisma.priceBookItem.create({ data: { ...fields, companyId } });
  revalidatePath("/price-book");
}

export async function updatePriceBookItem(id: string, formData: FormData) {
  const { companyId } = await requireSession();
  const fields = readFields(formData);
  if (!fields.name) return;

  await prisma.priceBookItem.updateMany({ where: { id, companyId }, data: fields });
  revalidatePath("/price-book");
}

/** Archived items stay on old estimates and invoices but can't be added to new ones. */
export async function setPriceBookItemActive(id: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const { companyId } = await requireSession();
  const res = await prisma.priceBookItem.updateMany({ where: { id, companyId }, data: { active } });
  if (res.count === 0) return { ok: false, error: "Item not found." };
  revalidatePath("/price-book");
  return { ok: true };
}

/** Deletes an item nothing refers to. Anything already used on a document, plan or rental has to be archived instead. */
export async function deletePriceBookItem(id: string): Promise<{ ok: boolean; error?: string }> {
  const { companyId } = await requireSession();
  const item = await prisma.priceBookItem.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!item) return { ok: false, error: "Item not found." };

  const [estimateLines, invoiceLines, plans, rentals] = await Promise.all([
    prisma.estimateLineItem.count({ where: { priceBookItemId: id } }),
    prisma.invoiceLineItem.count({ where: { priceBookItemId: id } }),
    prisma.servicePlan.count({ where: { jobTypeId: id } }),
    prisma.rentalBooking.count({ where: { companyId, priceBookItemId: id } }),
  ]);
  const used = estimateLines + invoiceLines + plans + rentals;
  if (used > 0) {
    return { ok: false, error: `This item is used on ${used} estimate, invoice, plan or rental record${used === 1 ? "" : "s"}, so it can't be deleted. Archive it instead.` };
  }
  await prisma.priceBookItem.deleteMany({ where: { id, companyId } });
  revalidatePath("/price-book");
  return { ok: true };
}
