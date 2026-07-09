import type { RequestHandler } from "express";
import {
  changePortraitSchema,
  duplicateCharacterSchema,
  importCharacterMdSchema,
  importCharacterSchema,
  reassignOwnerSchema,
} from "@dnd-manager/shared";
import * as characterService from "../services/characterService";
import { toAssetDto } from "../services/assetUrl";
import { AppError } from "../errors/AppError";

export const importCharacterHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = importCharacterSchema.parse(req.body);
    const character = await characterService.importCharacter(
      req.params.groupId!,
      req.userId!,
      input,
    );
    res.status(201).json(character);
  } catch (err) {
    next(err);
  }
};

export const importCharacterMdHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = importCharacterMdSchema.parse(req.body);
    const character = await characterService.importCharacterMd(req.params.id!, input.md);
    res.json(character);
  } catch (err) {
    next(err);
  }
};

export const reassignOwnerHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = reassignOwnerSchema.parse(req.body);
    const character = await characterService.reassignOwner(req.params.id!, input.ownerId);
    res.json(character);
  } catch (err) {
    next(err);
  }
};

export const changePortraitHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = changePortraitSchema.parse(req.body);
    const character = await characterService.changePortrait(req.params.id!, input.assetId);
    res.json(character);
  } catch (err) {
    next(err);
  }
};

export const uploadCharacterImageHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new AppError(400, "INVALID_UPLOAD", "Cuerpo de subida vacío");
    }
    const contentType = req.headers["content-type"];
    const mime =
      (Array.isArray(contentType) ? contentType[0] : contentType) ?? "application/octet-stream";
    const originalName = typeof req.query.name === "string" ? req.query.name : null;

    const { asset, character } = await characterService.addCharacterImage(
      req.params.id!,
      req.userId!,
      req.body,
      mime,
      originalName,
    );
    res.status(201).json({ asset: toAssetDto(asset), character });
  } catch (err) {
    next(err);
  }
};

export const listCharacterImagesHandler: RequestHandler = async (req, res, next) => {
  try {
    const images = await characterService.listCharacterImages(req.params.id!);
    res.json(images.map(toAssetDto));
  } catch (err) {
    next(err);
  }
};

export const deleteCharacterImageHandler: RequestHandler = async (req, res, next) => {
  try {
    await characterService.deleteCharacterImage(req.params.id!, req.params.assetId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const getCharacterViewHandler: RequestHandler = async (req, res, next) => {
  try {
    const view = await characterService.getCharacterView(req.userId!, req.params.id!);
    res.json(view);
  } catch (err) {
    next(err);
  }
};

export const listMyCharactersHandler: RequestHandler = async (req, res, next) => {
  try {
    const characters = await characterService.listMyCharacters(req.userId!);
    res.json(characters);
  } catch (err) {
    next(err);
  }
};

export const duplicateCharacterHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = duplicateCharacterSchema.parse(req.body);
    const character = await characterService.duplicateCharacter(
      req.userId!,
      req.params.id!,
      input.targetGroupId,
    );
    res.status(201).json(character);
  } catch (err) {
    next(err);
  }
};
