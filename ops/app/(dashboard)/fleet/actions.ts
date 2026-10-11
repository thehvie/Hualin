"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

type Result = { ok: true } | { ok: false; error: string };

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function createAsset(input: { label: string; category: string; notes: string }): Promise<Result> {
  const { companyId } = await requireSession();
  const label = clean(input.label, 40);
  if (!label) return { ok: false, error: "Give the unit a number or label, like D-12." };
  const exists = await prisma.rentalAsset.findFirst({ where: { companyId, label: { equals: label, mode: "insensitive" } } });
  if (exists) return { ok: false, error: `You already have a unit labeled ${exists.label}.` };

  await prisma.rentalAsset.create({
    data: { companyId, kind: "DUMPSTER", label, category: clean(input.category, 40) || null, notes: clean(input.notes, 1000) || null },
  });
  revalidatePath("/fleet");
  return { ok: true };
}

export async function updateAsset(
  id: string,
  input: { label: string; category: string; notes: string; status: "AVAILABLE" | "MAINTENANCE" | "RETIRED" },
): Promise<Result> {
  const { companyId } = await requireSession();
  const asset = await prisma.rentalAsset.findFirst({ where: { id, companyId } });
  if (!asset) return { ok: false, error: "Unit not found." };

  const label = clean(input.label, 40);
  if (!label) return { ok: false, error: "Give the unit a number or label." };
  const clash = await prisma.rentalAsset.findFirst({ where: { companyId, id: { not: id }, label: { equals: label, mode: "insensitive" } } });
  if (clash) return { ok: false, error: `You already have a unit labeled ${clash.label}.` };

  // A unit that's out on a customer's site stays "on rent" until it's picked up; it can't be switched by hand.
  const onRent = asset.status === "ON_RENT";
  await prisma.rentalAsset.update({
    where: { id },
    data: {
      label,
      category: clean(input.category, 40) || null,
      notes: clean(input.notes, 1000) || null,
      status: onRent ? "ON_RENT" : (["AVAILABLE", "MAINTENANCE", "RETIRED"].includes(input.status) ? input.status : asset.status),
    },
  });
  revalidatePath("/fleet");
  return { ok: true };
}

export async function deleteAsset(id: string): Promise<Result> {
  const { companyId } = await requireSession();
  const asset = await prisma.rentalAsset.findFirst({ where: { id, companyId }, include: { _count: { select: { bookings: true } } } });
  if (!asset) return { ok: false, error: "Unit not found." };
  if (asset._count.bookings > 0) return { ok: false, error: "This unit has rental history, so it can't be deleted. Mark it Retired instead." };
  await prisma.rentalAsset.delete({ where: { id } });
  revalidatePath("/fleet");
  return { ok: true };
}
