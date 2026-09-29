"use server";

import Stripe from "stripe";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { amountCentsForFrequency, stripeRecurringInterval } from "@/lib/service-plans";
import type { ServicePlanBillingFrequency, ServicePlanDurationUnit } from "@prisma/client";

function toCents(value: string): number {
  const n = Math.round(parseFloat(value || "0") * 100);
  return Number.isFinite(n) ? n : 0;
}

interface BillingOptionInput {
  frequency: ServicePlanBillingFrequency;
  discountPercent: number | null;
}

function readFields(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const scopeOfWork = String(formData.get("scopeOfWork") || "").trim();
  const durationValue = Math.max(1, parseInt(String(formData.get("durationValue") || "1"), 10) || 1);
  const durationUnitRaw = String(formData.get("durationUnit") || "YEAR");
  if (!["DAY", "WEEK", "MONTH", "YEAR"].includes(durationUnitRaw)) throw new Error("Invalid duration unit.");
  const durationUnit = durationUnitRaw as ServicePlanDurationUnit;
  const autoRenew = formData.get("autoRenew") === "on";
  const visitsPerPeriod = Math.max(1, parseInt(String(formData.get("visitsPerPeriod") || "1"), 10) || 1);
  const jobTypeId = String(formData.get("jobTypeId") || "").trim() || null;
  const priceCents = toCents(String(formData.get("price") || "0"));

  let billingOptions: BillingOptionInput[] = [];
  try {
    billingOptions = JSON.parse(String(formData.get("billingOptions") || "[]"));
  } catch {
    billingOptions = [];
  }

  return { name, scopeOfWork: scopeOfWork || null, durationValue, durationUnit, autoRenew, visitsPerPeriod, jobTypeId, priceCents, billingOptions };
}

async function syncStripeProduct(stripe: Stripe, name: string, existingProductId: string | null): Promise<string> {
  if (existingProductId) {
    await stripe.products.update(existingProductId, { name });
    return existingProductId;
  }
  const product = await stripe.products.create({ name });
  return product.id;
}

async function syncStripePrice(
  stripe: Stripe,
  productId: string,
  amountCents: number,
  frequency: ServicePlanBillingFrequency,
  existingPriceId: string | null,
): Promise<string> {
  if (existingPriceId) {
    const existing = await stripe.prices.retrieve(existingPriceId);
    if (existing.unit_amount === amountCents) return existingPriceId;
    await stripe.prices.update(existingPriceId, { active: false });
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amountCents,
    currency: "usd",
    recurring: stripeRecurringInterval(frequency),
  });
  return price.id;
}

export async function saveServicePlan(
  planId: string | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const { companyId } = await requireSession();
  const fields = readFields(formData);

  if (!fields.name) return { ok: false, error: "Plan name is required." };
  if (fields.billingOptions.length === 0) return { ok: false, error: "Add at least one billing option." };

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Stripe isn't configured — set STRIPE_SECRET_KEY." };
  const stripe = new Stripe(secretKey);

  const existing = planId
    ? await prisma.servicePlan.findFirst({ where: { id: planId, companyId }, include: { billingOptions: true } })
    : null;
  if (planId && !existing) return { ok: false, error: "Plan not found." };

  const stripeProductId = await syncStripeProduct(stripe, fields.name, existing?.stripeProductId ?? null);

  const billingOptionsData = await Promise.all(
    fields.billingOptions.map(async (opt, i) => {
      const amountCents = amountCentsForFrequency(fields.priceCents, fields.durationValue, fields.durationUnit, opt.frequency);
      const existingOpt = existing?.billingOptions.find((b) => b.frequency === opt.frequency);
      const stripePriceId = await syncStripePrice(stripe, stripeProductId, amountCents, opt.frequency, existingOpt?.stripePriceId ?? null);
      return {
        frequency: opt.frequency,
        discountPercent: opt.discountPercent,
        amountCents,
        stripePriceId,
        sortOrder: i,
      };
    }),
  );

  const planData = {
    companyId,
    name: fields.name,
    scopeOfWork: fields.scopeOfWork,
    durationValue: fields.durationValue,
    durationUnit: fields.durationUnit,
    autoRenew: fields.autoRenew,
    visitsPerPeriod: fields.visitsPerPeriod,
    jobTypeId: fields.jobTypeId,
    priceCents: fields.priceCents,
    stripeProductId,
  };

  if (existing) {
    await prisma.$transaction([
      prisma.servicePlan.update({ where: { id: existing.id }, data: planData }),
      prisma.servicePlanBillingOption.deleteMany({ where: { servicePlanId: existing.id } }),
      prisma.servicePlanBillingOption.createMany({
        data: billingOptionsData.map((b) => ({ ...b, servicePlanId: existing.id })),
      }),
    ]);
  } else {
    await prisma.servicePlan.create({
      data: { ...planData, billingOptions: { create: billingOptionsData } },
    });
  }

  revalidatePath("/service-plans/manager");
  return { ok: true };
}

export async function setServicePlanArchived(planId: string, archived: boolean) {
  const { companyId } = await requireSession();
  await prisma.servicePlan.updateMany({ where: { id: planId, companyId }, data: { archived } });
  revalidatePath("/service-plans/manager");
}
