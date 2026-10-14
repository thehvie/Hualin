import Stripe from "stripe";
import type { Plan } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { officeUserCount } from "@/lib/plan-access";
import { PLANS } from "@/lib/plans";

// Stripe side of the SaaS plans: one subscription per company with the plan's price, plus a per-seat price whose
// quantity is the number of office users beyond the one included. Drivers (CREW) never count.

export function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe isn't configured.");
  return new Stripe(key);
}

export const stripeSeatPriceId = () => process.env.STRIPE_PRICE_SEAT;
export const stripeBrandPriceId = () => process.env.STRIPE_PRICE_BRAND;
export const stripeSmsPackPriceId = () => process.env.STRIPE_PRICE_SMS_PACK;

export function seatsToBill(plan: Plan, officeUsers: number): number {
  if (!PLANS[plan].extraUsersAllowed) return 0;
  return Math.max(0, officeUsers - PLANS[plan].includedOfficeUsers);
}

/** Creates the Stripe customer on first need (signup creates it too, but may have failed or predate plans). */
export async function ensureStripeCustomer(companyId: string, email: string | null): Promise<string> {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { stripeCustomerId: true, name: true } });
  if (company.stripeCustomerId) return company.stripeCustomerId;
  const customer = await stripeClient().customers.create({ email: email ?? undefined, name: company.name, metadata: { companyId } });
  await prisma.company.update({ where: { id: companyId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/** Puts the Stripe seat quantity in line with the company's current office users. No-op without a subscription. */
export async function syncSeats(companyId: string): Promise<void> {
  const seatPrice = stripeSeatPriceId();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { plan: true, stripeSubscriptionId: true } });
  if (!seatPrice || !company.stripeSubscriptionId) return;

  const stripe = stripeClient();
  const sub = await stripe.subscriptions.retrieve(company.stripeSubscriptionId);
  const seatItem = sub.items.data.find((i) => i.price.id === seatPrice);
  const wanted = seatsToBill(company.plan, await officeUserCount(companyId));

  if (wanted > 0 && seatItem) {
    if (seatItem.quantity !== wanted) await stripe.subscriptionItems.update(seatItem.id, { quantity: wanted, proration_behavior: "create_prorations" });
  } else if (wanted > 0) {
    await stripe.subscriptionItems.create({ subscription: sub.id, price: seatPrice, quantity: wanted, proration_behavior: "create_prorations" });
  } else if (seatItem) {
    await stripe.subscriptionItems.del(seatItem.id, { proration_behavior: "create_prorations" });
  }
}
