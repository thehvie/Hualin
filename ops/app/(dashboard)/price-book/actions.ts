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
  const type = String(formData.get("type") || "SERVICE") as "SERVICE" | "MATERIAL";
  const category = String(formData.get("category") || "").trim();
  const modelNumber = String(formData.get("modelNumber") || "").trim();
  const unitPriceCents = toCents(String(formData.get("unitPrice") || "0"));
  const costRaw = String(formData.get("cost") || "").trim();
  const costCents = costRaw ? toCents(costRaw) : null;
  const bookable = formData.get("bookable") === "on";
  const bookingPriceRaw = String(formData.get("bookingPrice") || "").trim();
  const bookingPriceCents = bookable && bookingPriceRaw ? toCents(bookingPriceRaw) : null;
  const active = formData.get("active") === "on";

  return {
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

export async function deletePriceBookItem(id: string) {
  const { companyId } = await requireSession();
  await prisma.priceBookItem.deleteMany({ where: { id, companyId } });
  revalidatePath("/price-book");
}
