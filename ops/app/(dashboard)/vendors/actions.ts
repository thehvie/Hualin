"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { featureBlock } from "@/lib/plan-access";
import { formatPhone } from "@/lib/phone";

type Result = { ok: true } | { ok: false; error: string };

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const dollarsToCents = (v: unknown): number | null => {
  const t = String(v ?? "").replace(/[$,\s]/g, "");
  if (!t) return null;
  const n = Math.round(parseFloat(t) * 100);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export interface PartnerInput {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  serviceAreas: string;
  paymentTerms: string;
  partnerNotes: string;
}

function partnerData(input: PartnerInput) {
  return {
    contactName: clean(input.contactName, 120) || null,
    phone: formatPhone(clean(input.phone, 40)) || null,
    email: clean(input.email, 160) || null,
    serviceAreas: clean(input.serviceAreas, 1000) || null,
    paymentTerms: clean(input.paymentTerms, 120) || null,
    partnerNotes: clean(input.partnerNotes, 2000) || null,
  };
}

export async function createPartner(input: PartnerInput): Promise<Result> {
  const { companyId } = await requireSession();
  const blocked = await featureBlock(companyId, "RENTALS");
  if (blocked) return { ok: false, error: blocked };
  const name = clean(input.name, 120);
  if (!name) return { ok: false, error: "Vendor name is required." };
  await prisma.vendor.create({ data: { companyId, name, dumpsterPartner: true, ...partnerData(input) } });
  revalidatePath("/vendors");
  return { ok: true };
}

export async function updatePartner(id: string, input: PartnerInput): Promise<Result> {
  const { companyId } = await requireSession();
  const vendor = await prisma.vendor.findFirst({ where: { id, companyId } });
  if (!vendor) return { ok: false, error: "Vendor not found." };
  const name = clean(input.name, 120);
  if (!name) return { ok: false, error: "Vendor name is required." };
  await prisma.vendor.update({ where: { id }, data: { name, ...partnerData(input) } });
  revalidatePath("/vendors");
  return { ok: true };
}

/** Turns a vendor you already have (from purchase orders) into a dumpster partner, or takes it back off the list. */
export async function setPartner(id: string, partner: boolean): Promise<Result> {
  const { companyId } = await requireSession();
  const res = await prisma.vendor.updateMany({ where: { id, companyId }, data: { dumpsterPartner: partner } });
  if (res.count === 0) return { ok: false, error: "Vendor not found." };
  revalidatePath("/vendors");
  return { ok: true };
}

export interface RateInput {
  size: string;
  cost: string;
  sell: string;
  packageDays: string;
  includedTons: string;
  extraDay: string;
  overagePerTon: string;
  notes: string;
}

/** Adds a size for a partner, or replaces its rate if the size is already on the sheet. */
export async function saveRate(vendorId: string, input: RateInput): Promise<Result> {
  const { companyId } = await requireSession();
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, companyId } });
  if (!vendor) return { ok: false, error: "Vendor not found." };

  const size = clean(input.size, 40);
  if (!size) return { ok: false, error: "Enter a size, like 20 yd." };
  const costCents = dollarsToCents(input.cost);
  const sellCents = dollarsToCents(input.sell);
  if (costCents == null) return { ok: false, error: "Enter what the vendor charges you." };
  if (sellCents == null) return { ok: false, error: "Enter what you charge the customer." };

  const days = parseInt(input.packageDays, 10);
  const tons = parseFloat(input.includedTons);
  const data = {
    costCents,
    sellCents,
    packageDays: Number.isFinite(days) && days > 0 ? days : null,
    includedTons: Number.isFinite(tons) && tons > 0 ? tons : null,
    extraDayCents: dollarsToCents(input.extraDay),
    overageCentsPerTon: dollarsToCents(input.overagePerTon),
    notes: clean(input.notes, 500) || null,
  };
  await prisma.vendorRate.upsert({
    where: { vendorId_size: { vendorId, size } },
    create: { companyId, vendorId, size, ...data },
    update: data,
  });
  revalidatePath("/vendors");
  return { ok: true };
}

export async function deleteRate(id: string): Promise<Result> {
  const { companyId } = await requireSession();
  await prisma.vendorRate.deleteMany({ where: { id, companyId } });
  revalidatePath("/vendors");
  return { ok: true };
}
