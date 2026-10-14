"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getPlanAccess, officeUserCount } from "@/lib/plan-access";
import { syncSeats } from "@/lib/billing";
import { EXTRA_USER_CENTS, PLANS, formatPrice } from "@/lib/plans";

const ROLES: UserRole[] = ["ADMIN", "DISPATCHER", "CREW"];
const fail = (msg: string) => redirect(`/settings/team?error=${encodeURIComponent(msg)}`);

/** Adds a login. Office users (admin, dispatcher) take a seat; drivers are free and unlimited. */
export async function addTeamMember(formData: FormData) {
  const { companyId, role: myRole } = await requireSession();
  if (myRole !== "ADMIN") fail("Only an admin can add people.");

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "") as UserRole;
  if (!name || !email || !password) fail("Name, email and a starting password are required.");
  if (password.length < 8) fail("The password must be at least 8 characters.");
  if (!ROLES.includes(role)) fail("Pick a role.");
  if (await prisma.user.findUnique({ where: { email } })) fail("An account with that email already exists.");

  if (role !== "CREW") {
    const access = await getPlanAccess(companyId);
    if (access.maxOfficeUsers !== null && (await officeUserCount(companyId)) >= access.maxOfficeUsers) {
      fail(
        access.onTrial
          ? `The trial includes ${access.maxOfficeUsers} office users. Drivers are unlimited and free.`
          : `${PLANS[access.plan].name} is for one user. Upgrade to Base or Plus to add people (${formatPrice(EXTRA_USER_CENTS)}/mo per extra user). Drivers are unlimited and free.`,
      );
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { companyId, name, email, passwordHash, role } });
  if (role !== "CREW") {
    try {
      await syncSeats(companyId);
    } catch (err) {
      console.error("Seat sync failed, rolling back new user", err);
      await prisma.user.delete({ where: { id: user.id } });
      fail("Couldn't update billing for the new user. Nobody was added; please try again.");
    }
  }
  revalidatePath("/settings/team");
  redirect("/settings/team?added=1");
}

export async function removeTeamMember(userId: string) {
  const { companyId, userId: me, role } = await requireSession();
  if (role !== "ADMIN") fail("Only an admin can remove people.");
  if (userId === me) fail("You can't remove yourself.");
  const target = await prisma.user.findFirst({ where: { id: userId, companyId } });
  if (!target) fail("That person wasn't found.");
  if (target!.role === "ADMIN" && (await prisma.user.count({ where: { companyId, role: "ADMIN" } })) <= 1) fail("Keep at least one admin.");

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    fail("This person has records attached and can't be removed.");
  }
  try {
    await syncSeats(companyId);
  } catch (err) {
    console.error("Seat sync failed after removal", err);
  }
  revalidatePath("/settings/team");
  redirect("/settings/team?removed=1");
}
