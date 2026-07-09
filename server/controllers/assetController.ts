import type { RequestHandler } from "express";
import { assetKindSchema } from "@dnd-manager/shared";
import { prisma } from "../../lib/prisma";
import { toAssetDto } from "../services/assetUrl";
import { AppError } from "../errors/AppError";

export const uploadAssetHandler: RequestHandler = async (req, res, next) => {
  try {
    const kind = assetKindSchema.parse(req.query.kind);
    const originalName = typeof req.query.name === "string" ? req.query.name : null;
    const contentType = req.headers["content-type"];
    const mime =
      (Array.isArray(contentType) ? contentType[0] : contentType) ?? "application/octet-stream";

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new AppError(400, "INVALID_UPLOAD", "Cuerpo de subida vacío");
    }

    const asset = await prisma.asset.create({
      data: {
        ownerId: req.userId!,
        kind,
        mime,
        size: req.body.length,
        data: req.body,
        originalName,
      },
    });

    res.status(201).json(toAssetDto(asset));
  } catch (err) {
    next(err);
  }
};

export const getAssetRawHandler: RequestHandler = async (req, res, next) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset || !asset.data) {
      throw new AppError(404, "ASSET_NOT_FOUND", "Asset no encontrado");
    }
    res.setHeader("Content-Type", asset.mime);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(asset.data);
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
