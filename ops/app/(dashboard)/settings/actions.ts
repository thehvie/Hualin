"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

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
  const rawLogoDataUrl = String(formData.get("logoDataUrl") || "").trim();

  if (!name) {
    return { error: "Company name is required." };
  }

  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = rawLogoDataUrl ? await normalizeLogo(rawLogoDataUrl) : null;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the logo." };
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      email: email || null,
      phone: phone || null,
      website: website || null,
      termsText: termsText || null,
      ...(logoDataUrl ? { logoDataUrl } : {}),
    },
  });

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
