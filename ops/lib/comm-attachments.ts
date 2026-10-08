import sharp from "sharp";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { putObject, spacesConfigured } from "@/lib/storage";
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS, MAX_COMPANY_ATTACHMENT_BYTES } from "@/lib/comm-attachment-constants";

export { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS };

// Documents we accept besides images. Anything else (executables, scripts, archives) is refused.
const DOCUMENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text",
};

export interface StoredFile {
  filename: string;
  mimeType: string;
  data: Buffer;
}

function cleanName(name: string): string {
  // Keep it a plain file name: no paths, no control characters, bounded length.
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "file";
}

function extension(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

/**
 * Checks and normalizes one uploaded or received file. Photos are re-encoded as JPEG through sharp (a malformed
 * image can't reach a viewer or the PDF renderer); documents are kept as-is but only from an allow-list.
 * Throws a message safe to show the user.
 */
export async function normalizeAttachment(name: string, mimeType: string, input: Buffer): Promise<StoredFile> {
  const filename = cleanName(name);
  if (input.byteLength === 0) throw new Error(`"${filename}" is empty.`);
  if (input.byteLength > MAX_ATTACHMENT_BYTES) throw new Error(`"${filename}" is larger than 10 MB.`);

  if (mimeType.startsWith("image/")) {
    try {
      const data = await sharp(input)
        .rotate() // honor the phone's orientation before the metadata is stripped
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
      return { filename: filename.replace(/\.[^.]+$/, "") + ".jpg", mimeType: "image/jpeg", data };
    } catch {
      throw new Error(`"${filename}" couldn't be read as an image.`);
    }
  }

  const type = DOCUMENT_TYPES[extension(filename)];
  if (!type) throw new Error(`"${filename}" isn't a supported file type (photos, PDF, Word, Excel, CSV and text files are).`);
  return { filename, mimeType: type, data: input };
}

/** How many bytes of email attachments this company has stored, and how much room is left under its cap. */
export async function attachmentStorage(companyId: string): Promise<{ usedBytes: number; remainingBytes: number }> {
  const agg = await prisma.communicationAttachment.aggregate({ where: { companyId }, _sum: { sizeBytes: true } });
  const usedBytes = agg._sum.sizeBytes ?? 0;
  return { usedBytes, remainingBytes: Math.max(0, MAX_COMPANY_ATTACHMENT_BYTES - usedBytes) };
}

/** Saves the files of a message: into DigitalOcean Spaces when it's configured, otherwise into the database. */
export async function saveAttachments(companyId: string, communicationId: string, files: StoredFile[]): Promise<void> {
  if (files.length === 0) return;
  const useSpaces = spacesConfigured();
  const rows = await Promise.all(
    files.map(async (f) => {
      const base = { companyId, communicationId, filename: f.filename, mimeType: f.mimeType, sizeBytes: f.data.byteLength };
      if (!useSpaces) return { ...base, data: f.data };
      // Random key prefix so names never collide and can't be guessed; the company id keeps each tenant in its own folder.
      const storageKey = `comm/${companyId}/${communicationId}/${randomBytes(8).toString("hex")}-${f.filename}`;
      await putObject(storageKey, f.data, f.mimeType);
      return { ...base, storageKey };
    }),
  );
  await prisma.communicationAttachment.createMany({ data: rows });
}
