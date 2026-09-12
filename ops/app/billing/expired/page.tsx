import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function reactivate() {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");

  const company = await prisma.company.findUnique({ where: { id: session.user.companyId } });
  if (!company?.stripeCustomerId) redirect("/login");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: company.stripeCustomerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID_STANDARD!, quantity: 1 }],
    client_reference_id: company.id,
    success_url: `${process.env.NEXTAUTH_URL}/?resubscribed=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/billing/expired`,
  });

  if (checkoutSession.url) redirect(checkoutSession.url);
}

export default async function BillingExpiredPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">Subscription inactive</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Your subscription isn&rsquo;t active, so this account is locked. Resubscribe to get back in.
        </p>

        <form action={reactivate}>
          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Resubscribe
          </button>
        </form>
      </div>
    </div>
  );
}
