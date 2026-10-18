"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/phone";
import { geocodeAddress } from "@/lib/geocode";
import { requireSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function createCustomer(formData: FormData) {
  const { companyId } = await requireSession();

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = formatPhone(String(formData.get("phone") || ""));
  const phoneExt = String(formData.get("phoneExt") || "").trim();
  const secondaryPhone = formatPhone(String(formData.get("secondaryPhone") || ""));
  const secondaryPhoneExt = String(formData.get("secondaryPhoneExt") || "").trim();
  const source = String(formData.get("source") || "OTHER");
  const allowBilling = formData.get("allowBilling") === "on";
  const taxExempt = formData.get("taxExempt") === "on";

  const addressLine1 = String(formData.get("addressLine1") || "").trim();
  const addressLine2 = String(formData.get("addressLine2") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const companyState = (await prisma.company.findUnique({ where: { id: companyId }, select: { state: true } }))?.state;
  const state = companyState || String(formData.get("state") || "").trim();
  const zip = String(formData.get("zip") || "").trim();
  const country = String(formData.get("country") || "US").trim();

  if (!firstName || !lastName) {
    throw new Error("First and last name are required.");
  }

  let geo: { latitude: number; longitude: number } | null = null;
  if (addressLine1 && city && state) {
    geo = await geocodeAddress(`${addressLine1}, ${city}, ${state} ${zip}, ${country}`, companyId);
  }

  const customer = await prisma.customer.create({
    data: {
      companyId,
      firstName,
      lastName,
      companyName: companyName || null,
      email: email || null,
      phone: phone || null,
      phoneExt: phoneExt || null,
      secondaryPhone: secondaryPhone || null,
      secondaryPhoneExt: secondaryPhoneExt || null,
      source: source as
        | "GOOGLE_ADS"
        | "REFERRAL"
        | "YELP"
        | "DOOR_HANGER"
        | "WEBSITE"
        | "REPEAT"
        | "OTHER",
      allowBilling,
      taxExempt,
      properties: addressLine1
        ? {
            create: {
              companyId,
              addressLine1,
              addressLine2: addressLine2 || null,
              city,
              state,
              zip,
              country,
              latitude: geo?.latitude ?? null,
              longitude: geo?.longitude ?? null,
            },
          }
        : undefined,
    },
  });

  redirect(`/customers/${customer.id}`);
}

/** Archive or restore a customer. History stays; they just leave the lists and pickers. */
export async function setCustomerArchived(id: string, archived: boolean): Promise<{ ok: boolean; error?: string }> {
  const { companyId } = await requireSession();
  const res = await prisma.customer.updateMany({ where: { id, companyId }, data: { archivedAt: archived ? new Date() : null } });
  if (res.count === 0) return { ok: false, error: "Customer not found." };
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true };
}

/** Deletes a customer with no history. One with estimates, jobs, invoices, plans or messages has to be archived instead. */
export async function deleteCustomer(id: string): Promise<{ ok: boolean; error?: string }> {
  const { companyId } = await requireSession();
  const customer = await prisma.customer.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!customer) return { ok: false, error: "Customer not found." };

  const [estimates, jobs, invoices, plans, messages] = await Promise.all([
    prisma.estimate.count({ where: { customerId: id } }),
    prisma.job.count({ where: { customerId: id } }),
    prisma.invoice.count({ where: { customerId: id } }),
    prisma.servicePlanSubscription.count({ where: { customerId: id } }),
    prisma.communication.count({ where: { customerId: id } }),
  ]);
  const used = [
    estimates && `${estimates} estimate${estimates === 1 ? "" : "s"}`,
    jobs && `${jobs} job${jobs === 1 ? "" : "s"}`,
    invoices && `${invoices} invoice${invoices === 1 ? "" : "s"}`,
    plans && `${plans} service plan${plans === 1 ? "" : "s"}`,
    messages && `${messages} message${messages === 1 ? "" : "s"}`,
  ].filter(Boolean);
  if (used.length > 0) return { ok: false, error: `This customer has ${used.join(", ")}, so it can't be deleted. Archive it instead.` };

  await prisma.customer.deleteMany({ where: { id, companyId } });
  revalidatePath("/customers");
  return { ok: true };
}
