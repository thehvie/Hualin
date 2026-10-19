"use server";

import { revalidatePath } from "next/cache";
import { formatPhone } from "@/lib/phone";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { isValidTimezone, DEFAULT_TIMEZONE } from "@/lib/tz";
import { isUsState } from "@/lib/us-states";
import { percentToBps, setDefaultTaxRate, MAX_TAX_PERCENT } from "@/lib/tax";
import { geocodeAddress } from "@/lib/geocode";
import { normalizePaymentUrl } from "@/lib/payment-link";

// A generous ceiling on the RAW upload, just to stop an absurd payload —
// not a real quality gate. sharp always resizes the output to a small,
// fixed max size below, so the raw input size has no bearing on what's
// ultimately stored.
const MAX_RAW_UPLOAD_BYTES = 15 * 1024 * 1024;

export type SettingsFormState = { error?: string };

// Re-encodes the uploaded logo through sharp before it's ever stored or
// handed to the PDF renderer. This isn't just normalization — a malformed
// image reaching @react-pdf/renderer's image decoder has been observed to
// throw as an uncaught exception that bypasses a normal try/catch and can
// take down the whole process, so no unvalidated image data may pass through.
async function normalizeLogo(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) {
    throw new Error("That doesn't look like a valid image file.");
  }

  const inputBuffer = Buffer.from(match[1], "base64");
  if (inputBuffer.byteLength > MAX_RAW_UPLOAD_BYTES) {
    throw new Error("That image is too large — please use a file under 15MB.");
  }

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer)
      .resize({ width: 400, height: 200, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    throw new Error("That image couldn't be read — please try a different PNG, JPG, or WebP file.");
  }

  return `data:image/png;base64,${outputBuffer.toString("base64")}`;
}

export async function updateCompanyProfile(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const { companyId } = await requireSession();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = formatPhone(String(formData.get("phone") || ""));
  const website = String(formData.get("website") || "").trim();
  const timezone = String(formData.get("timezone") || DEFAULT_TIMEZONE);
  const state = String(formData.get("state") || "").trim();
  const rawPaymentLink = String(formData.get("paymentLinkUrl") || "").trim();
  const paymentLinkUrl = rawPaymentLink ? normalizePaymentUrl(rawPaymentLink) : null;
  const paymentLinkLabel = String(formData.get("paymentLinkLabel") || "").trim().slice(0, 40);
  const officeAddressLine1 = String(formData.get("officeAddressLine1") || "").trim();
  const officeCity = String(formData.get("officeCity") || "").trim();
  const officeState = String(formData.get("officeState") || "").trim();
  const officeZip = String(formData.get("officeZip") || "").trim();
  const fuelRate = Math.round(parseFloat(String(formData.get("fuelRate") || "0")) * 100);
  const fuelFreeMiles = Math.round(parseFloat(String(formData.get("fuelFreeMiles") || "0")));
  const fuelRoundTrip = formData.get("fuelRoundTrip") === "on";
  const taxRateBps = percentToBps(String(formData.get("salesTaxPercent") ?? "0"));
  const rawLogoDataUrl = String(formData.get("logoDataUrl") || "").trim();

  if (!name) {
    return { error: "Company name is required." };
  }
  if (taxRateBps === null) {
    return { error: `Sales tax must be a number from 0 to ${MAX_TAX_PERCENT} (for example 6.5, up to two decimals).` };
  }
  if (state && !isUsState(state)) {
    return { error: "Please choose a valid state." };
  }
  if (rawPaymentLink && !paymentLinkUrl) {
    return { error: "The payment link has to be a full web address, like https://pay.example.com/yourbusiness." };
  }
  if (officeState && !isUsState(officeState)) {
    return { error: "Please choose a valid state for the office address." };
  }
  if (!Number.isFinite(fuelRate) || fuelRate < 0 || fuelRate > 2000) {
    return { error: "Fuel rate must be a dollar amount per mile from 0 to 20, for example 0.65." };
  }
  if (!Number.isFinite(fuelFreeMiles) || fuelFreeMiles < 0 || fuelFreeMiles > 500) {
    return { error: "Free miles must be a number from 0 to 500." };
  }
  if (!isValidTimezone(timezone)) {
    return { error: "Please choose a valid time zone." };
  }

  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = rawLogoDataUrl ? await normalizeLogo(rawLogoDataUrl) : null;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the logo." };
  }

  // Geocode the office so the estimate map can route from it (null if the address is blank or the lookup fails;
  // it is retried when an estimate is opened).
  const officeGeo = officeAddressLine1
    ? await geocodeAddress(`${officeAddressLine1}, ${officeCity}, ${officeState} ${officeZip}, US`, companyId)
    : null;

  await prisma.company.update({
    where: { id: companyId },
    data: {
      paymentLinkUrl,
      paymentLinkLabel: paymentLinkLabel || null,
      paymentLinkOnEstimates: formData.get("paymentLinkOnEstimates") === "on",
      paymentLinkOnInvoices: formData.get("paymentLinkOnInvoices") === "on",
      fuelRateCentsPerMile: fuelRate,
      fuelFreeMiles,
      fuelRoundTrip,
      officeAddressLine1: officeAddressLine1 || null,
      officeCity: officeCity || null,
      officeState: officeState || null,
      officeZip: officeZip || null,
      officeLatitude: officeGeo?.latitude ?? null,
      officeLongitude: officeGeo?.longitude ?? null,
      name,
      email: email || null,
      phone: phone || null,
      website: website || null,
      timezone,
      state: state || null,
      ...(logoDataUrl ? { logoDataUrl } : {}),
    },
  });

  await setDefaultTaxRate(companyId, taxRateBps);

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return {};
}

