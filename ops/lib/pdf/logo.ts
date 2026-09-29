import sharp from "sharp";

const MAX_HEIGHT = 60;
const MAX_WIDTH = 200;

export interface LogoSize {
  width: number;
  height: number;
}

/**
 * react-pdf doesn't reliably keep an image's aspect ratio when only a height
 * and max-width are given (it can stretch to the max width), so compute the
 * exact box from the logo's real pixel dimensions: as tall as MAX_HEIGHT
 * allows, shrunk further if that would exceed MAX_WIDTH.
 */
export async function logoSizeFor(dataUrl: string | null): Promise<LogoSize | null> {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:image\/[a-zA-Z+.-]+;base64,(.+)$/);
  if (!match) return null;
  try {
    const meta = await sharp(Buffer.from(match[1], "base64")).metadata();
    if (!meta.width || !meta.height) return null;
    const ratio = meta.width / meta.height;
    let height = MAX_HEIGHT;
    let width = height * ratio;
    if (width > MAX_WIDTH) {
      width = MAX_WIDTH;
      height = width / ratio;
    }
    return { width: Math.round(width), height: Math.round(height) };
  } catch {
    return null;
  }
}
