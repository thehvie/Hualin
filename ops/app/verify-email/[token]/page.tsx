import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { consumeAuthToken } from "@/lib/auth-tokens";

export const metadata = { title: "Verify email", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const email = await consumeAuthToken("verify", token);
  if (email) await prisma.user.updateMany({ where: { email, emailVerified: null }, data: { emailVerified: new Date() } });

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">{email ? "Email confirmed" : "This link has expired"}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {email ? "You can now send estimates, invoices and messages to your customers." : "Sign in and use the banner at the top to send yourself a new link."}
        </p>
        <Link href={email ? "/" : "/login"} className="mt-5 inline-block rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          {email ? "Go to your dashboard" : "Sign in"}
        </Link>
      </div>
    </div>
  );
}
