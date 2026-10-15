"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { consumeAuthToken } from "@/lib/auth-tokens";

export async function resetPassword(token: string, formData: FormData) {
  const password = String(formData.get("password") || "");
  if (password.length < 8 || password.length > 200) redirect(`/reset-password/${encodeURIComponent(token)}?error=Use at least 8 characters.`);
  if (!rateLimit(`reset-use:${await clientIp()}`, 20, 60 * 60_000).ok) redirect(`/reset-password/${encodeURIComponent(token)}?error=Too many attempts. Please try again later.`);

  const email = await consumeAuthToken("reset", token);
  if (!email) redirect("/forgot-password?error=That link has expired. Ask for a new one.");

  // Following the emailed link proves they own the address, so it also counts as verifying it.
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
  if (!user) redirect("/forgot-password?error=That link has expired. Ask for a new one.");
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10), ...(user.emailVerified ? {} : { emailVerified: new Date() }) },
  });
  redirect("/login?reset=1");
}
