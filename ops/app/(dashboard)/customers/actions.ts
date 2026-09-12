"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";
import { requireSession } from "@/lib/session";

export async function createCustomer(formData: FormData) {
  const { companyId } = await requireSession();

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const phoneExt = String(formData.get("phoneExt") || "").trim();
  const secondaryPhone = String(formData.get("secondaryPhone") || "").trim();
  const secondaryPhoneExt = String(formData.get("secondaryPhoneExt") || "").trim();
  const source = String(formData.get("source") || "OTHER");
  const allowBilling = formData.get("allowBilling") === "on";
  const taxExempt = formData.get("taxExempt") === "on";

  const addressLine1 = String(formData.get("addressLine1") || "").trim();
  const addressLine2 = String(formData.get("addressLine2") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const zip = String(formData.get("zip") || "").trim();
  const country = String(formData.get("country") || "US").trim();

  if (!firstName || !lastName) {
    throw new Error("First and last name are required.");
  }

  let geo: { latitude: number; longitude: number } | null = null;
  if (addressLine1 && city && state) {
    geo = await geocodeAddress(`${addressLine1}, ${city}, ${state} ${zip}, ${country}`);
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
