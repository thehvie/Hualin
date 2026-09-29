import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { endDateFrom, nextVisitDateFrom } from "@/lib/service-plans";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SERVICE_PLAN_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await req.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.client_reference_id) break;

      const subscription = await prisma.servicePlanSubscription.findUnique({
        where: { id: session.client_reference_id },
        include: { servicePlan: true, billingOption: true },
      });
      if (!subscription) break;

      const startDate = new Date();
      await prisma.servicePlanSubscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          startDate,
          endDate: endDateFrom(startDate, subscription.servicePlan.durationValue, subscription.servicePlan.durationUnit),
          nextVisitDate: nextVisitDateFrom(startDate, subscription.billingOption.frequency),
        },
      });
      break;
    }

    case "invoice.paid": {
      const stripeInvoice = event.data.object as Stripe.Invoice;
      const subscriptionRef = stripeInvoice.parent?.subscription_details?.subscription;
      const stripeSubscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
      if (!stripeSubscriptionId) break;

      const subscription = await prisma.servicePlanSubscription.findUnique({
        where: { stripeSubscriptionId },
        include: { servicePlan: true, billingOption: true },
      });
      if (!subscription) break;

      const existingPayment = await prisma.payment.findFirst({ where: { stripeInvoiceId: stripeInvoice.id } });
      if (existingPayment) break; // already recorded (webhook retry)

      const invoice = await prisma.invoice.create({
        data: {
          companyId: subscription.companyId,
          customerId: subscription.customerId,
          servicePlanSubscriptionId: subscription.id,
          status: "PAID",
          name: `${subscription.servicePlan.name} — recurring billing`,
          paidAt: new Date(),
          lineItems: {
            create: [
              {
                companyId: subscription.companyId,
                description: subscription.servicePlan.name,
                quantity: 1,
                unitPriceCents: stripeInvoice.amount_paid,
                sortOrder: 0,
              },
            ],
          },
        },
      });

      await prisma.payment.create({
        data: {
          companyId: subscription.companyId,
          invoiceId: invoice.id,
          amountCents: stripeInvoice.amount_paid,
          method: "CARD",
          stripeInvoiceId: stripeInvoice.id,
        },
      });

      await prisma.servicePlanSubscription.update({
        where: { id: subscription.id },
        data: { nextVisitDate: nextVisitDateFrom(new Date(), subscription.billingOption.frequency) },
      });
      break;
    }

    case "invoice.payment_failed": {
      const stripeInvoice = event.data.object as Stripe.Invoice;
      const subscriptionRef = stripeInvoice.parent?.subscription_details?.subscription;
      const stripeSubscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
      if (!stripeSubscriptionId) break;

      await prisma.servicePlanSubscription.updateMany({
        where: { stripeSubscriptionId },
        data: { status: "PAST_DUE" },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = event.data.object as Stripe.Subscription;
      await prisma.servicePlanSubscription.updateMany({
        where: { stripeSubscriptionId: stripeSubscription.id },
        data: { status: "CANCELLED" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
