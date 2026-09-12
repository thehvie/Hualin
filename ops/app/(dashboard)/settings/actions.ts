"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB, as a base64 data URL

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

export async function updateCompanyProfile(formData: FormData) {
  const { companyId } = await requireSession();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const website = String(formData.get("website") || "").trim();
  const rawLogoDataUrl = String(formData.get("logoDataUrl") || "").trim();

  if (!name) {
    throw new Error("Company name is required.");
  }
  if (rawLogoDataUrl && rawLogoDataUrl.length > MAX_LOGO_BYTES) {
    throw new Error("Logo image is too large — please use a smaller file (under ~1.5MB).");
  }

  const logoDataUrl = rawLogoDataUrl ? await normalizeLogo(rawLogoDataUrl) : null;

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      email: email || null,
      phone: phone || null,
      website: website || null,
      ...(logoDataUrl ? { logoDataUrl } : {}),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function removeCompanyLogo() {
  const { companyId } = await requireSession();
  await prisma.company.update({ where: { id: companyId }, data: { logoDataUrl: null } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}
