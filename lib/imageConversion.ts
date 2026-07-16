import sharp from "sharp";

// Únicos formatos raster aceptados — se valida contra los BYTES reales del
// archivo (vía sharp), nunca contra el `Content-Type` que declara el
// cliente, que cualquiera puede falsificar. SVG queda fuera a propósito: es
// contenido activo (puede llevar <script>), no una imagen raster inerte, y
// este asset se sirve después sin autenticación ni sandboxing — aceptarlo
// tal cual sería XSS almacenado servido desde el propio dominio.
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);
const FORMAT_TO_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

// GIF se salta a propósito: sharp solo tomaría el primer frame por defecto,
// lo que rompería silenciosamente cualquier imagen animada. WEBP ya no
// necesita reconversión.
const SKIP_CONVERSION_FORMATS = new Set(["webp", "gif"]);

export interface ConvertedImage {
  data: Buffer;
  mime: string;
  originalName: string | null;
  width: number;
  height: number;
}

function withExtension(originalName: string | null, ext: string): string | null {
  if (!originalName) return originalName;
  return originalName.replace(/\.[^./]+$/, `.${ext}`);
}

/**
 * Convierte a webp cualquier imagen raster soportada que no lo sea ya.
 * Lanza si sharp no reconoce los bytes como uno de los formatos permitidos
 * — el llamador debe traducir eso a un 400 para el cliente.
 */
export async function convertImageToWebp(
  data: Buffer,
  originalName: string | null,
): Promise<ConvertedImage> {
  const metadata = await sharp(data)
    .metadata()
    .catch(() => null);
  if (
    !metadata?.format ||
    !ALLOWED_FORMATS.has(metadata.format) ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new Error("UNSUPPORTED_IMAGE_FORMAT");
  }
  const { width, height } = metadata;

  if (SKIP_CONVERSION_FORMATS.has(metadata.format)) {
    return { data, mime: FORMAT_TO_MIME[metadata.format]!, originalName, width, height };
  }

  const converted = await sharp(data).webp({ quality: 82 }).toBuffer();
  return {
    data: converted,
    mime: "image/webp",
    originalName: withExtension(originalName, "webp"),
    width,
    height,
  };
}
