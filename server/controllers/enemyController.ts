import type { RequestHandler } from "express";
import {
  createEnemySchema,
  importEnemyMdSchema,
  importEnemySchema,
  updateEnemySchema,
} from "@dnd-manager/shared";
import * as enemyService from "../services/enemyService";
import { toAssetDto } from "../services/assetUrl";
import { AppError } from "../errors/AppError";

function isMasterReq(req: Parameters<RequestHandler>[0]): boolean {
  return req.groupMembership?.role === "MASTER";
}

export const createQuickEnemyHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = createEnemySchema.parse(req.body);
    const enemy = await enemyService.createQuickEnemy(req.params.groupId as string, input);
    res.status(201).json(enemy);
  } catch (err) {
    next(err);
  }
};

export const importEnemyHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = importEnemySchema.parse(req.body);
    const enemy = await enemyService.importEnemy(req.params.groupId as string, input);
    res.status(201).json(enemy);
  } catch (err) {
    next(err);
  }
};

export const importEnemyMdHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = importEnemyMdSchema.parse(req.body);
    const enemy = await enemyService.importEnemyMd(req.params.enemyId as string, input.md);
    res.json(enemy);
  } catch (err) {
    next(err);
  }
};

export const updateEnemyHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateEnemySchema.parse(req.body);
    const enemy = await enemyService.updateEnemy(req.params.enemyId as string, input);
    res.json(enemy);
  } catch (err) {
    next(err);
  }
};

export const deleteEnemyHandler: RequestHandler = async (req, res, next) => {
  try {
    await enemyService.deleteEnemy(req.params.enemyId as string);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const listEnemiesHandler: RequestHandler = async (req, res, next) => {
  try {
    const enemies = await enemyService.listEnemies(req.params.groupId as string, isMasterReq(req));
    res.json(enemies);
  } catch (err) {
    next(err);
  }
};

export const getEnemyHandler: RequestHandler = async (req, res, next) => {
  try {
    const enemy = await enemyService.getEnemy(req.params.enemyId as string, isMasterReq(req));
    res.json(enemy);
  } catch (err) {
    next(err);
  }
};

export const uploadEnemyImageHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new AppError(400, "INVALID_UPLOAD", "Cuerpo de subida vacío");
    }
    const originalName = typeof req.query.name === "string" ? req.query.name : null;

    const { asset, enemy } = await enemyService.addEnemyImage(
      req.params.enemyId as string,
      req.userId!,
      req.body,
      originalName,
    );
    res.status(201).json({ asset: toAssetDto(asset), enemy });
  } catch (err) {
    next(err);
  }
};

export const listEnemyImagesHandler: RequestHandler = async (req, res, next) => {
  try {
    const images = await enemyService.listEnemyImages(req.params.enemyId as string);
    res.json(images.map(toAssetDto));
  } catch (err) {
    next(err);
  }
};

export const deleteEnemyImageHandler: RequestHandler = async (req, res, next) => {
  try {
    await enemyService.deleteEnemyImage(req.params.enemyId as string, req.params.assetId as string);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
