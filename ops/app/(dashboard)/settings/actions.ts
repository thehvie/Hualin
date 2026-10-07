"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { isValidTimezone, DEFAULT_TIMEZONE } from "@/lib/tz";
import { isUsState } from "@/lib/us-states";
import { percentToBps, setDefaultTaxRate, MAX_TAX_PERCENT } from "@/lib/tax";
import { geocodeAddress } from "@/lib/geocode";

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
  const phone = String(formData.get("phone") || "").trim();
  const website = String(formData.get("website") || "").trim();
  const termsText = String(formData.get("termsText") || "").trim();
  const timezone = String(formData.get("timezone") || DEFAULT_TIMEZONE);
  const state = String(formData.get("state") || "").trim();
  const officeAddressLine1 = String(formData.get("officeAddressLine1") || "").trim();
  const officeCity = String(formData.get("officeCity") || "").trim();
  const officeState = String(formData.get("officeState") || "").trim();
  const officeZip = String(formData.get("officeZip") || "").trim();
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
  if (officeState && !isUsState(officeState)) {
    return { error: "Please choose a valid state for the office address." };
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
      termsText: termsText || null,
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
