async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawResized(img: HTMLImageElement, maxDimension: number): HTMLCanvasElement {
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen en el navegador");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la imagen"))),
      mimeType,
      quality,
    );
  });
}

/**
 * Redimensiona/comprime una imagen en el navegador antes de subirla, para
 * que quepa bajo el límite de tamaño de petición de las funciones
 * serverless de Vercel (~4.5MB, no configurable — ver README, sección
 * Assets). Se aplica SIEMPRE, no solo a los archivos grandes: el resultado
 * depende únicamente de las dimensiones originales de la imagen, así que da
 * el mismo tamaño de salida en cada subida mientras el original no cambie
 * de tamaño — importante para el mapa, donde las subidas deben coincidir
 * en dimensiones exactas para no descuadrar los pines.
 */
export async function resizeImageForUpload(
  file: File,
  { maxDimension = 3000, quality = 0.85 }: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  const img = await loadImage(file);
  const canvas = drawResized(img, maxDimension);
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  const newName = file.name.replace(/\.[^./]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
