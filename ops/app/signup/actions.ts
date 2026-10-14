"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { ensureStripeCustomer } from "@/lib/billing";
import { TRIAL_DAYS } from "@/lib/plans";
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
      data: {
        name: companyName,
        subscriptionStatus: "TRIALING",
        plan: "STARTER",
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    await tx.user.create({
      data: { name: adminName, email, passwordHash, role: "ADMIN", companyId: company.id },
    });
    return company;
  });

  // The free trial needs no card. The Stripe customer is made now so choosing a plan later is one click; if
  // Stripe is down it is created on demand at checkout instead.
  try {
    await ensureStripeCustomer(company.id, email);
  } catch (err) {
    console.error("Could not create Stripe customer at signup", err);
  }

  redirect("/login?signedUp=1");
}
