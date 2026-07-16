import type { RequestHandler } from "express";
import { assetKindSchema } from "@dnd-manager/shared";
import { prisma } from "../../lib/prisma";
import { convertImageToWebp } from "../../lib/imageConversion";
import { toAssetDto } from "../services/assetUrl";
import { AppError } from "../errors/AppError";

export const uploadAssetHandler: RequestHandler = async (req, res, next) => {
  try {
    const kind = assetKindSchema.parse(req.query.kind);
    const originalName = typeof req.query.name === "string" ? req.query.name : null;

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new AppError(400, "INVALID_UPLOAD", "Cuerpo de subida vacío");
    }

    const converted = await convertImageToWebp(req.body, originalName).catch(() => {
      throw new AppError(
        400,
        "INVALID_IMAGE",
        "El archivo no es una imagen soportada (JPEG, PNG, WEBP o GIF).",
      );
    });

    const asset = await prisma.asset.create({
      data: {
        ownerId: req.userId!,
        kind,
        mime: converted.mime,
        size: converted.data.length,
        // Prisma 7 tipa los campos Bytes como `Uint8Array<ArrayBuffer>`
        // estricto, no como el `Buffer` (`Uint8Array<ArrayBufferLike>`) que
        // devuelve sharp — `new Uint8Array(...)` copia a un ArrayBuffer real.
        data: new Uint8Array(converted.data),
        originalName: converted.originalName,
      },
    });

    res.status(201).json(toAssetDto(asset));
  } catch (err) {
    next(err);
  }
};

export const getAssetRawHandler: RequestHandler = async (req, res, next) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id as string } });
    if (!asset || !asset.data) {
      throw new AppError(404, "ASSET_NOT_FOUND", "Asset no encontrado");
    }
    res.setHeader("Content-Type", asset.mime);
    // Ya se valida en la subida que `mime` es un raster real (nunca html/svg
    // activo), pero esta cabecera es una segunda capa por si algún asset
    // antiguo se coló antes de ese fix.
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    // Prisma 7 devuelve los campos Bytes como Uint8Array puro (no una
    // instancia real de Buffer de Node). res.send() de Express solo trata
    // como binario lo que pasa Buffer.isBuffer(); si no, lo serializa como
    // JSON ({"0":n,"1":n,...}), rompiendo la imagen en el navegador.
    res.send(Buffer.from(asset.data));
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
