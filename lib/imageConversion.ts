import sharp from "sharp";

// GIF se salta a propósito: sharp solo tomaría el primer frame por defecto,
// lo que rompería silenciosamente cualquier imagen animada. SVG es vectorial,
// convertirlo a webp (raster) cambiaría su semántica. webp ya no necesita
// reconversión.
const SKIP_MIME_TYPES = new Set(["image/webp", "image/svg+xml", "image/gif"]);

export interface ConvertedImage {
  data: Buffer;
  mime: string;
  originalName: string | null;
}

function withWebpExtension(originalName: string | null): string | null {
  if (!originalName) return originalName;
  return originalName.replace(/\.[^./]+$/, ".webp");
}

/** Convierte a webp cualquier imagen raster que no lo sea ya; deja el resto tal cual. */
export async function convertImageToWebp(
  data: Buffer,
  mime: string,
  originalName: string | null,
): Promise<ConvertedImage> {
  if (!mime.startsWith("image/") || SKIP_MIME_TYPES.has(mime)) {
    return { data, mime, originalName };
  }

  const converted = await sharp(data).webp({ quality: 82 }).toBuffer();
  return { data: converted, mime: "image/webp", originalName: withWebpExtension(originalName) };
}
