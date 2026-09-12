"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";

export async function signup(formData: FormData) {
  const companyName = String(formData.get("companyName") || "").trim();
  const adminName = String(formData.get("adminName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!companyName || !adminName || !email || !password) {
    throw new Error("All fields are required.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const company = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: companyName, subscriptionStatus: "TRIALING" },
    });
    await tx.user.create({
      data: { name: adminName, email, passwordHash, role: "ADMIN", companyId: company.id },
    });
    return company;
  });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const customer = await stripe.customers.create({
    email,
    name: companyName,
    metadata: { companyId: company.id },
  });
  await prisma.company.update({
    where: { id: company.id },
    data: { stripeCustomerId: customer.id },
  });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID_STANDARD!, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    client_reference_id: company.id,
    success_url: `${process.env.NEXTAUTH_URL}/login?signedUp=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/signup`,
  });

  if (!checkoutSession.url) {
    throw new Error("Could not start checkout. Please try again.");
  }

  redirect(checkoutSession.url);
}
