import type { RequestHandler } from "express";
import {
  changePortraitSchema,
  duplicateCharacterSchema,
  importCharacterMdSchema,
  importCharacterSchema,
  reassignOwnerSchema,
  updateHpSchema,
  updateSpellSlotSchema,
} from "@dnd-manager/shared";
import * as characterService from "../services/characterService";
import { toAssetDto } from "../services/assetUrl";
import { AppError } from "../errors/AppError";

export const importCharacterHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = importCharacterSchema.parse(req.body);
    const character = await characterService.importCharacter(
      req.params.groupId as string,
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
    const character = await characterService.importCharacterMd(req.params.id as string, input.md);
    res.json(character);
  } catch (err) {
    next(err);
  }
};

export const reassignOwnerHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = reassignOwnerSchema.parse(req.body);
    const character = await characterService.reassignOwner(req.params.id as string, input.ownerId);
    res.json(character);
  } catch (err) {
    next(err);
  }
};

export const changePortraitHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = changePortraitSchema.parse(req.body);
    const character = await characterService.changePortrait(req.params.id as string, input.assetId);
    res.json(character);
  } catch (err) {
    next(err);
  }
};

export const updateHpHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateHpSchema.parse(req.body);
    const character = await characterService.updateCurrentHp(
      req.params.id as string,
      input.currentHp,
    );
    res.json(character);
  } catch (err) {
    next(err);
  }
};

export const resetHpHandler: RequestHandler = async (req, res, next) => {
  try {
    const character = await characterService.resetCurrentHp(req.params.id as string);
    res.json(character);
  } catch (err) {
    next(err);
  }
};

export const resetGroupHpHandler: RequestHandler = async (req, res, next) => {
  try {
    const count = await characterService.resetGroupHp(req.params.groupId as string);
    res.json({ count });
  } catch (err) {
    next(err);
  }
};

export const updateSpellSlotHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = updateSpellSlotSchema.parse(req.body);
    const character = await characterService.updateSpellSlot(
      req.params.id as string,
      input.level,
      input.used,
      input.max,
    );
    res.json(character);
  } catch (err) {
    next(err);
  }
};

export const deleteCharacterHandler: RequestHandler = async (req, res, next) => {
  try {
    await characterService.deleteCharacter(req.params.id as string);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const uploadCharacterImageHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new AppError(400, "INVALID_UPLOAD", "Cuerpo de subida vacío");
    }
    const originalName = typeof req.query.name === "string" ? req.query.name : null;

    const { asset, character } = await characterService.addCharacterImage(
      req.params.id as string,
      req.userId!,
      req.body,
      originalName,
    );
    res.status(201).json({ asset: toAssetDto(asset), character });
  } catch (err) {
    next(err);
  }
};

export const listCharacterImagesHandler: RequestHandler = async (req, res, next) => {
  try {
    const images = await characterService.listCharacterImages(req.params.id as string);
    res.json(images.map(toAssetDto));
  } catch (err) {
    next(err);
  }
};

export const deleteCharacterImageHandler: RequestHandler = async (req, res, next) => {
  try {
    await characterService.deleteCharacterImage(
      req.params.id as string,
      req.params.assetId as string,
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const getCharacterViewHandler: RequestHandler = async (req, res, next) => {
  try {
    const view = await characterService.getCharacterView(req.userId!, req.params.id as string);
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
      req.params.id as string,
      input.targetGroupId,
    );
    res.status(201).json(character);
  } catch (err) {
    next(err);
  }
};
