"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/phone";
import { requireSession } from "@/lib/session";
import { featureBlock } from "@/lib/plan-access";
import { DRIVER_COLORS } from "@/lib/drivers";

type Result = { ok: true } | { ok: false; error: string };

export interface DriverInput {
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  color: string;
  notes: string;
}

async function adminOnly(): Promise<{ companyId: string } | { error: string }> {
  const { companyId, role } = await requireSession();
  if (role !== "ADMIN" && role !== "DISPATCHER") return { error: "Only an admin or dispatcher can manage drivers." };
  const blocked = await featureBlock(companyId, "RENTALS");
  if (blocked) return { error: blocked };
  return { companyId };
}

function clean(input: DriverInput): { data: { name: string; phone: string | null; email: string | null; vehicle: string | null; color: string; notes: string | null } } | { error: string } {
  const name = String(input.name ?? "").trim().slice(0, 100);
  const email = String(input.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!name) return { error: "Give the driver a name." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email address doesn't look right." };
  return {
    data: {
      name,
      phone: formatPhone(String(input.phone ?? "")) || null,
      email: email || null,
      vehicle: String(input.vehicle ?? "").trim().slice(0, 60) || null,
      color: DRIVER_COLORS.includes(input.color) ? input.color : DRIVER_COLORS[0],
      notes: String(input.notes ?? "").trim().slice(0, 1000) || null,
    },
  };
}

export async function createDriver(input: DriverInput): Promise<Result> {
  const who = await adminOnly();
  if ("error" in who) return { ok: false, error: who.error };
  const c = clean(input);
  if ("error" in c) return { ok: false, error: c.error };
  await prisma.driver.create({ data: { companyId: who.companyId, ...c.data } });
  revalidatePath("/drivers");
  return { ok: true };
}

export async function updateDriver(id: string, input: DriverInput): Promise<Result> {
  const who = await adminOnly();
  if ("error" in who) return { ok: false, error: who.error };
  const c = clean(input);
  if ("error" in c) return { ok: false, error: c.error };
  const { count } = await prisma.driver.updateMany({ where: { id, companyId: who.companyId }, data: c.data });
  if (count === 0) return { ok: false, error: "Driver not found." };
  revalidatePath("/drivers");
  return { ok: true };
}

/** A driver who has left, or is off for a while, stops showing in dispatch lists but keeps their history. */
export async function setDriverActive(id: string, active: boolean): Promise<Result> {
  const who = await adminOnly();
  if ("error" in who) return { ok: false, error: who.error };
  const { count } = await prisma.driver.updateMany({ where: { id, companyId: who.companyId }, data: { active } });
  if (count === 0) return { ok: false, error: "Driver not found." };
  revalidatePath("/drivers");
  return { ok: true };
}

export async function deleteDriver(id: string): Promise<Result> {
  const who = await adminOnly();
  if ("error" in who) return { ok: false, error: who.error };
  const driver = await prisma.driver.findFirst({ where: { id, companyId: who.companyId }, select: { userId: true } });
  if (!driver) return { ok: false, error: "Driver not found." };
  await prisma.driver.delete({ where: { id } });
  if (driver.userId) await prisma.user.deleteMany({ where: { id: driver.userId, companyId: who.companyId, role: "CREW" } });
  revalidatePath("/drivers");
  return { ok: true };
}

/** Gives a driver a login for the phone view. The login is a CREW user and never takes a seat. */
export async function createDriverLogin(id: string, input: { email: string; password: string }): Promise<Result> {
  const who = await adminOnly();
  if ("error" in who) return { ok: false, error: who.error };
  const driver = await prisma.driver.findFirst({ where: { id, companyId: who.companyId } });
  if (!driver) return { ok: false, error: "Driver not found." };
  if (driver.userId) return { ok: false, error: "This driver already has a login." };

  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter the email they will sign in with." };
  if (password.length < 8 || password.length > 200) return { ok: false, error: "The password must be at least 8 characters." };
  if (await prisma.user.findUnique({ where: { email } })) return { ok: false, error: "An account with that email already exists." };

  const user = await prisma.user.create({
    data: { companyId: who.companyId, name: driver.name, email, passwordHash: await bcrypt.hash(password, 10), role: "CREW", emailVerified: new Date() },
  });
  await prisma.driver.update({ where: { id }, data: { userId: user.id, email: driver.email ?? email } });
  revalidatePath("/drivers");
  return { ok: true };
}

export async function removeDriverLogin(id: string): Promise<Result> {
  const who = await adminOnly();
  if ("error" in who) return { ok: false, error: who.error };
  const driver = await prisma.driver.findFirst({ where: { id, companyId: who.companyId }, select: { userId: true } });
  if (!driver?.userId) return { ok: false, error: "This driver has no login." };
  await prisma.driver.update({ where: { id }, data: { userId: null } });
  await prisma.user.deleteMany({ where: { id: driver.userId, companyId: who.companyId, role: "CREW" } });
  revalidatePath("/drivers");
  return { ok: true };
}
