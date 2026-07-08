import type { RequestHandler } from "express";
import {
  changePortraitSchema,
  duplicateCharacterSchema,
  importCharacterMdSchema,
  importCharacterSchema,
  reassignOwnerSchema,
} from "@dnd-manager/shared";
import * as characterService from "../services/characterService";

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
