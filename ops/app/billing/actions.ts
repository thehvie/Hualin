"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Plan } from "@prisma/client";
import type Stripe from "stripe";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { officeUserCount } from "@/lib/plan-access";
import { PLANS, PLAN_ORDER, stripePriceId } from "@/lib/plans";
import { ensureStripeCustomer, seatsToBill, stripeBrandPriceId, stripeClient, stripeSeatPriceId, stripeSmsPackPriceId } from "@/lib/billing";

async function signedIn() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  return { companyId: session.user.companyId, email: session.user.email ?? null, role: session.user.role };
}

const back = (path: string, error?: string) => redirect(error ? `${path}?error=${encodeURIComponent(error)}` : path);

/** Starts a plan: Stripe Checkout for a new subscription, or an in-place change for an existing one. */
export async function choosePlan(plan: Plan, returnTo: string) {
  const { companyId, email, role } = await signedIn();
  if (role !== "ADMIN") back(returnTo, "Only an admin can change the plan.");
  if (!PLAN_ORDER.includes(plan)) back(returnTo, "Unknown plan.");

  const priceId = stripePriceId(plan);
  if (!priceId) back(returnTo, "That plan isn't available for purchase yet.");

  const officeUsers = await officeUserCount(companyId);
  if (!PLANS[plan].extraUsersAllowed && officeUsers > PLANS[plan].includedOfficeUsers) {
    back(returnTo, `${PLANS[plan].name} is for one user. Remove ${officeUsers - 1} user${officeUsers > 2 ? "s" : ""} first, or pick Base or Plus.`);
  }
  const seats = seatsToBill(plan, officeUsers);
  const seatPrice = stripeSeatPriceId();
  if (seats > 0 && !seatPrice) back(returnTo, "Extra users aren't available for purchase yet.");

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { stripeSubscriptionId: true, subscriptionStatus: true, plan: true } });
  const stripe = stripeClient();
  const base = process.env.NEXTAUTH_URL;

  const live = company.stripeSubscriptionId && ["ACTIVE", "PAST_DUE", "TRIALING"].includes(company.subscriptionStatus);
  if (live) {
    const sub = await stripe.subscriptions.retrieve(company.stripeSubscriptionId!);
    const planPrices = new Set(PLAN_ORDER.map((p) => stripePriceId(p)).filter(Boolean));
    const planItem = sub.items.data.find((i) => planPrices.has(i.price.id)) ?? sub.items.data.find((i) => i.price.id !== seatPrice);
    const seatItem = sub.items.data.find((i) => i.price.id === seatPrice);
    const items: Stripe.SubscriptionUpdateParams.Item[] = [planItem ? { id: planItem.id, price: priceId!, quantity: 1 } : { price: priceId!, quantity: 1 }];
    if (seats > 0) items.push(seatItem ? { id: seatItem.id, quantity: seats } : { price: seatPrice!, quantity: seats });
    else if (seatItem) items.push({ id: seatItem.id, deleted: true });
    await stripe.subscriptions.update(sub.id, { items, proration_behavior: "create_prorations" });
    // The webhook records the new plan; set it now too so the page is right on return.
    await prisma.company.update({ where: { id: companyId }, data: { plan } });
    back("/settings/plan?changed=1");
  }

  const customer = await ensureStripeCustomer(companyId, email);
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: priceId!, quantity: 1 }, ...(seats > 0 ? [{ price: seatPrice!, quantity: seats }] : [])],
    client_reference_id: companyId,
    metadata: { companyId, plan },
    subscription_data: { metadata: { companyId, plan } },
    success_url: `${base}/settings/plan?subscribed=1`,
    cancel_url: `${base}${returnTo}`,
  });
  if (!checkout.url) back(returnTo, "Could not start checkout. Please try again.");
  redirect(checkout.url!);
}

/** One-time $100 brand upgrade for Starter: own logo on documents and no "Powered by" line. */
export async function buyBrandUpgrade() {
  const { companyId, email, role } = await signedIn();
  const returnTo = "/settings/plan";
  if (role !== "ADMIN") back(returnTo, "Only an admin can buy the brand upgrade.");
  const price = stripeBrandPriceId();
  if (!price) back(returnTo, "The brand upgrade isn't available for purchase yet.");

  const customer = await ensureStripeCustomer(companyId, email);
  const checkout = await stripeClient().checkout.sessions.create({
    mode: "payment",
    customer,
    line_items: [{ price: price!, quantity: 1 }],
    client_reference_id: companyId,
    metadata: { companyId, kind: "brand_upgrade" },
    success_url: `${process.env.NEXTAUTH_URL}/settings/plan?brand=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}${returnTo}`,
  });
  if (!checkout.url) back(returnTo, "Could not start checkout. Please try again.");
  redirect(checkout.url!);
}

/** One-time pack of extra texts for Base and Plus; credits are added by the webhook once paid. */
export async function buyTextPack() {
  const { companyId, email, role } = await signedIn();
  const returnTo = "/settings/plan";
  if (role !== "ADMIN") back(returnTo, "Only an admin can buy texts.");
  const price = stripeSmsPackPriceId();
  if (!price) back(returnTo, "Text packs aren't available for purchase yet.");
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { plan: true, stripeSubscriptionId: true } });
  if (company.plan === "STARTER" || !company.stripeSubscriptionId) back(returnTo, "Texting comes with Base and Plus. Pick a plan first.");

  const customer = await ensureStripeCustomer(companyId, email);
  const checkout = await stripeClient().checkout.sessions.create({
    mode: "payment",
    customer,
    line_items: [{ price: price!, quantity: 1 }],
    client_reference_id: companyId,
    metadata: { companyId, kind: "sms_pack" },
    success_url: `${process.env.NEXTAUTH_URL}/settings/plan?texts=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}${returnTo}`,
  });
  if (!checkout.url) back(returnTo, "Could not start checkout. Please try again.");
  redirect(checkout.url!);
}

/** Stripe's hosted page: card on file, invoices, cancel. */
export async function openBillingPortal() {
  const { companyId, email, role } = await signedIn();
  if (role !== "ADMIN") back("/settings/plan", "Only an admin can manage billing.");
  const customer = await ensureStripeCustomer(companyId, email);
  let url: string;
  try {
    url = (await stripeClient().billingPortal.sessions.create({ customer, return_url: `${process.env.NEXTAUTH_URL}/settings/plan` })).url;
  } catch {
    back("/settings/plan", "The billing portal isn't set up yet.");
    return;
  }
  redirect(url);
}
