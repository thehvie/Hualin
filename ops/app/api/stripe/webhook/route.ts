import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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
      await prisma.company.updateMany({
        where: { stripeCustomerId: String(sub.customer) },
        data: {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: STATUS_MAP[sub.status],
          stripePriceId: sub.items.data[0]?.price.id,
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
