"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendResetEmail } from "@/lib/auth-tokens";

/** Always answers the same way, so the form can't be used to find out which emails have accounts. */
export async function requestReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || email.length > 200) redirect("/forgot-password?error=Enter your email address.");

  const ip = await clientIp();
  if (!rateLimit(`reset-ip:${ip}`, 8, 60 * 60_000).ok || !rateLimit(`reset-email:${email}`, 3, 60 * 60_000).ok) {
    redirect("/forgot-password?error=Too many requests. Please try again in a while.");
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { name: true, passwordHash: true } });
  if (user?.passwordHash) await sendResetEmail(email, user.name);
  redirect("/forgot-password?sent=1");
}
