"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { sendVerificationEmail } from "@/lib/auth-tokens";
import { rateLimit } from "@/lib/rate-limit";

export async function resendVerification(): Promise<{ ok: boolean; message: string }> {
  const { userId } = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, emailVerified: true } });
  if (!user) return { ok: false, message: "Account not found." };
  if (user.emailVerified) return { ok: true, message: "Your email is already confirmed." };
  if (!rateLimit(`verify-resend:${userId}`, 3, 60 * 60_000).ok) return { ok: false, message: "Too many requests. Try again in a while." };
  const sent = await sendVerificationEmail(user.email, user.name);
  return sent ? { ok: true, message: `Sent to ${user.email}. Check your spam folder too.` } : { ok: false, message: "We couldn't send the email right now. Try again soon." };
}
