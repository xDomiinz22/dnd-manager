import type { Asset } from "../../prisma/generated/client";

/**
 * Modo Neon-only: los bytes viven en Postgres y se sirven por nuestra propia
 * ruta. Si en el futuro se activa Vercel Blob, `asset.url` tendrá la URL
 * pública real y esta función la usará en su lugar sin tocar el resto del código.
 */
export function resolveAssetUrl(asset: Pick<Asset, "id" | "url">): string {
  return asset.url ?? `/api/assets/${asset.id}/raw`;
}
