import type { RequestHandler } from "express";
import { uploadTokenRequestSchema, confirmAssetSchema, assetKindSchema } from "@dnd-manager/shared";
import type { Asset as AssetDto } from "@dnd-manager/shared";
import { createStorageService, LocalDiskStorageService } from "../../lib/storage";
import { prisma } from "../../lib/prisma";
import type { Asset as PrismaAsset } from "../../prisma/generated/client";
import { AppError } from "../errors/AppError";

const storage = createStorageService();

function toAssetDto(asset: PrismaAsset): AssetDto {
  return {
    id: asset.id,
    url: asset.url,
    kind: asset.kind,
    mime: asset.mime,
    size: asset.size,
    originalName: asset.originalName,
    createdAt: asset.createdAt.toISOString(),
  };
}

export const getUploadTokenHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = uploadTokenRequestSchema.parse(req.body);
    const target = await storage.getUploadTarget(input);
    res.json(target);
  } catch (err) {
    next(err);
  }
};

export const localUploadHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!(storage instanceof LocalDiskStorageService)) {
      throw new AppError(400, "LOCAL_UPLOAD_DISABLED", "El storage activo no es el local de desarrollo");
    }
    const rawKey = (req.params as Record<string, string>)[0];
    if (!rawKey || !Buffer.isBuffer(req.body)) {
      throw new AppError(400, "INVALID_UPLOAD", "Cuerpo de subida vacío o clave inválida");
    }
    await storage.writeLocalUpload(decodeURIComponent(rawKey), req.body);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const confirmAssetHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = confirmAssetSchema.parse(req.body);
    const { url } = await storage.finalize(input.key);
    const asset = await prisma.asset.create({
      data: {
        ownerId: req.userId!,
        kind: input.kind,
        storageKey: input.key,
        url,
        mime: input.mime,
        size: input.size,
        originalName: input.originalName ?? null,
      },
    });
    res.status(201).json(toAssetDto(asset));
  } catch (err) {
    next(err);
  }
};

export const listAssetsHandler: RequestHandler = async (req, res, next) => {
  try {
    const kind = req.query.kind ? assetKindSchema.parse(req.query.kind) : undefined;
    const assets = await prisma.asset.findMany({
      where: { ownerId: req.userId!, ...(kind ? { kind } : {}) },
      orderBy: { createdAt: "desc" },
    });
    res.json(assets.map(toAssetDto));
  } catch (err) {
    next(err);
  }
};
