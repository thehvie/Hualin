import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { SMS_PACK_CENTS, SMS_PACK_TEXTS, planFromStripePriceId } from "@/lib/plans";

const STATUS_MAP: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  trialing: "TRIALING",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "UNPAID",
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
  paused: "PAUSED",
};

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
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
      if (session.metadata?.kind === "brand_upgrade" && session.client_reference_id && session.payment_status === "paid") {
        await prisma.company.update({ where: { id: session.client_reference_id }, data: { brandUpgrade: true } });
        break;
      }
      if (session.metadata?.kind === "sms_pack" && session.client_reference_id && session.payment_status === "paid") {
        // The purchase row's id is the session id: a retried webhook hits the unique key and adds nothing.
        const companyId = session.client_reference_id;
        try {
          await prisma.$transaction([
            prisma.smsPackPurchase.create({ data: { id: session.id, companyId, texts: SMS_PACK_TEXTS, amountCents: session.amount_total ?? SMS_PACK_CENTS } }),
            prisma.company.update({ where: { id: companyId }, data: { smsCredits: { increment: SMS_PACK_TEXTS } } }),
          ]);
        } catch (err) {
          if ((err as { code?: string }).code !== "P2002") throw err;
        }
        break;
      }
      if (session.client_reference_id && session.subscription) {
        await prisma.company.update({
          where: { id: session.client_reference_id },
          data: { stripeSubscriptionId: String(session.subscription) },
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      // The plan is whichever item carries one of our plan prices (the other item is the per-user seat price).
      let plan = null;
      let planPriceId: string | undefined;
      for (const item of sub.items.data) {
        const found = planFromStripePriceId(item.price.id);
        if (found) {
          plan = found;
          planPriceId = item.price.id;
          break;
        }
      }
      await prisma.company.updateMany({
        where: { stripeCustomerId: String(sub.customer) },
        data: {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: STATUS_MAP[sub.status],
          stripePriceId: planPriceId ?? sub.items.data[0]?.price.id,
          ...(plan ? { plan } : {}),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.company.updateMany({
        where: { stripeCustomerId: String(sub.customer) },
        data: { subscriptionStatus: "CANCELED" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