export async function removeCompanyLogo() {
  const { companyId } = await requireSession();
  await prisma.company.update({ where: { id: companyId }, data: { logoDataUrl: null } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

/** Saves the terms & conditions that appear on estimates, invoices and their PDFs. */
export async function saveTerms(input: { termsText: string; rentalTermsText: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const { companyId } = await requireSession();
  const termsText = String(input.termsText ?? "").trim();
  const rentalTermsText = String(input.rentalTermsText ?? "").trim();
  if (termsText.length > 20000 || rentalTermsText.length > 20000) return { ok: false, error: "That's too long. Keep each part under 20,000 characters." };

  await prisma.company.update({ where: { id: companyId }, data: { termsText: termsText || null, rentalTermsText: rentalTermsText || null } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveSwapSettings(input: { policy: string; feeDollars: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const { companyId } = await requireSession();
  const policy = input.policy as "OFF" | "FREE" | "FLAT" | "FULL";
  if (!["OFF", "FREE", "FLAT", "FULL"].includes(policy)) return { ok: false, error: "Pick how swaps work." };
  let feeCents = 0;
  if (policy === "FLAT") {
    const dollars = Number(String(input.feeDollars).replace(/[$,\s]/g, ""));
    if (!Number.isFinite(dollars) || dollars <= 0 || dollars > 5000) return { ok: false, error: "Enter the swap fee in dollars, like 75." };
    feeCents = Math.round(dollars * 100);
  }
  await prisma.company.update({ where: { id: companyId }, data: { swapPolicy: policy, swapFeeCents: feeCents } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveReviewSettings(input: {
  link: string;
  on: boolean;
  days: number;
  startHour: number;
  endHour: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { companyId } = await requireSession();
  const startHour = Math.floor(Number(input.startHour));
  const endHour = Math.floor(Number(input.endHour));
  if (!(startHour >= 0 && startHour <= 23 && endHour >= 1 && endHour <= 24 && endHour > startHour)) {
    return { ok: false, error: "Pick sending hours where the end is after the start." };
  }
  const raw = String(input.link ?? "").trim();
  const link = raw ? normalizePaymentUrl(raw) : null;
  if (raw && !link) return { ok: false, error: "The review link has to be a full web address, like https://g.page/r/your-business/review." };
  const days = Math.floor(Number(input.days));
  if (!Number.isFinite(days) || days < 0 || days > 60) return { ok: false, error: "Ask for the review between 0 and 60 days after the invoice is paid." };
  if (input.on && !link) return { ok: false, error: "Add your review link before turning on review requests." };

  const current = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { reviewRequestsOn: true, reviewRequestsSince: true } });
  const turningOn = !!input.on && !current.reviewRequestsOn;
  await prisma.company.update({
    where: { id: companyId },
    data: {
      reviewLinkUrl: link,
      reviewRequestsOn: !!input.on,
      reviewRequestDays: days,
      reviewSendStartHour: startHour,
      reviewSendEndHour: endHour,
      // Only invoices paid from now on are asked, so switching this on never messages past customers.
      ...(turningOn || !current.reviewRequestsSince ? { reviewRequestsSince: new Date() } : {}),
    },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveReminderSettings(input: {
  on: boolean;
  hours: number;
  auto: boolean;
  ai: boolean;
  quietStart: number;
  quietEnd: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { companyId } = await requireSession();
  const int = (n: unknown, min: number, max: number) => {
    const v = Math.floor(Number(n));
    return Number.isFinite(v) && v >= min && v <= max ? v : null;
  };
  const hours = int(input.hours, 3, 72);
  const quietStart = int(input.quietStart, 0, 23);
  const quietEnd = int(input.quietEnd, 1, 24);
  if (hours === null) return { ok: false, error: "Send the reminder between 3 and 72 hours before pickup." };
  if (quietStart === null || quietEnd === null || quietEnd <= quietStart) return { ok: false, error: "Pick sending hours where the end is after the start." };

  await prisma.company.update({
    where: { id: companyId },
    data: {
      rentalRemindersOn: !!input.on,
      rentalReminderHours: hours,
      rentalReminderAuto: !!input.auto,
      rentalReminderAi: !!input.ai,
      rentalQuietStartHour: quietStart,
      rentalQuietEndHour: quietEnd,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/dispatch");
  return { ok: true };
}
