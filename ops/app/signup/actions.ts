"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { ensureStripeCustomer } from "@/lib/billing";
import { sendVerificationEmail } from "@/lib/auth-tokens";
import { TRIAL_DAYS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const fail = (message: string) => redirect(`/signup?error=${encodeURIComponent(message)}`);

export async function signup(formData: FormData) {
  // Honeypot: real people never see or fill this field; bots do. Pretend it worked so they don't learn to skip it.
  if (String(formData.get("companyWebsite") || "").trim()) redirect("/login?signedUp=1");

  const ip = await clientIp();
  if (!rateLimit(`signup:${ip}`, 5, 60 * 60_000).ok || !rateLimit(`signup-day:${ip}`, 15, 24 * 60 * 60_000).ok) {
    fail("Too many sign-ups from your connection. Please try again later.");
  }

  const companyName = String(formData.get("companyName") || "").trim();
  const adminName = String(formData.get("adminName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!companyName || !adminName || !email || !password) fail("All fields are required.");
  if (companyName.length > 120 || adminName.length > 120 || email.length > 200 || password.length > 200) fail("One of those is too long.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("That email address doesn't look right.");
  if (password.length < 8) fail("Password must be at least 8 characters.");

  if (await prisma.user.findUnique({ where: { email } })) fail("An account with that email already exists. Try signing in or resetting your password.");

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

  // Until the address is confirmed the company can use the app but can't email or text customers.
  await sendVerificationEmail(email, adminName);

  redirect("/login?signedUp=1");
}
