import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "./sign-out-button";

export const metadata = { title: "Driver", robots: { index: false, follow: false } };

// The driver's own screen. Drivers never see the office app; this is where their stops will appear.
export default async function DriverHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  if (session.user.role !== "CREW") redirect("/");

  const driver = await prisma.driver.findFirst({
    where: { userId: session.user.id, companyId: session.user.companyId },
    select: { name: true, company: { select: { name: true } } },
  });

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{driver?.company.name ?? "Driver"}</p>
        <h1 className="mt-1 text-xl font-bold text-zinc-900">Hi {(driver?.name ?? session.user.name ?? "there").split(" ")[0]}</h1>
        <p className="mt-3 text-sm text-zinc-500">Your stops will show up here once your office assigns them. Nothing is assigned yet.</p>
        <SignOutButton />
      </div>
    </div>
  );
}
