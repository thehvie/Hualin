import sharp from "sharp";

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB per source file

export interface NormalizedPhoto {
  filename: string;
  mimeType: string;
  dataUrl: string;
}

// Re-encoded through sharp before storage, same reasoning as the company
// logo upload: a malformed image reaching @react-pdf/renderer or any other
// consumer down the line must never happen, so nothing unvalidated is kept.
export async function normalizePhoto(file: File): Promise<NormalizedPhoto | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error(`"${file.name}" is too large — please use images under 8MB.`);
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer)
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    throw new Error(`"${file.name}" couldn't be read as an image.`);
  }

  return {
    filename: file.name,
    mimeType: "image/jpeg",
    dataUrl: `data:image/jpeg;base64,${outputBuffer.toString("base64")}`,
  };
}
