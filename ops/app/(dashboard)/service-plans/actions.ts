"use server";

import Stripe from "stripe";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { sendEmail, MailgunNotConfiguredError } from "@/lib/mailgun";

export async function subscribeClientToPlan(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; checkoutUrl?: string; subscriptionId?: string }> {
  const { companyId } = await requireSession();

  const customerId = String(formData.get("customerId") || "").trim();
  const propertyId = String(formData.get("propertyId") || "").trim() || null;
  const servicePlanId = String(formData.get("servicePlanId") || "").trim();
  const billingOptionId = String(formData.get("billingOptionId") || "").trim();

  if (!customerId || !servicePlanId || !billingOptionId) {
    return { ok: false, error: "Please choose a customer, plan, and billing option." };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Stripe isn't configured — set STRIPE_SECRET_KEY." };
  const stripe = new Stripe(secretKey);

  const [customer, plan, billingOption] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, companyId } }),
    prisma.servicePlan.findFirst({ where: { id: servicePlanId, companyId } }),
    prisma.servicePlanBillingOption.findFirst({ where: { id: billingOptionId, servicePlanId } }),
  ]);
  if (!customer) return { ok: false, error: "Customer not found." };
  if (!plan) return { ok: false, error: "Plan not found." };
  if (!billingOption?.stripePriceId) return { ok: false, error: "That billing option isn't ready yet — re-save the plan." };

  let stripeCustomerId = customer.stripeCustomerId;
  if (!stripeCustomerId) {
    const stripeCustomer = await stripe.customers.create({
      email: customer.email || undefined,
      name: `${customer.firstName} ${customer.lastName}`,
      metadata: { customerId: customer.id, companyId },
    });
    stripeCustomerId = stripeCustomer.id;
    await prisma.customer.update({ where: { id: customer.id }, data: { stripeCustomerId } });
  }

  const subscription = await prisma.servicePlanSubscription.create({
    data: {
      companyId,
      servicePlanId,
      billingOptionId,
      customerId,
      propertyId,
      priceCentsSnapshot: plan.priceCents,
      visitsTotal: plan.visitsPerPeriod,
      stripeCustomerId,
    },
  });

  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: billingOption.stripePriceId, quantity: 1 }],
    client_reference_id: subscription.id,
    success_url: `${origin}/service-plans/subscribe/${subscription.id}/success`,
    cancel_url: `${origin}/service-plans`,
  });

  await prisma.servicePlanSubscription.update({
    where: { id: subscription.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  revalidatePath("/service-plans");
  return { ok: true, checkoutUrl: session.url ?? undefined, subscriptionId: subscription.id };
}

export async function emailCheckoutLink(subscriptionId: string, checkoutUrl: string) {
  const { companyId } = await requireSession();
  const subscription = await prisma.servicePlanSubscription.findFirst({
    where: { id: subscriptionId, companyId },
    include: { customer: true, servicePlan: true },
  });
  if (!subscription?.customer.email) return { ok: false, error: "This customer has no email on file." };

  try {
    await sendEmail({
      to: subscription.customer.email,
      companyId,
      subject: `Subscribe to ${subscription.servicePlan.name}`,
      text: `Hi ${subscription.customer.firstName},\n\nComplete your subscription to ${subscription.servicePlan.name} here:\n${checkoutUrl}\n`,
    });
  } catch (err) {
    if (err instanceof MailgunNotConfiguredError) {
      return { ok: false, error: "Email isn't configured yet — copy the link instead." };
    }
    throw err;
  }
  return { ok: true };
}

export async function cancelSubscription(subscriptionId: string) {
  const { companyId } = await requireSession();
  const subscription = await prisma.servicePlanSubscription.findFirst({ where: { id: subscriptionId, companyId } });
  if (!subscription) return;

  if (subscription.stripeSubscriptionId) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      const stripe = new Stripe(secretKey);
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId).catch(() => {});
    }
  }

  await prisma.servicePlanSubscription.update({ where: { id: subscriptionId }, data: { status: "CANCELLED" } });
  revalidatePath("/service-plans");
  revalidatePath(`/service-plans/${subscriptionId}`);
}
