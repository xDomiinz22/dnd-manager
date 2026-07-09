import type { Asset as PrismaAsset } from "@prisma/client";
import type { Asset as AssetDto } from "@dnd-manager/shared";

/**
 * Modo Neon-only: los bytes viven en Postgres y se sirven por nuestra propia
 * ruta. Si en el futuro se activa Vercel Blob, `asset.url` tendrá la URL
 * pública real y esta función la usará en su lugar sin tocar el resto del código.
 */
export function resolveAssetUrl(asset: Pick<PrismaAsset, "id" | "url">): string {
  return asset.url ?? `/api/assets/${asset.id}/raw`;
}

/** Compartido entre assetController y characterController (subida de imágenes de personaje). */
export function toAssetDto(asset: PrismaAsset): AssetDto {
  return {
    id: asset.id,
    url: resolveAssetUrl(asset),
    kind: asset.kind,
    mime: asset.mime,
    size: asset.size,
    originalName: asset.originalName,
    createdAt: asset.createdAt.toISOString(),
  };
}
